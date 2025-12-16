import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@lib/database/prisma.service';
import { CreditService } from '@modules/credit/credit.service';
import { NiceBillingService } from '@lib/integrations/nicepay/nice.billing.service';
import {
  Card,
  SubscriptionStatus,
  SubscriptionAction,
  PaymentStatus,
} from '@prisma/client';
import { StartSubscriptionDto, CancelSubscriptionDto } from './dto';

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly creditService: CreditService,
    private readonly niceBillingService: NiceBillingService,
  ) {}

  /**
   * 사용자의 현재 활성 구독 조회
   */
  async getCurrentSubscription(userId: number) {
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
      include: {
        plan: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return subscription;
  }

  /**
   * 구독 시작 또는 업그레이드
   * - TRIAL → ACTIVE (유료 플랜 시작)
   * - ACTIVE → ACTIVE (플랜 변경)
   * - EXPIRED → ACTIVE (재구독)
   */
  async startSubscription(userId: number, dto: StartSubscriptionDto) {
    const { planId, paymentMethodId, autoRenewal = true } = dto;

    // 1. 플랜 조회
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      throw new NotFoundException('구독 플랜을 찾을 수 없습니다.');
    }

    if (!plan.isActive) {
      throw new BadRequestException('비활성화된 플랜입니다.');
    }

    // 2. 현재 구독 조회
    const currentSubscription = await this.getCurrentSubscription(userId);

    // 3. FREE 플랜은 구독 시작 불가 (회원가입 시에만)
    if (plan.name === 'FREE') {
      throw new BadRequestException(
        'FREE 플랜은 회원가입 시에만 자동으로 할당됩니다.',
      );
    }

    // 4. 결제 수단(카드) 조회
    let card: Card | null = null;
    if (paymentMethodId) {
      // 특정 카드 ID로 조회
      card = await this.prisma.card.findFirst({
        where: {
          id: paymentMethodId,
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

    // 5. 결제 금액 확인
    const paymentAmount = plan.price || 0;
    if (paymentAmount <= 0) {
      throw new BadRequestException('유효하지 않은 플랜 가격입니다.');
    }

    // 6. 사용자 정보 조회 (결제 요청 시 필요)
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true },
    });

    // 7. 나이스페이 결제 요청
    const paymentResult = await this.niceBillingService.approvePayment(
      card.billingKey,
      {
        amount: paymentAmount,
        userId: String(userId),
        name: user?.name || undefined,
        email: user?.email || undefined,
        goodsName: `BloC ${plan.displayName} 구독`,
      },
    );

    if (!paymentResult.success) {
      throw new BadRequestException(
        paymentResult.message || '결제 처리에 실패했습니다.',
      );
    }

    // 8. 구독 시작 날짜 및 만료일 계산
    const startedAt = new Date();
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1); // 1개월 후

    const result = await this.prisma.$transaction(async (tx) => {
      let action: SubscriptionAction;
      let oldStatus: SubscriptionStatus | null = null;

      // 8-1. Payment 기록 생성
      const payment = await tx.payment.create({
        data: {
          userId,
          amount: paymentAmount,
          currency: 'KRW',
          status: PaymentStatus.COMPLETED,
          paymentMethod: 'card',
          transactionId: paymentResult.originalData?.TID || null,
          metadata: {
            planId: plan.id,
            planName: plan.displayName,
            cardId: card.id,
            cardNumber: card.number,
            cardCompany: card.cardCompany,
            authCode: paymentResult.originalData?.AuthCode,
            authDate: paymentResult.originalData?.AuthDate,
            ...paymentResult.originalData,
          },
        },
      });

      // 8-2. 기존 구독이 있으면 취소 처리
      if (currentSubscription) {
        oldStatus = currentSubscription.status;

        // 기존 구독을 CANCELED로 변경
        await tx.userSubscription.update({
          where: { id: currentSubscription.id },
          data: {
            status: SubscriptionStatus.CANCELED,
            canceledAt: new Date(),
          },
        });

        // 플랜 변경인지 판단
        if (currentSubscription.planId === planId) {
          action = SubscriptionAction.RENEWED;
        } else if ((plan.price || 0) > (currentSubscription.plan.price || 0)) {
          action = SubscriptionAction.UPGRADED;
        } else {
          action = SubscriptionAction.DOWNGRADED;
        }
      } else {
        action = SubscriptionAction.CREATED;
      }

      // 8-3. 새 구독 생성
      const newSubscription = await tx.userSubscription.create({
        data: {
          userId,
          planId,
          status: SubscriptionStatus.ACTIVE,
          startedAt,
          expiresAt,
          autoRenewal,
          lastPaymentDate: new Date(),
          lastPaymentAmount: plan.price,
          nextBillingDate: expiresAt,
        },
        include: {
          plan: true,
        },
      });

      // 8-4. 크레딧 지급
      await this.creditService.grantSubscriptionCredits(
        userId,
        plan.monthlyCredits,
        newSubscription.id,
      );

      // 8-5. 구독 히스토리 생성
      await tx.subscriptionHistory.create({
        data: {
          userId,
          subscriptionId: newSubscription.id,
          action,
          oldStatus,
          newStatus: SubscriptionStatus.ACTIVE,
          planId: plan.id,
          planName: plan.displayName,
          planPrice: plan.price,
          creditsGranted: plan.monthlyCredits,
          paymentId: payment.id,
          startedAt,
          expiresAt,
        },
      });

      return { subscription: newSubscription, payment };
    });

    this.logger.log(
      `User ${userId} subscribed to ${plan.displayName} (${plan.price}원/월), Payment ID: ${result.payment.id}`,
    );

    return {
      success: true,
      message: `${plan.displayName} 플랜 구독이 시작되었습니다.`,
      subscription: result.subscription,
      payment: {
        id: result.payment.id,
        amount: result.payment.amount,
        status: result.payment.status,
      },
    };
  }

  /**
   * 구독 취소 예약
   * - 즉시 취소가 아닌, 현재 기간 종료 시 자동 갱신 중지
   * - 상태는 ACTIVE 유지, autoRenewal만 false로 설정
   * - expiresAt까지 서비스 정상 이용 가능
   */
  async cancelSubscription(userId: number, dto: CancelSubscriptionDto) {
    const { reason } = dto;

    const currentSubscription = await this.getCurrentSubscription(userId);

    if (!currentSubscription) {
      throw new NotFoundException('활성 구독을 찾을 수 없습니다.');
    }

    // 이미 취소 예약된 경우 (autoRenewal이 false)
    if (!currentSubscription.autoRenewal && currentSubscription.canceledAt) {
      throw new BadRequestException(
        `이미 취소 예약된 구독입니다. ${currentSubscription.expiresAt.toLocaleDateString()}까지 이용 가능합니다.`,
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. 자동 갱신 중지 (상태는 ACTIVE 유지)
      const updatedSubscription = await tx.userSubscription.update({
        where: { id: currentSubscription.id },
        data: {
          canceledAt: new Date(), // 취소 예약 시점 기록
          autoRenewal: false, // 자동 갱신 중지
          // status는 변경하지 않음! (ACTIVE, TRIAL 등 유지)
        },
        include: {
          plan: true,
        },
      });

      // 2. 구독 히스토리 생성
      await tx.subscriptionHistory.create({
        data: {
          userId,
          subscriptionId: currentSubscription.id,
          action: SubscriptionAction.CANCELLED,
          oldStatus: currentSubscription.status,
          newStatus: currentSubscription.status, // 상태 변경 없음
          planId: currentSubscription.planId,
          planName: currentSubscription.plan.displayName,
          planPrice: currentSubscription.plan.price,
          creditsGranted: 0,
          startedAt: currentSubscription.startedAt,
          expiresAt: currentSubscription.expiresAt,
          metadata: reason ? JSON.stringify({ reason }) : undefined,
        },
      });

      return updatedSubscription;
    });

    this.logger.log(
      `User ${userId} scheduled cancellation for subscription (ID: ${currentSubscription.id}), expires at ${result.expiresAt.toISOString()}`,
    );

    return {
      success: true,
      message: `구독 취소가 예약되었습니다. ${result.expiresAt.toLocaleDateString()}까지 계속 이용하실 수 있으며, 이후 자동 갱신되지 않습니다.`,
      subscription: result,
      expiresAt: result.expiresAt,
    };
  }

  /**
   * 구독 재활성화
   * - 취소 예약된 구독(autoRenewal: false)을 다시 활성화
   */
  async reactivateSubscription(userId: number) {
    // 취소 예약된 구독 조회 (autoRenewal: false && canceledAt 존재)
    const subscription = await this.prisma.userSubscription.findFirst({
      where: {
        userId,
        status: {
          in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL],
        },
        autoRenewal: false,
        canceledAt: { not: null },
      },
      include: {
        plan: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!subscription) {
      throw new NotFoundException('취소 예약된 구독을 찾을 수 없습니다.');
    }

    // 만료일이 지났으면 재활성화 불가
    if (new Date() > subscription.expiresAt) {
      throw new BadRequestException(
        '만료된 구독은 재활성화할 수 없습니다. 새로운 구독을 시작해주세요.',
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. 자동 갱신 재활성화 (상태는 그대로 유지)
      const reactivated = await tx.userSubscription.update({
        where: { id: subscription.id },
        data: {
          canceledAt: null,
          autoRenewal: true,
        },
        include: {
          plan: true,
        },
      });

      // 2. 구독 히스토리 생성
      await tx.subscriptionHistory.create({
        data: {
          userId,
          subscriptionId: subscription.id,
          action: SubscriptionAction.REACTIVATED,
          oldStatus: subscription.status,
          newStatus: subscription.status, // 상태 변경 없음
          planId: subscription.planId,
          planName: subscription.plan.displayName,
          planPrice: subscription.plan.price,
          creditsGranted: 0,
          startedAt: subscription.startedAt,
          expiresAt: subscription.expiresAt,
        },
      });

      return reactivated;
    });

    this.logger.log(
      `User ${userId} reactivated subscription (ID: ${subscription.id})`,
    );

    return {
      success: true,
      message: '구독이 재활성화되었습니다. 자동 갱신이 다시 시작됩니다.',
      subscription: result,
    };
  }

  /**
   * 사용자의 구독 내역 조회
   */
  async getSubscriptionHistory(userId: number, limit: number = 10) {
    const history = await this.prisma.subscriptionHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return history;
  }

  /**
   * 사용 가능한 플랜 목록 조회
   */
  async getAvailablePlans() {
    const plans = await this.prisma.subscriptionPlan.findMany({
      where: {
        isActive: true,
        name: { not: 'FREE' }, // FREE 플랜 제외
      },
      orderBy: {
        sortOrder: 'asc',
      },
    });

    return plans;
  }

  /**
   * 특정 플랜 조회 (ID로 조회)
   */
  async getPlanById(planId: number) {
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      throw new NotFoundException('구독 플랜을 찾을 수 없습니다.');
    }

    if (!plan.isActive) {
      throw new NotFoundException('비활성화된 플랜입니다.');
    }

    return plan;
  }
}
