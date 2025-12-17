import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@lib/database/prisma.service';
import { Prisma, SubscriptionStatus, SubscriptionAction } from '@prisma/client';

export interface AdminSubscriptionsQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'all' | SubscriptionStatus;
  planId?: number;
  sortBy?: 'createdAt' | 'expiresAt' | 'startedAt';
  sortOrder?: 'asc' | 'desc';
}

export interface UpdateSubscriptionStatusDto {
  status: SubscriptionStatus;
  reason?: string;
}

export interface ExtendSubscriptionDto {
  days: number;
  reason?: string;
}

@Injectable()
export class AdminSubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 구독 목록 조회 (관리자용)
   */
  async findAll(query: AdminSubscriptionsQuery) {
    const {
      page = 1,
      limit = 20,
      search,
      status = 'all',
      planId,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;

    // Where 조건 구성
    const where: Prisma.UserSubscriptionWhereInput = {};

    // 검색 조건 (사용자 이메일/이름)
    if (search) {
      where.user = {
        OR: [
          { email: { contains: search, mode: 'insensitive' } },
          { name: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    // 상태 필터
    if (status !== 'all') {
      where.status = status;
    }

    // 요금제 필터
    if (planId) {
      where.planId = planId;
    }

    // 정렬 조건
    const orderBy: Prisma.UserSubscriptionOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    // 전체 개수 조회
    const total = await this.prisma.userSubscription.count({ where });

    // 구독 목록 조회
    const subscriptions = await this.prisma.userSubscription.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      select: {
        id: true,
        status: true,
        startedAt: true,
        expiresAt: true,
        canceledAt: true,
        autoRenewal: true,
        lastPaymentDate: true,
        lastPaymentAmount: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        plan: {
          select: {
            id: true,
            name: true,
            displayName: true,
            price: true,
          },
        },
      },
    });

    return {
      data: subscriptions,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * 구독 상세 조회
   */
  async findOne(subscriptionId: number) {
    const subscription = await this.prisma.userSubscription.findUnique({
      where: { id: subscriptionId },
      select: {
        id: true,
        status: true,
        startedAt: true,
        expiresAt: true,
        canceledAt: true,
        autoRenewal: true,
        nextBillingDate: true,
        lastPaymentDate: true,
        lastPaymentAmount: true,
        renewalAttempts: true,
        lastRenewalAttempt: true,
        gracePeriodEndsAt: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        plan: {
          select: {
            id: true,
            name: true,
            displayName: true,
            price: true,
            monthlyCredits: true,
          },
        },
      },
    });

    if (!subscription) {
      throw new NotFoundException('구독 정보를 찾을 수 없습니다.');
    }

    return subscription;
  }

  /**
   * 구독 상태 변경
   */
  async updateStatus(
    subscriptionId: number,
    dto: UpdateSubscriptionStatusDto,
    adminId: number,
  ) {
    const subscription = await this.prisma.userSubscription.findUnique({
      where: { id: subscriptionId },
      include: { user: true, plan: true },
    });

    if (!subscription) {
      throw new NotFoundException('구독 정보를 찾을 수 없습니다.');
    }

    const oldStatus = subscription.status;

    // 상태 변경
    const updated = await this.prisma.userSubscription.update({
      where: { id: subscriptionId },
      data: {
        status: dto.status,
        // 취소 상태로 변경 시 취소일 기록
        canceledAt: dto.status === 'CANCELED' ? new Date() : subscription.canceledAt,
        // 활성화로 변경 시 취소일 초기화
        ...(dto.status === 'ACTIVE' && { canceledAt: null }),
      },
      select: {
        id: true,
        status: true,
        expiresAt: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        plan: {
          select: {
            displayName: true,
          },
        },
      },
    });

    // 구독 이력 기록
    await this.prisma.subscriptionHistory.create({
      data: {
        userId: subscription.userId,
        subscriptionId: subscription.id,
        action: this.getHistoryAction(oldStatus, dto.status),
        oldStatus,
        newStatus: dto.status,
        planId: subscription.planId,
        planName: subscription.plan.displayName || subscription.plan.name,
        planPrice: subscription.plan.price,
        reason: dto.reason || `관리자(ID: ${adminId})에 의한 상태 변경`,
      },
    });

    return updated;
  }

  /**
   * 구독 기간 연장
   */
  async extendSubscription(
    subscriptionId: number,
    dto: ExtendSubscriptionDto,
    adminId: number,
  ) {
    if (dto.days <= 0) {
      throw new BadRequestException('연장 기간은 1일 이상이어야 합니다.');
    }

    const subscription = await this.prisma.userSubscription.findUnique({
      where: { id: subscriptionId },
      include: { plan: true },
    });

    if (!subscription) {
      throw new NotFoundException('구독 정보를 찾을 수 없습니다.');
    }

    const currentExpiresAt = subscription.expiresAt;
    const newExpiresAt = new Date(currentExpiresAt);
    newExpiresAt.setDate(newExpiresAt.getDate() + dto.days);

    // 기간 연장
    const updated = await this.prisma.userSubscription.update({
      where: { id: subscriptionId },
      data: {
        expiresAt: newExpiresAt,
        // 만료된 구독을 연장하면 활성화
        status: subscription.status === 'EXPIRED' ? 'ACTIVE' : subscription.status,
      },
      select: {
        id: true,
        status: true,
        expiresAt: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        plan: {
          select: {
            displayName: true,
          },
        },
      },
    });

    // 구독 이력 기록
    await this.prisma.subscriptionHistory.create({
      data: {
        userId: subscription.userId,
        subscriptionId: subscription.id,
        action: 'RENEWED',
        oldStatus: subscription.status,
        newStatus: updated.status,
        planId: subscription.planId,
        planName: subscription.plan.displayName || subscription.plan.name,
        planPrice: 0, // 관리자 연장은 무료
        expiresAt: newExpiresAt,
        reason: dto.reason || `관리자(ID: ${adminId})에 의한 ${dto.days}일 기간 연장`,
      },
    });

    return {
      ...updated,
      previousExpiresAt: currentExpiresAt,
      extendedDays: dto.days,
    };
  }

  /**
   * 구독 통계 조회
   */
  async getStats() {
    const [
      totalSubscriptions,
      activeSubscriptions,
      trialSubscriptions,
      expiredSubscriptions,
      canceledSubscriptions,
      pastDueSubscriptions,
    ] = await Promise.all([
      this.prisma.userSubscription.count(),
      this.prisma.userSubscription.count({ where: { status: 'ACTIVE' } }),
      this.prisma.userSubscription.count({ where: { status: 'TRIAL' } }),
      this.prisma.userSubscription.count({ where: { status: 'EXPIRED' } }),
      this.prisma.userSubscription.count({ where: { status: 'CANCELED' } }),
      this.prisma.userSubscription.count({ where: { status: 'PAST_DUE' } }),
    ]);

    // 요금제별 통계
    const planStats = await this.prisma.userSubscription.groupBy({
      by: ['planId'],
      where: { status: { in: ['ACTIVE', 'TRIAL'] } },
      _count: true,
    });

    const plans = await this.prisma.subscriptionPlan.findMany({
      where: { id: { in: planStats.map((p) => p.planId) } },
      select: { id: true, displayName: true, name: true },
    });

    const planStatsWithNames = planStats.map((stat) => {
      const plan = plans.find((p) => p.id === stat.planId);
      return {
        planId: stat.planId,
        planName: plan?.displayName || plan?.name || 'Unknown',
        count: stat._count,
      };
    });

    return {
      totalSubscriptions,
      activeSubscriptions,
      trialSubscriptions,
      expiredSubscriptions,
      canceledSubscriptions,
      pastDueSubscriptions,
      planStats: planStatsWithNames,
    };
  }

  /**
   * 요금제 목록 조회
   */
  async getPlans() {
    return this.prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        displayName: true,
        price: true,
        monthlyCredits: true,
      },
      orderBy: { price: 'asc' },
    });
  }

  private getHistoryAction(
    oldStatus: SubscriptionStatus,
    newStatus: SubscriptionStatus,
  ): SubscriptionAction {
    if (newStatus === 'CANCELED') return 'CANCELLED';
    if (newStatus === 'ACTIVE' && oldStatus === 'EXPIRED') return 'REACTIVATED';
    if (newStatus === 'ACTIVE' && oldStatus === 'CANCELED') return 'REACTIVATED';
    if (newStatus === 'EXPIRED') return 'EXPIRED';
    // 그 외의 상태 변경은 RENEWED로 처리 (관리자에 의한 상태 복구 등)
    return 'RENEWED';
  }
}
