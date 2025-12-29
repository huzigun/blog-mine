import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@lib/database/prisma.service';
import {
  Prisma,
  SubscriptionStatus,
  CreditTransactionType,
  CreditType,
  SubscriptionAction,
} from '@prisma/client';
import { SubscriptionService } from '@modules/subscription/subscription.service';

export interface AdminUsersQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'all' | 'active' | 'inactive';
  subscription?: 'all' | 'TRIAL' | 'ACTIVE' | 'EXPIRED' | 'CANCELED' | 'NONE';
  sortBy?: 'createdAt' | 'email' | 'name';
  sortOrder?: 'asc' | 'desc';
}

export interface AdjustCreditDto {
  amount: number; // 양수: 추가, 음수: 차감
  creditType: 'SUBSCRIPTION' | 'PURCHASED' | 'BONUS';
  reason: string;
}

export interface ChangeSubscriptionPlanDto {
  planId: number;
  reason: string;
  grantCredits?: boolean; // 새 플랜의 크레딧 지급 여부 (기본: false)
}

@Injectable()
export class AdminUsersService {
  private readonly logger = new Logger(AdminUsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  /**
   * 사용자 목록 조회 (관리자용)
   * - 현재 활성 구독을 우선적으로 표시 (만료일이 지나지 않은 ACTIVE/TRIAL 또는 PAST_DUE)
   */
  async findAll(query: AdminUsersQuery) {
    const {
      page = 1,
      limit = 20,
      search,
      status = 'all',
      subscription = 'all',
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;
    const now = new Date();

    // Where 조건 구성
    const where: Prisma.UserWhereInput = {};

    // 검색 조건
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }

    // 활성 상태 필터
    if (status === 'active') {
      where.deletedAt = null;
    } else if (status === 'inactive') {
      where.deletedAt = { not: null };
    }

    // 구독 상태 필터 - 현재 활성 구독 기준으로 필터링
    if (subscription !== 'all') {
      if (subscription === 'NONE') {
        where.subscriptions = {
          none: {},
        };
      } else if (subscription === 'ACTIVE' || subscription === 'TRIAL') {
        // ACTIVE/TRIAL은 만료일이 지나지 않은 것만
        where.subscriptions = {
          some: {
            status: subscription as SubscriptionStatus,
            expiresAt: { gt: now },
          },
        };
      } else {
        // EXPIRED, CANCELED 등
        where.subscriptions = {
          some: {
            status: subscription as SubscriptionStatus,
          },
        };
      }
    }

    // 정렬 조건
    const orderBy: Prisma.UserOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    // 전체 개수 조회
    const total = await this.prisma.user.count({ where });

    // 사용자 목록 조회
    const users = await this.prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        deletedAt: true,
        creditAccount: {
          select: {
            totalCredits: true,
          },
        },
        _count: {
          select: {
            blogPosts: true,
            personas: true,
          },
        },
      },
    });

    // 각 사용자의 현재 활성 구독 조회
    const data = await Promise.all(
      users.map(async (user) => {
        const activeSubscription =
          await this.subscriptionService.getCurrentSubscription(user.id);

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          createdAt: user.createdAt,
          deletedAt: user.deletedAt,
          isActive: !user.deletedAt,
          subscription: activeSubscription
            ? {
                id: activeSubscription.id,
                status: activeSubscription.status,
                planName:
                  activeSubscription.plan?.displayName ||
                  activeSubscription.plan?.name,
                startedAt: activeSubscription.startedAt,
                expiresAt: activeSubscription.expiresAt,
                canceledAt: activeSubscription.canceledAt,
              }
            : null,
          credits: user.creditAccount?.totalCredits || 0,
          stats: {
            blogPosts: user._count.blogPosts,
            personas: user._count.personas,
          },
        };
      }),
    );

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * 사용자 상세 조회 (관리자용)
   * - 현재 활성 구독을 우선적으로 표시 (만료일이 지나지 않은 ACTIVE/TRIAL 또는 PAST_DUE)
   */
  async findOne(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
        kakaoId: true,
        kakaoNickname: true,
        kakaoProfileImage: true,
        kakaoConnectedAt: true,
        creditAccount: {
          select: {
            id: true,
            subscriptionCredits: true,
            purchasedCredits: true,
            bonusCredits: true,
            totalCredits: true,
          },
        },
        _count: {
          select: {
            blogPosts: true,
            personas: true,
            payments: true,
            cards: true,
          },
        },
      },
    });

    if (!user) {
      return null;
    }

    // 현재 활성 구독 조회 (SubscriptionService 사용)
    const activeSubscription =
      await this.subscriptionService.getCurrentSubscription(userId);

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      deletedAt: user.deletedAt,
      kakaoId: user.kakaoId,
      kakaoNickname: user.kakaoNickname,
      kakaoProfileImage: user.kakaoProfileImage,
      kakaoConnectedAt: user.kakaoConnectedAt,
      isActive: !user.deletedAt,
      subscription: activeSubscription,
      creditAccount: user.creditAccount,
      stats: {
        blogPosts: user._count.blogPosts,
        personas: user._count.personas,
        payments: user._count.payments,
        cards: user._count.cards,
      },
    };
  }

  /**
   * 사용자 통계 조회
   */
  async getStats() {
    const [
      totalUsers,
      activeUsers,
      todaySignups,
      activeSubscriptions,
      trialSubscriptions,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
      this.prisma.userSubscription.count({
        where: { status: 'ACTIVE' },
      }),
      this.prisma.userSubscription.count({
        where: { status: 'TRIAL' },
      }),
    ]);

    return {
      totalUsers,
      activeUsers,
      inactiveUsers: totalUsers - activeUsers,
      todaySignups,
      activeSubscriptions,
      trialSubscriptions,
    };
  }

  /**
   * 사용자 크레딧 조정 (관리자용)
   */
  async adjustCredits(userId: number, dto: AdjustCreditDto, adminId: number) {
    const { amount, creditType, reason } = dto;

    if (amount === 0) {
      throw new BadRequestException('조정 금액은 0이 될 수 없습니다.');
    }

    if (!reason || reason.trim().length === 0) {
      throw new BadRequestException('조정 사유를 입력해주세요.');
    }

    // 사용자 확인
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    // 크레딧 계정 조회 (없으면 생성)
    const account = await this.prisma.creditAccount.upsert({
      where: { userId },
      create: {
        userId,
        subscriptionCredits: 0,
        purchasedCredits: 0,
        bonusCredits: 0,
        totalCredits: 0,
      },
      update: {},
    });

    // 차감 시 잔액 확인
    if (amount < 0) {
      const fieldName =
        creditType === 'SUBSCRIPTION'
          ? 'subscriptionCredits'
          : creditType === 'PURCHASED'
            ? 'purchasedCredits'
            : 'bonusCredits';

      if (account[fieldName] + amount < 0) {
        throw new BadRequestException(
          `해당 크레딧 타입의 잔액이 부족합니다. (현재: ${account[fieldName]}, 차감: ${Math.abs(amount)})`,
        );
      }
    }

    // 크레딧 업데이트 필드 구성
    const updateField =
      creditType === 'SUBSCRIPTION'
        ? 'subscriptionCredits'
        : creditType === 'PURCHASED'
          ? 'purchasedCredits'
          : 'bonusCredits';

    // 트랜잭션으로 크레딧 조정
    const result = await this.prisma.$transaction(async (tx) => {
      // 크레딧 계정 업데이트
      const updatedAccount = await tx.creditAccount.update({
        where: { userId },
        data: {
          [updateField]: { increment: amount },
          totalCredits: { increment: amount },
        },
      });

      // 트랜잭션 기록
      await tx.creditTransaction.create({
        data: {
          accountId: account.id,
          userId,
          type: CreditTransactionType.ADMIN_ADJUSTMENT,
          amount,
          balanceBefore: account.totalCredits,
          balanceAfter: updatedAccount.totalCredits,
          creditType: creditType as CreditType,
          referenceType: 'admin_adjustment',
          referenceId: adminId,
          metadata: JSON.stringify({
            reason,
            adminId,
            adjustedCreditType: creditType,
          }),
        },
      });

      return updatedAccount;
    });

    this.logger.log(
      `Admin ${adminId} adjusted credits for user ${userId}: ${amount > 0 ? '+' : ''}${amount} ${creditType} (reason: ${reason})`,
    );

    return {
      success: true,
      message: `크레딧이 ${amount > 0 ? '추가' : '차감'}되었습니다.`,
      creditAccount: result,
    };
  }

  /**
   * 사용자 구독 플랜 변경 (관리자용)
   */
  async changeSubscriptionPlan(
    userId: number,
    dto: ChangeSubscriptionPlanDto,
    adminId: number,
  ) {
    const { planId, reason, grantCredits = false } = dto;

    if (!reason || reason.trim().length === 0) {
      throw new BadRequestException('변경 사유를 입력해주세요.');
    }

    // 사용자 확인
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    // 새 플랜 확인
    const newPlan = await this.prisma.subscriptionPlan.findUnique({
      where: { id: planId },
    });

    if (!newPlan) {
      throw new NotFoundException('플랜을 찾을 수 없습니다.');
    }

    if (!newPlan.isActive) {
      throw new BadRequestException('비활성화된 플랜으로 변경할 수 없습니다.');
    }

    // 현재 활성 구독 조회
    const currentSubscription =
      await this.subscriptionService.getCurrentSubscription(userId);

    if (!currentSubscription) {
      throw new BadRequestException(
        '현재 활성 구독이 없습니다. 새 구독을 생성해주세요.',
      );
    }

    const oldPlanId = currentSubscription.planId;
    const oldPlanName =
      currentSubscription.plan?.displayName || currentSubscription.plan?.name;
    const oldPlanPrice = currentSubscription.plan?.price || 0;

    // 같은 플랜으로 변경 불가
    if (oldPlanId === planId) {
      throw new BadRequestException('이미 같은 플랜을 사용 중입니다.');
    }

    // 가격 기준으로 업그레이드/다운그레이드 판단
    const isUpgrade = newPlan.price > oldPlanPrice;
    const action = isUpgrade
      ? SubscriptionAction.UPGRADED
      : SubscriptionAction.DOWNGRADED;

    const newStatus =
      newPlan.name === 'TRIAL'
        ? SubscriptionStatus.TRIAL
        : currentSubscription.status === 'TRIAL'
          ? SubscriptionStatus.ACTIVE
          : currentSubscription.status;

    // 트랜잭션으로 플랜 변경
    const result = await this.prisma.$transaction(async (tx) => {
      // 구독 플랜 업데이트
      const updatedSubscription = await tx.userSubscription.update({
        where: { id: currentSubscription.id },
        data: {
          planId,
          status: newStatus,
        },
        include: {
          plan: true,
        },
      });

      // 구독 히스토리 기록
      await tx.subscriptionHistory.create({
        data: {
          userId,
          subscriptionId: currentSubscription.id,
          action,
          oldStatus: currentSubscription.status,
          newStatus: currentSubscription.status,
          planId,
          planName: newPlan.displayName || newPlan.name,
          planPrice: newPlan.price,
          startedAt: currentSubscription.startedAt,
          expiresAt: currentSubscription.expiresAt,
          creditsGranted: grantCredits ? newPlan.monthlyCredits : 0,
          reason: `[관리자 변경] ${reason}`,
        },
      });

      // 크레딧 지급 (옵션)
      if (grantCredits && newPlan.monthlyCredits > 0) {
        const account = await tx.creditAccount.upsert({
          where: { userId },
          create: {
            userId,
            subscriptionCredits: newPlan.monthlyCredits,
            purchasedCredits: 0,
            bonusCredits: 0,
            totalCredits: newPlan.monthlyCredits,
          },
          update: {
            subscriptionCredits: { increment: newPlan.monthlyCredits },
            totalCredits: { increment: newPlan.monthlyCredits },
          },
        });

        await tx.creditTransaction.create({
          data: {
            accountId: account.id,
            userId,
            type: CreditTransactionType.ADMIN_ADJUSTMENT,
            amount: newPlan.monthlyCredits,
            balanceBefore: account.totalCredits - newPlan.monthlyCredits,
            balanceAfter: account.totalCredits,
            creditType: CreditType.SUBSCRIPTION,
            referenceType: 'admin_plan_change',
            referenceId: adminId,
            metadata: JSON.stringify({
              reason: `플랜 변경 크레딧 지급: ${oldPlanName} → ${newPlan.displayName || newPlan.name}`,
              adminId,
            }),
          },
        });
      }

      return updatedSubscription;
    });

    this.logger.log(
      `Admin ${adminId} changed subscription plan for user ${userId}: ${oldPlanName} → ${newPlan.displayName || newPlan.name} (reason: ${reason})`,
    );

    return {
      success: true,
      message: `구독 플랜이 ${newPlan.displayName || newPlan.name}(으)로 변경되었습니다.`,
      subscription: result,
    };
  }
}
