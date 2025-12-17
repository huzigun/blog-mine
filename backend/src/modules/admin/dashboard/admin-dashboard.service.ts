import { Injectable } from '@nestjs/common';
import { PrismaService } from '@lib/database/prisma.service';

@Injectable()
export class AdminDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 대시보드 통계 조회
   */
  async getStats() {
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    // 각 유저별 최신 구독 ID 조회
    const latestSubscriptionIds = await this.prisma.$queryRaw<
      { id: number }[]
    >`
      SELECT us.id
      FROM user_subscriptions us
      INNER JOIN (
        SELECT user_id, MAX(created_at) as max_created_at
        FROM user_subscriptions
        GROUP BY user_id
      ) latest ON us.user_id = latest.user_id AND us.created_at = latest.max_created_at
    `;
    const latestIds = latestSubscriptionIds.map((row) => row.id);

    const [
      // 사용자 통계
      totalUsers,
      newUsersThisMonth,
      newUsersLastMonth,
      // 구독 통계 (최신 구독만)
      activeSubscriptions,
      activeSubscriptionsLastMonth,
      // 매출 통계
      revenueThisMonth,
      revenueLastMonth,
      // 포스트 통계
      totalPosts,
      postsThisMonth,
      postsLastMonth,
    ] = await Promise.all([
      // 전체 사용자 수 (삭제되지 않은)
      this.prisma.user.count({
        where: { deletedAt: null },
      }),
      // 이번 달 신규 사용자
      this.prisma.user.count({
        where: {
          deletedAt: null,
          createdAt: { gte: thisMonthStart },
        },
      }),
      // 지난 달 신규 사용자
      this.prisma.user.count({
        where: {
          deletedAt: null,
          createdAt: { gte: lastMonthStart, lt: thisMonthStart },
        },
      }),
      // 활성 구독 수 (ACTIVE + TRIAL, 최신 구독만)
      this.prisma.userSubscription.count({
        where: {
          id: { in: latestIds },
          status: { in: ['ACTIVE', 'TRIAL'] },
        },
      }),
      // 지난달 활성 구독 (지난달 마지막 날 기준, 최신 구독만)
      this.prisma.userSubscription.count({
        where: {
          id: { in: latestIds },
          status: { in: ['ACTIVE', 'TRIAL'] },
          createdAt: { lte: lastMonthEnd },
        },
      }),
      // 이번 달 매출
      this.prisma.payment.aggregate({
        where: {
          status: 'COMPLETED',
          createdAt: { gte: thisMonthStart },
        },
        _sum: { amount: true },
      }),
      // 지난 달 매출
      this.prisma.payment.aggregate({
        where: {
          status: 'COMPLETED',
          createdAt: { gte: lastMonthStart, lt: thisMonthStart },
        },
        _sum: { amount: true },
      }),
      // 전체 포스트 수
      this.prisma.blogPost.count(),
      // 이번 달 포스트
      this.prisma.blogPost.count({
        where: { createdAt: { gte: thisMonthStart } },
      }),
      // 지난 달 포스트
      this.prisma.blogPost.count({
        where: { createdAt: { gte: lastMonthStart, lt: thisMonthStart } },
      }),
    ]);

    // 변화율 계산 함수
    const calculateChange = (
      current: number,
      previous: number,
    ): { change: string; changeType: 'positive' | 'negative' | 'neutral' } => {
      if (previous === 0) {
        if (current > 0) {
          return { change: `+${current} 신규`, changeType: 'positive' };
        }
        return { change: '', changeType: 'neutral' };
      }
      const diff = current - previous;
      const percentage = Math.round((diff / previous) * 100);
      if (diff > 0) {
        return { change: `+${percentage}% 전월 대비`, changeType: 'positive' };
      } else if (diff < 0) {
        return { change: `${percentage}% 전월 대비`, changeType: 'negative' };
      }
      return { change: '변동 없음', changeType: 'neutral' };
    };

    const thisMonthRevenue = revenueThisMonth._sum.amount || 0;
    const lastMonthRevenue = revenueLastMonth._sum.amount || 0;

    return {
      stats: [
        {
          label: '전체 사용자',
          value: totalUsers.toLocaleString(),
          icon: 'i-heroicons-users',
          ...calculateChange(newUsersThisMonth, newUsersLastMonth),
        },
        {
          label: '활성 구독',
          value: activeSubscriptions.toLocaleString(),
          icon: 'i-heroicons-credit-card',
          ...calculateChange(activeSubscriptions, activeSubscriptionsLastMonth),
        },
        {
          label: '이번 달 매출',
          value: `${thisMonthRevenue.toLocaleString()}원`,
          icon: 'i-heroicons-banknotes',
          ...calculateChange(thisMonthRevenue, lastMonthRevenue),
        },
        {
          label: '생성된 포스트',
          value: totalPosts.toLocaleString(),
          icon: 'i-heroicons-document-text',
          ...calculateChange(postsThisMonth, postsLastMonth),
        },
      ],
    };
  }

  /**
   * 최근 관리자 활동 로그 조회
   */
  async getRecentActivities(limit = 10) {
    const activities = await this.prisma.adminActivityLog.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        admin: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // 액션별 한글 라벨 매핑
    const actionLabels: Record<string, string> = {
      'user.update': '사용자 정보 수정',
      'user.delete': '사용자 삭제',
      'subscription.update': '구독 상태 변경',
      'subscription.extend': '구독 기간 연장',
      'credit.adjust': '크레딧 조정',
      'payment.refund': '결제 환불',
      'contact.update': '문의 상태 변경',
      'admin.create': '관리자 등록',
      'admin.update': '관리자 정보 수정',
      'admin.delete': '관리자 삭제',
      'admin.reset_password': '관리자 비밀번호 재설정',
      'plan.update': '플랜 정보 수정',
    };

    return activities.map((activity) => ({
      id: activity.id,
      action: actionLabels[activity.action] || activity.action,
      description: this.formatActivityDescription(activity),
      adminName: activity.admin.name,
      createdAt: this.formatRelativeTime(activity.createdAt),
    }));
  }

  /**
   * 활동 설명 포맷팅
   */
  private formatActivityDescription(activity: {
    action: string;
    targetType: string | null;
    targetId: number | null;
    admin: { name: string };
    details?: unknown;
  }): string {
    const { admin, targetType, targetId } = activity;

    if (targetType && targetId) {
      return `${admin.name}님이 ${targetType} #${targetId}에 대해 작업을 수행했습니다.`;
    }
    return `${admin.name}님이 작업을 수행했습니다.`;
  }

  /**
   * 상대 시간 포맷팅
   */
  private formatRelativeTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) {
      return '방금 전';
    } else if (diffMinutes < 60) {
      return `${diffMinutes}분 전`;
    } else if (diffHours < 24) {
      return `${diffHours}시간 전`;
    } else if (diffDays < 7) {
      return `${diffDays}일 전`;
    } else {
      return date.toLocaleDateString('ko-KR');
    }
  }
}
