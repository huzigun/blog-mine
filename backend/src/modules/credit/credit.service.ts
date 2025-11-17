import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '@lib/database/prisma.service';
import {
  CreditTransactionType,
  CreditType,
  Prisma,
  SubscriptionStatus,
} from '@prisma/client';
import { PurchaseCreditDto, CreditTransactionFilterDto } from './dto';

@Injectable()
export class CreditService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 활성 구독 검증
   * - 크레딧 사용 시 실시간으로 구독 상태 확인
   * @param userId 사용자 ID
   */
  private async validateActiveSubscription(userId: number) {
    const subscription = await this.prisma.userSubscription.findFirst({
      where: {
        userId,
        status: {
          in: [
            SubscriptionStatus.TRIAL,
            SubscriptionStatus.ACTIVE,
            SubscriptionStatus.PAST_DUE,
          ],
        },
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

    // 만료 날짜 실시간 체크
    if (new Date() > subscription.expiresAt) {
      throw new ForbiddenException(
        '구독이 만료되었습니다. 구독을 갱신해주세요.',
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
   * TODO: 실제 결제 연동 구현 필요
   * - Payment 모듈과 연동하여 결제 처리
   * - 결제 성공 후 크레딧 지급
   */
  async purchaseCredits(userId: number, purchaseDto: PurchaseCreditDto) {
    const { amount, paymentMethodId, metadata } = purchaseDto;

    // TODO: 결제 처리 로직 구현
    // 1. Payment 모듈을 통해 결제 요청
    // 2. 결제 승인 대기
    // 3. 결제 성공 시 아래 로직 실행
    // 4. 결제 실패 시 예외 발생

    // 임시: 결제 ID를 null로 설정 (실제 구현 시 결제 결과에서 가져옴)
    const paymentId = null;

    const account = await this.getCreditAccount(userId);

    // 트랜잭션으로 크레딧 지급 처리
    const transaction = await this.prisma.$transaction(async (tx) => {
      // 1. 거래 내역 생성
      const creditTransaction = await tx.creditTransaction.create({
        data: {
          accountId: account.id,
          userId,
          type: CreditTransactionType.PURCHASE,
          amount,
          balanceBefore: account.totalCredits,
          balanceAfter: account.totalCredits + amount,
          creditType: CreditType.PURCHASED,
          referenceType: paymentId ? 'payment' : undefined,
          referenceId: paymentId,
          metadata: metadata || undefined,
        },
      });

      // 2. 계정 잔액 업데이트
      const updatedAccount = await tx.creditAccount.update({
        where: { userId },
        data: {
          purchasedCredits: { increment: amount },
          totalCredits: { increment: amount },
        },
      });

      return { transaction: creditTransaction, account: updatedAccount };
    });

    return {
      success: true,
      message: `${amount} 크레딧이 충전되었습니다.`,
      balance: transaction.account.totalCredits,
      transaction: transaction.transaction,
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

    return {
      success: true,
      usedAmount: amount,
      remainingBalance: result.account.totalCredits,
      transaction: result.transaction,
    };
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
   * 크레딧 거래 내역 조회
   */
  async getTransactions(userId: number, filter: CreditTransactionFilterDto) {
    const {
      type,
      creditType,
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = filter;

    const account = await this.getCreditAccount(userId);

    // 필터 조건 구성
    const where: Prisma.CreditTransactionWhereInput = {
      accountId: account.id,
      userId,
    };

    if (type) {
      where.type = type;
    }

    if (creditType) {
      where.creditType = creditType;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    // 전체 개수 조회
    const total = await this.prisma.creditTransaction.count({ where });

    // 페이징 처리된 거래 내역 조회
    const transactions = await this.prisma.creditTransaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
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
}
