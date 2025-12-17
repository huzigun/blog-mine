import { Injectable } from '@nestjs/common';
import { PrismaService } from '@lib/database/prisma.service';
import { Prisma } from '@prisma/client';

export interface AdminUsersQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'all' | 'active' | 'inactive';
  subscription?: 'all' | 'TRIAL' | 'ACTIVE' | 'EXPIRED' | 'CANCELED' | 'NONE';
  sortBy?: 'createdAt' | 'email' | 'name';
  sortOrder?: 'asc' | 'desc';
}

@Injectable()
export class AdminUsersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 사용자 목록 조회 (관리자용)
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

    // 구독 상태 필터
    if (subscription !== 'all') {
      if (subscription === 'NONE') {
        where.subscriptions = {
          none: {},
        };
      } else {
        where.subscriptions = {
          some: {
            status: subscription,
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
        subscriptions: {
          select: {
            id: true,
            status: true,
            plan: {
              select: {
                id: true,
                name: true,
                displayName: true,
              },
            },
            startedAt: true,
            expiresAt: true,
            canceledAt: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 1, // 가장 최근 구독 1개만
        },
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

    // 응답 데이터 변환
    const data = users.map((user) => {
      const subscription = user.subscriptions[0] || null;
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
        deletedAt: user.deletedAt,
        isActive: !user.deletedAt,
        subscription: subscription
          ? {
              id: subscription.id,
              status: subscription.status,
              planName:
                subscription.plan?.displayName || subscription.plan?.name,
              startedAt: subscription.startedAt,
              expiresAt: subscription.expiresAt,
              canceledAt: subscription.canceledAt,
            }
          : null,
        credits: user.creditAccount?.totalCredits || 0,
        stats: {
          blogPosts: user._count.blogPosts,
          personas: user._count.personas,
        },
      };
    });

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
        subscriptions: {
          select: {
            id: true,
            status: true,
            plan: {
              select: {
                id: true,
                name: true,
                displayName: true,
                price: true,
              },
            },
            startedAt: true,
            expiresAt: true,
            canceledAt: true,
            autoRenewal: true,
            lastPaymentDate: true,
            lastPaymentAmount: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
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
      subscription: user.subscriptions[0] || null,
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
}
