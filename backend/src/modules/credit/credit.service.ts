import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '@lib/database/prisma.service';
import {
  Card,
  CreditTransactionType,
  CreditType,
  PaymentStatus,
  Prisma,
  SubscriptionStatus,
} from '@prisma/client';
import {
  PurchaseCreditDto,
  CreditTransactionFilterDto,
  TransactionFilterDto,
} from './dto';
import { NiceBillingService } from '@lib/integrations/nicepay/nice.billing.service';
import { NotificationService } from '@modules/notification/notification.service';
import { EmailService } from '@lib/integrations/email/email.service';

@Injectable()
export class CreditService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly niceBillingService: NiceBillingService,
    @Inject(forwardRef(() => NotificationService))
    private readonly notificationService: NotificationService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * 활성 구독 검증
   * - 크레딧 사용 시 실시간으로 구독 상태 확인
   * - ACTIVE/TRIAL: 만료일이 아직 지나지 않은 경우만 유효
   * - PAST_DUE: 유예기간이므로 만료일 체크 없이 허용
   * @param userId 사용자 ID
   */
  private async validateActiveSubscription(userId: number) {
    const now = new Date();

    const subscription = await this.prisma.userSubscription.findFirst({
      where: {
        userId,
        OR: [
          // ACTIVE/TRIAL: 만료일이 아직 지나지 않은 경우
          {
            status: {
              in: [SubscriptionStatus.TRIAL, SubscriptionStatus.ACTIVE],
            },
            expiresAt: { gt: now },
          },
          // PAST_DUE: 유예기간 중이므로 포함
          {
            status: SubscriptionStatus.PAST_DUE,
          },
        ],
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!subscription) {
      throw new ForbiddenException(
        '활성 구독을 찾을 수 없습니다. 플랜을 선택해주세요.',
      );
    }
  }

  /**
   * 사용자의 크레딧 계정 조회
   * - 계정이 없으면 자동 생성 (upsert로 race condition 방지)
   */
  async getCreditAccount(userId: number) {
    // upsert를 사용하여 원자적으로 조회 또는 생성
    const account = await this.prisma.creditAccount.upsert({
      where: { userId },
      update: {}, // 이미 존재하면 아무것도 업데이트하지 않음
      create: {
        userId,
        subscriptionCredits: 0,
        purchasedCredits: 0,
        bonusCredits: 0,
        totalCredits: 0,
      },
    });

    return account;
  }

  /**
   * 크레딧 잔액 조회
   */
  async getBalance(userId: number) {
    const account = await this.getCreditAccount(userId);

    return {
      totalCredits: account.totalCredits,
      subscriptionCredits: account.subscriptionCredits,
      purchasedCredits: account.purchasedCredits,
      bonusCredits: account.bonusCredits,
      lastUsedAt: account.lastUsedAt,
    };
  }

  /**
   * 크레딧 구매
   * - 나이스페이 빌링 결제 연동
   * - 결제 성공 후 크레딧 지급
   * @param userId 사용자 ID
   * @param purchaseDto 구매 정보
   */
  async purchaseCredits(userId: number, purchaseDto: PurchaseCreditDto) {
    const { amount, paymentMethodId, metadata } = purchaseDto;

    // 1. 결제 수단(카드) 조회
    let card: Card | null = null;
    if (paymentMethodId) {
      // 특정 카드 ID로 조회
      card = await this.prisma.card.findFirst({
        where: {
          id: parseInt(paymentMethodId, 10),
          userId,
          isAuthenticated: true,
        },
      });
    } else {
      // 기본 카드 조회
      card = await this.prisma.card.findFirst({
        where: {
          userId,
          isDefault: true,
          isAuthenticated: true,
        },
      });

      // 기본 카드가 없으면 인증된 카드 중 첫 번째 카드 사용
      if (!card) {
        card = await this.prisma.card.findFirst({
          where: {
            userId,
            isAuthenticated: true,
          },
          orderBy: { createdAt: 'desc' },
        });
      }
    }

    if (!card || !card.billingKey) {
      throw new BadRequestException(
        '등록된 결제 수단이 없습니다. 카드를 먼저 등록해주세요.',
      );
    }

    // 2. 결제 금액 계산 (크레딧당 가격 - 예: 1크레딧 = 100원)
    const CREDIT_PRICE = 100; // 크레딧당 가격 (원)
    const paymentAmount = amount * CREDIT_PRICE;

    // 3. 사용자 정보 조회 (결제 요청 시 필요)
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true },
    });

    // 4. 나이스페이 결제 요청
    const paymentResult = await this.niceBillingService.approvePayment(
      card.billingKey,
      {
        amount: paymentAmount,
        userId: String(userId),
        name: user?.name || undefined,
        email: user?.email || undefined,
        goodsName: `BloC 크레딧 ${amount}개 충전`,
      },
    );

    if (!paymentResult.success) {
      throw new BadRequestException(
        paymentResult.message || '결제 처리에 실패했습니다.',
      );
    }

    const account = await this.getCreditAccount(userId);

    // 5. 트랜잭션으로 결제 기록 및 크레딧 지급 처리
    const transaction = await this.prisma.$transaction(async (tx) => {
      // 5-1. Payment 기록 생성
      const payment = await tx.payment.create({
        data: {
          userId,
          amount: paymentAmount,
          currency: 'KRW',
          status: PaymentStatus.COMPLETED,
          paymentMethod: 'card',
          transactionId: paymentResult.originalData?.TID || null,
          metadata: JSON.stringify({
            creditAmount: amount,
            cardId: card.id,
            cardNumber: card.number,
            cardCompany: card.cardCompany,
            authCode: paymentResult.originalData?.AuthCode,
            authDate: paymentResult.originalData?.AuthDate,
            ...paymentResult.originalData,
          }),
        },
      });

      // 5-2. 크레딧 거래 내역 생성
      const creditTransaction = await tx.creditTransaction.create({
        data: {
          accountId: account.id,
          userId,
          type: CreditTransactionType.PURCHASE,
          amount,
          balanceBefore: account.totalCredits,
          balanceAfter: account.totalCredits + amount,
          creditType: CreditType.PURCHASED,
          referenceType: 'payment',
          referenceId: payment.id,
          metadata: metadata || undefined,
        },
      });

      // 5-3. 크레딧 계정 잔액 업데이트
      const updatedAccount = await tx.creditAccount.update({
        where: { userId },
        data: {
          purchasedCredits: { increment: amount },
          totalCredits: { increment: amount },
        },
      });

      return {
        payment,
        transaction: creditTransaction,
        account: updatedAccount,
      };
    });

    // 크레딧 충전 완료 알림
    await this.notificationService.sendCreditCharged(userId, amount);

    // 크레딧 충전 완료 이메일 발송 (비동기, 실패해도 충전에 영향 없음)
    this.emailService.sendCreditPurchaseReceipt({
      email: user?.email || '',
      userName: user?.name || '고객',
      receiptNumber:
        transaction.payment.transactionId || String(transaction.payment.id),
      creditAmount: amount,
      paymentAmount,
      paymentMethod: `${card.cardCompany || '카드'} **** ${card.number?.slice(-4) || '****'}`,
      paymentDate: new Date(),
      totalCredits: transaction.account.totalCredits,
    });

    return {
      success: true,
      message: `${amount} 크레딧이 충전되었습니다.`,
      balance: transaction.account.totalCredits,
      transaction: transaction.transaction,
      payment: {
        id: transaction.payment.id,
        amount: transaction.payment.amount,
        status: transaction.payment.status,
      },
    };
  }

  /**
   * 크레딧 사용
   * - 우선순위: bonusCredits → subscriptionCredits → purchasedCredits
   * - 구독 상태 실시간 검증 (만료 시 차단)
   * @param userId 사용자 ID
   * @param amount 사용할 크레딧 수량
   * @param referenceType 참조 엔티티 타입 (예: 'blog_post', 'api_call')
   * @param referenceId 참조 엔티티 ID
   * @param metadata 추가 메타데이터
   */
  async useCredits(
    userId: number,
    amount: number,
    referenceType?: string,
    referenceId?: number,
    metadata?: string,
  ) {
    if (amount <= 0) {
      throw new BadRequestException('사용할 크레딧은 0보다 커야 합니다.');
    }

    // 크레딧 사용 시 구독 상태 실시간 검증
    await this.validateActiveSubscription(userId);

    const account = await this.getCreditAccount(userId);

    // 잔액 확인
    if (account.totalCredits < amount) {
      throw new BadRequestException(
        `크레딧이 부족합니다. (필요: ${amount}, 보유: ${account.totalCredits})`,
      );
    }

    // 차감할 크레딧 계산 (우선순위에 따라)
    let remaining = amount;
    const updates: Prisma.CreditAccountUpdateInput = {
      totalCredits: { decrement: amount },
    };

    // 최종 사용된 크레딧 타입 결정 (기본값 설정)
    let usedCreditType: CreditType =
      account.bonusCredits > 0
        ? CreditType.BONUS
        : account.subscriptionCredits > 0
          ? CreditType.SUBSCRIPTION
          : CreditType.PURCHASED;

    if (account.bonusCredits >= remaining) {
      // Case 1: 보너스 크레딧만으로 충분
      updates.bonusCredits = { decrement: remaining };
      usedCreditType = CreditType.BONUS;
      remaining = 0;
    } else if (account.bonusCredits > 0) {
      // Case 2: 보너스 크레딧 일부 사용
      updates.bonusCredits = { decrement: account.bonusCredits };
      remaining -= account.bonusCredits;
    }

    if (remaining > 0) {
      if (account.subscriptionCredits >= remaining) {
        // Case 3: 구독 크레딧으로 충분
        updates.subscriptionCredits = { decrement: remaining };
        usedCreditType =
          usedCreditType === CreditType.BONUS
            ? usedCreditType
            : CreditType.SUBSCRIPTION;
        remaining = 0;
      } else if (account.subscriptionCredits > 0) {
        // Case 4: 구독 크레딧 일부 사용
        updates.subscriptionCredits = {
          decrement: account.subscriptionCredits,
        };
        remaining -= account.subscriptionCredits;
      }
    }

    if (remaining > 0) {
      // Case 5: 구매 크레딧 사용
      updates.purchasedCredits = { decrement: remaining };
      usedCreditType = CreditType.PURCHASED;
    }

    // 트랜잭션으로 크레딧 차감 처리
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. 거래 내역 생성
      const creditTransaction = await tx.creditTransaction.create({
        data: {
          accountId: account.id,
          userId,
          type: CreditTransactionType.USAGE,
          amount: -amount,
          balanceBefore: account.totalCredits,
          balanceAfter: account.totalCredits - amount,
          creditType: usedCreditType,
          referenceType,
          referenceId,
          metadata,
        },
      });

      // 2. 계정 잔액 업데이트
      const updatedAccount = await tx.creditAccount.update({
        where: { userId },
        data: {
          ...updates,
          lastUsedAt: new Date(),
        },
      });

      return { transaction: creditTransaction, account: updatedAccount };
    });

    // 한도 초과 임박/초과 알림 체크
    const remainingBalance = result.account.totalCredits;
    await this.checkAndNotifyLowBalance(userId, remainingBalance);

    return {
      success: true,
      usedAmount: amount,
      remainingBalance,
      transaction: result.transaction,
    };
  }

  /**
   * 잔액 부족 알림 체크 및 발송
   */
  private async checkAndNotifyLowBalance(
    userId: number,
    remainingBalance: number,
  ) {
    // 구독 정보를 조회하여 월간 크레딧 기준으로 퍼센티지 계산
    const subscription = await this.prisma.userSubscription.findFirst({
      where: {
        userId,
        status: {
          in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL],
        },
      },
      include: { plan: true },
    });

    if (!subscription?.plan) return;

    const monthlyCredits = subscription.plan.monthlyCredits;
    if (monthlyCredits <= 0) return;

    const usagePercent = Math.round(
      ((monthlyCredits - remainingBalance) / monthlyCredits) * 100,
    );

    // 한도 초과 (100% 이상 사용)
    if (remainingBalance <= 0) {
      await this.notificationService.sendUsageLimitExceeded(userId);
    }
    // 한도 초과 임박 (90% 이상 사용)
    else if (usagePercent >= 90) {
      await this.notificationService.sendUsageLimitWarning(
        userId,
        usagePercent,
      );
    }
    // 크레딧 부족 경고 (80% 이상 사용)
    else if (usagePercent >= 80) {
      await this.notificationService.sendCreditLow(userId, remainingBalance);
    }
  }

  /**
   * 구독 크레딧 지급
   * - 구독 갱신 시 호출
   * @param userId 사용자 ID
   * @param amount 지급할 크레딧 수량
   * @param subscriptionId 구독 ID
   */
  async grantSubscriptionCredits(
    userId: number,
    amount: number,
    subscriptionId: number,
  ) {
    if (amount <= 0) {
      throw new BadRequestException('지급할 크레딧은 0보다 커야 합니다.');
    }

    const account = await this.getCreditAccount(userId);

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. 거래 내역 생성
      const creditTransaction = await tx.creditTransaction.create({
        data: {
          accountId: account.id,
          userId,
          type: CreditTransactionType.SUBSCRIPTION_GRANT,
          amount,
          balanceBefore: account.totalCredits,
          balanceAfter: account.totalCredits + amount,
          creditType: CreditType.SUBSCRIPTION,
          referenceType: 'subscription',
          referenceId: subscriptionId,
        },
      });

      // 2. 계정 잔액 업데이트
      const updatedAccount = await tx.creditAccount.update({
        where: { userId },
        data: {
          subscriptionCredits: { increment: amount },
          totalCredits: { increment: amount },
        },
      });

      return { transaction: creditTransaction, account: updatedAccount };
    });

    return {
      success: true,
      grantedAmount: amount,
      balance: result.account.totalCredits,
      transaction: result.transaction,
    };
  }

  /**
   * 보너스 크레딧 지급
   * @param userId 사용자 ID
   * @param amount 지급할 크레딧 수량
   * @param reason 지급 사유
   * @param expiresAt 만료일 (선택)
   */
  async grantBonusCredits(
    userId: number,
    amount: number,
    reason: string,
    expiresAt?: Date,
  ) {
    if (amount <= 0) {
      throw new BadRequestException('지급할 크레딧은 0보다 커야 합니다.');
    }

    const account = await this.getCreditAccount(userId);

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. 거래 내역 생성
      const creditTransaction = await tx.creditTransaction.create({
        data: {
          accountId: account.id,
          userId,
          type: CreditTransactionType.BONUS,
          amount,
          balanceBefore: account.totalCredits,
          balanceAfter: account.totalCredits + amount,
          creditType: CreditType.BONUS,
          metadata: reason,
          expiresAt,
        },
      });

      // 2. 계정 잔액 업데이트
      const updatedAccount = await tx.creditAccount.update({
        where: { userId },
        data: {
          bonusCredits: { increment: amount },
          totalCredits: { increment: amount },
        },
      });

      return { transaction: creditTransaction, account: updatedAccount };
    });

    return {
      success: true,
      grantedAmount: amount,
      balance: result.account.totalCredits,
      transaction: result.transaction,
    };
  }

  /**
   * 특정 거래 내역 조회
   */
  async getTransaction(userId: number, transactionId: number) {
    const account = await this.getCreditAccount(userId);

    const transaction = await this.prisma.creditTransaction.findFirst({
      where: {
        id: transactionId,
        accountId: account.id,
        userId,
      },
    });

    if (!transaction) {
      throw new NotFoundException('거래 내역을 찾을 수 없습니다.');
    }

    return transaction;
  }

  /**
   * 크레딧 환불
   * @param userId 사용자 ID
   * @param transactionId 원본 거래 ID
   * @param reason 환불 사유
   */
  async refundCredits(userId: number, transactionId: number, reason: string) {
    const account = await this.getCreditAccount(userId);

    // 원본 거래 조회
    const originalTransaction = await this.prisma.creditTransaction.findFirst({
      where: {
        id: transactionId,
        accountId: account.id,
        userId,
        type: CreditTransactionType.USAGE,
      },
    });

    if (!originalTransaction) {
      throw new NotFoundException('환불 가능한 거래 내역을 찾을 수 없습니다.');
    }

    // 이미 환불된 거래인지 확인
    const existingRefund = await this.prisma.creditTransaction.findFirst({
      where: {
        referenceType: 'transaction',
        referenceId: transactionId,
        type: CreditTransactionType.REFUND,
      },
    });

    if (existingRefund) {
      throw new BadRequestException('이미 환불된 거래입니다.');
    }

    const refundAmount = Math.abs(originalTransaction.amount);

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. 환불 거래 내역 생성
      const refundTransaction = await tx.creditTransaction.create({
        data: {
          accountId: account.id,
          userId,
          type: CreditTransactionType.REFUND,
          amount: refundAmount,
          balanceBefore: account.totalCredits,
          balanceAfter: account.totalCredits + refundAmount,
          creditType: originalTransaction.creditType,
          referenceType: 'transaction',
          referenceId: transactionId,
          metadata: reason,
        },
      });

      // 2. 계정 잔액 복구
      const creditTypeField =
        originalTransaction.creditType === CreditType.BONUS
          ? 'bonusCredits'
          : originalTransaction.creditType === CreditType.SUBSCRIPTION
            ? 'subscriptionCredits'
            : 'purchasedCredits';

      const updatedAccount = await tx.creditAccount.update({
        where: { userId },
        data: {
          [creditTypeField]: { increment: refundAmount },
          totalCredits: { increment: refundAmount },
        },
      });

      return { transaction: refundTransaction, account: updatedAccount };
    });

    return {
      success: true,
      refundedAmount: refundAmount,
      balance: result.account.totalCredits,
      transaction: result.transaction,
    };
  }

  /**
   * 크레딧 거래 내역 조회 (페이지네이션)
   * @param userId 사용자 ID
   * @param filter 필터 조건
   */
  async getTransactions(userId: number, filter: TransactionFilterDto) {
    const { page = 1, limit = 10, type, startDate, endDate } = filter;

    const where: Prisma.CreditTransactionWhereInput = { userId };

    if (type) where.type = type;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const total = await this.prisma.creditTransaction.count({ where });
    const data = await this.prisma.creditTransaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        account: {
          select: {
            userId: true,
          },
        },
      },
    });

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }
}
