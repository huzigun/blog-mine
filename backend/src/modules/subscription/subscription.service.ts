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

  /**
   * 플랜 업그레이드 가격 계산
   * - 현재 구독의 남은 기간에 대한 차액을 일할 계산
   * - 체험 플랜(TRIAL)은 전액 결제
   * - 하위 플랜으로는 변경 불가
   */
  async calculateUpgradePrice(userId: number, targetPlanId: number) {
    // 1. 대상 플랜 조회
    const targetPlan = await this.prisma.subscriptionPlan.findUnique({
      where: { id: targetPlanId },
    });

    if (!targetPlan) {
      throw new NotFoundException('구독 플랜을 찾을 수 없습니다.');
    }

    if (!targetPlan.isActive) {
      throw new BadRequestException('비활성화된 플랜입니다.');
    }

    if (targetPlan.name === 'FREE') {
      throw new BadRequestException('무료 플랜으로 변경할 수 없습니다.');
    }

    // 2. 현재 구독 조회
    const currentSubscription = await this.getCurrentSubscription(userId);

    // 구독이 없거나 TRIAL인 경우 전액 결제
    if (
      !currentSubscription ||
      currentSubscription.status === SubscriptionStatus.TRIAL
    ) {
      return {
        currentPlan: currentSubscription?.plan || null,
        targetPlan,
        isUpgrade: true,
        isNewSubscription: !currentSubscription,
        isTrial: currentSubscription?.status === SubscriptionStatus.TRIAL,
        remainingDays: null,
        totalDays: null,
        currentPlanCredit: 0,
        targetPlanPrice: targetPlan.price,
        proratedAmount: targetPlan.price, // 전액 결제
        message: currentSubscription
          ? '체험 플랜에서 업그레이드합니다.'
          : '새로운 구독을 시작합니다.',
      };
    }

    // 3. 현재 플랜 조회
    const currentPlan = currentSubscription.plan;

    // 4. 같은 플랜 선택 시 에러
    if (targetPlan.id === currentPlan.id) {
      throw new BadRequestException(
        `이미 ${currentPlan.displayName} 플랜을 구독 중입니다.`,
      );
    }

    // 5. sortOrder로 상위/하위 플랜 확인 (sortOrder가 클수록 상위 플랜)
    if (targetPlan.sortOrder <= currentPlan.sortOrder) {
      throw new BadRequestException(
        `현재 플랜(${currentPlan.displayName})보다 상위 플랜만 선택할 수 있습니다. 현재: sortOrder=${currentPlan.sortOrder}, 대상: sortOrder=${targetPlan.sortOrder}`,
      );
    }

    // 5. 남은 기간 계산
    const now = new Date();
    const expiresAt = new Date(currentSubscription.expiresAt);
    const startedAt = new Date(currentSubscription.startedAt);

    // 남은 일수 (최소 0일)
    const remainingMs = Math.max(0, expiresAt.getTime() - now.getTime());
    const remainingDays = Math.ceil(remainingMs / (1000 * 60 * 60 * 24));

    // 전체 구독 기간 (일)
    const totalMs = expiresAt.getTime() - startedAt.getTime();
    const totalDays = Math.ceil(totalMs / (1000 * 60 * 60 * 24));

    // 6. 일할 계산
    // 현재 플랜의 남은 기간 가치
    const currentPlanDailyRate = currentPlan.price / totalDays;
    const currentPlanCredit = Math.round(currentPlanDailyRate * remainingDays);

    // 대상 플랜의 월 가격
    const targetPlanPrice = targetPlan.price;

    // 차액 계산 (대상 플랜 전체 가격 - 현재 플랜 남은 가치)
    const proratedAmount = Math.max(0, targetPlanPrice - currentPlanCredit);

    return {
      currentPlan: {
        id: currentPlan.id,
        name: currentPlan.name,
        displayName: currentPlan.displayName,
        price: currentPlan.price,
        sortOrder: currentPlan.sortOrder,
      },
      targetPlan: {
        id: targetPlan.id,
        name: targetPlan.name,
        displayName: targetPlan.displayName,
        price: targetPlan.price,
        sortOrder: targetPlan.sortOrder,
        monthlyCredits: targetPlan.monthlyCredits,
      },
      isUpgrade: true,
      isNewSubscription: false,
      isTrial: false,
      remainingDays,
      totalDays,
      currentPlanCredit, // 현재 플랜 잔여 가치
      targetPlanPrice, // 대상 플랜 가격
      proratedAmount, // 실제 결제 금액
      message: `${currentPlan.displayName}에서 ${targetPlan.displayName}으로 업그레이드합니다. 남은 ${remainingDays}일에 대한 차액이 적용됩니다.`,
    };
  }

  /**
   * 업그레이드 결제 실행
   */
  async upgradeSubscription(
    userId: number,
    targetPlanId: number,
    paymentMethodId?: number,
  ) {
    // 1. 업그레이드 가격 계산
    const upgradeInfo = await this.calculateUpgradePrice(userId, targetPlanId);

    // 2. 결제 금액이 0원 이하면 결제 없이 업그레이드
    if (upgradeInfo.proratedAmount <= 0) {
      return this.executeUpgradeWithoutPayment(userId, targetPlanId);
    }

    // 3. startSubscription을 호출하되, 금액을 proratedAmount로 오버라이드
    return this.executeUpgradeWithPayment(
      userId,
      targetPlanId,
      upgradeInfo.proratedAmount,
      paymentMethodId,
    );
  }

  /**
   * 결제 없이 업그레이드 (차액이 0 이하인 경우)
   */
  private async executeUpgradeWithoutPayment(
    userId: number,
    targetPlanId: number,
  ) {
    const targetPlan = await this.prisma.subscriptionPlan.findUnique({
      where: { id: targetPlanId },
    });

    if (!targetPlan) {
      throw new NotFoundException('구독 플랜을 찾을 수 없습니다.');
    }

    const currentSubscription = await this.getCurrentSubscription(userId);

    const startedAt = new Date();
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1);

    const result = await this.prisma.$transaction(async (tx) => {
      // 기존 구독 취소
      if (currentSubscription) {
        await tx.userSubscription.update({
          where: { id: currentSubscription.id },
          data: {
            status: SubscriptionStatus.CANCELED,
            canceledAt: new Date(),
          },
        });
      }

      // 새 구독 생성
      const newSubscription = await tx.userSubscription.create({
        data: {
          userId,
          planId: targetPlanId,
          status: SubscriptionStatus.ACTIVE,
          startedAt,
          expiresAt,
          autoRenewal: true,
          lastPaymentDate: new Date(),
          lastPaymentAmount: 0,
          nextBillingDate: expiresAt,
        },
        include: { plan: true },
      });

      // 크레딧 지급
      await this.creditService.grantSubscriptionCredits(
        userId,
        targetPlan.monthlyCredits,
        newSubscription.id,
      );

      // 히스토리 기록
      await tx.subscriptionHistory.create({
        data: {
          userId,
          subscriptionId: newSubscription.id,
          action: SubscriptionAction.UPGRADED,
          oldStatus: currentSubscription?.status || null,
          newStatus: SubscriptionStatus.ACTIVE,
          planId: targetPlan.id,
          planName: targetPlan.displayName,
          planPrice: 0,
          creditsGranted: targetPlan.monthlyCredits,
          startedAt,
          expiresAt,
        },
      });

      return newSubscription;
    });

    return {
      success: true,
      message: `${targetPlan.displayName} 플랜으로 업그레이드되었습니다.`,
      subscription: result,
      payment: null,
    };
  }

  /**
   * 결제와 함께 업그레이드
   */
  private async executeUpgradeWithPayment(
    userId: number,
    targetPlanId: number,
    paymentAmount: number,
    paymentMethodId?: number,
  ) {
    const targetPlan = await this.prisma.subscriptionPlan.findUnique({
      where: { id: targetPlanId },
    });

    if (!targetPlan) {
      throw new NotFoundException('구독 플랜을 찾을 수 없습니다.');
    }

    // 카드 조회
    let card: Card | null = null;
    if (paymentMethodId) {
      card = await this.prisma.card.findFirst({
        where: { id: paymentMethodId, userId, isAuthenticated: true },
      });
    } else {
      card = await this.prisma.card.findFirst({
        where: { userId, isDefault: true, isAuthenticated: true },
      });
      if (!card) {
        card = await this.prisma.card.findFirst({
          where: { userId, isAuthenticated: true },
          orderBy: { createdAt: 'desc' },
        });
      }
    }

    if (!card || !card.billingKey) {
      throw new BadRequestException(
        '등록된 결제 수단이 없습니다. 카드를 먼저 등록해주세요.',
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true },
    });

    // 결제 실행
    const paymentResult = await this.niceBillingService.approvePayment(
      card.billingKey,
      {
        amount: paymentAmount,
        userId: String(userId),
        name: user?.name || undefined,
        email: user?.email || undefined,
        goodsName: `BloC ${targetPlan.displayName} 업그레이드`,
      },
    );

    if (!paymentResult.success) {
      throw new BadRequestException(
        paymentResult.message || '결제 처리에 실패했습니다.',
      );
    }

    const currentSubscription = await this.getCurrentSubscription(userId);
    const startedAt = new Date();
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1);

    const result = await this.prisma.$transaction(async (tx) => {
      // Payment 기록 생성
      const payment = await tx.payment.create({
        data: {
          userId,
          amount: paymentAmount,
          currency: 'KRW',
          status: PaymentStatus.COMPLETED,
          paymentMethod: 'card',
          transactionId: paymentResult.originalData?.TID || null,
          metadata: {
            planId: targetPlan.id,
            planName: targetPlan.displayName,
            isUpgrade: true,
            cardId: card.id,
            ...paymentResult.originalData,
          },
        },
      });

      // 기존 구독 취소
      if (currentSubscription) {
        await tx.userSubscription.update({
          where: { id: currentSubscription.id },
          data: {
            status: SubscriptionStatus.CANCELED,
            canceledAt: new Date(),
          },
        });
      }

      // 새 구독 생성
      const newSubscription = await tx.userSubscription.create({
        data: {
          userId,
          planId: targetPlanId,
          status: SubscriptionStatus.ACTIVE,
          startedAt,
          expiresAt,
          autoRenewal: true,
          lastPaymentDate: new Date(),
          lastPaymentAmount: paymentAmount,
          nextBillingDate: expiresAt,
        },
        include: { plan: true },
      });

      // 크레딧 지급
      await this.creditService.grantSubscriptionCredits(
        userId,
        targetPlan.monthlyCredits,
        newSubscription.id,
      );

      // 히스토리 기록
      await tx.subscriptionHistory.create({
        data: {
          userId,
          subscriptionId: newSubscription.id,
          action: SubscriptionAction.UPGRADED,
          oldStatus: currentSubscription?.status || null,
          newStatus: SubscriptionStatus.ACTIVE,
          planId: targetPlan.id,
          planName: targetPlan.displayName,
          planPrice: paymentAmount,
          creditsGranted: targetPlan.monthlyCredits,
          paymentId: payment.id,
          startedAt,
          expiresAt,
        },
      });

      return { subscription: newSubscription, payment };
    });

    this.logger.log(
      `User ${userId} upgraded to ${targetPlan.displayName} (${paymentAmount}원), Payment ID: ${result.payment.id}`,
    );

    return {
      success: true,
      message: `${targetPlan.displayName} 플랜으로 업그레이드되었습니다.`,
      subscription: result.subscription,
      payment: {
        id: result.payment.id,
        amount: result.payment.amount,
        status: result.payment.status,
      },
    };
  }
}
