import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@lib/database/prisma.service';

export interface UpdatePlanDto {
  displayName?: string;
  description?: string;
  price?: number;
  yearlyPrice?: number;
  monthlyCredits?: number;
  maxKeywordTrackings?: number;
  isActive?: boolean;
  sortOrder?: number;
}

@Injectable()
export class AdminPlansService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 플랜 목록 조회
   */
  async findAll() {
    const plans = await this.prisma.subscriptionPlan.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: {
          select: {
            subscriptions: true,
          },
        },
      },
    });

    return plans.map((plan) => ({
      ...plan,
      subscribersCount: plan._count.subscriptions,
      _count: undefined,
    }));
  }

  /**
   * 플랜 상세 조회
   */
  async findOne(planId: number) {
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id: planId },
      include: {
        _count: {
          select: {
            subscriptions: true,
          },
        },
      },
    });

    if (!plan) {
      throw new NotFoundException('플랜을 찾을 수 없습니다.');
    }

    // 활성 구독자 수
    const activeSubscribersCount = await this.prisma.userSubscription.count({
      where: {
        planId,
        status: { in: ['ACTIVE', 'TRIAL'] },
      },
    });

    return {
      ...plan,
      subscribersCount: plan._count.subscriptions,
      activeSubscribersCount,
      _count: undefined,
    };
  }

  /**
   * 플랜 통계 조회
   */
  async getStats() {
    const [totalPlans, activePlans, inactivePlans, totalSubscribers] =
      await Promise.all([
        this.prisma.subscriptionPlan.count(),
        this.prisma.subscriptionPlan.count({ where: { isActive: true } }),
        this.prisma.subscriptionPlan.count({ where: { isActive: false } }),
        this.prisma.userSubscription.count({
          where: { status: { in: ['ACTIVE', 'TRIAL'] } },
        }),
      ]);

    return {
      totalPlans,
      activePlans,
      inactivePlans,
      totalSubscribers,
    };
  }

  /**
   * 플랜 수정 (등록/삭제 불가)
   */
  async update(planId: number, dto: UpdatePlanDto, updaterId: number) {
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      throw new NotFoundException('플랜을 찾을 수 없습니다.');
    }

    const oldValue = {
      displayName: plan.displayName,
      description: plan.description,
      price: plan.price,
      yearlyPrice: plan.yearlyPrice,
      monthlyCredits: plan.monthlyCredits,
      maxKeywordTrackings: plan.maxKeywordTrackings,
      isActive: plan.isActive,
      sortOrder: plan.sortOrder,
    };

    const updated = await this.prisma.subscriptionPlan.update({
      where: { id: planId },
      data: dto,
    });

    // 활동 로그 기록
    await this.prisma.adminActivityLog.create({
      data: {
        adminId: updaterId,
        action: 'plan.update',
        targetType: 'subscription_plan',
        targetId: planId,
        details: {
          oldValue,
          newValue: {
            displayName: updated.displayName,
            description: updated.description,
            price: updated.price,
            yearlyPrice: updated.yearlyPrice,
            monthlyCredits: updated.monthlyCredits,
            maxKeywordTrackings: updated.maxKeywordTrackings,
            isActive: updated.isActive,
            sortOrder: updated.sortOrder,
          },
        },
      },
    });

    return {
      ...updated,
      message: '플랜이 수정되었습니다.',
    };
  }
}
