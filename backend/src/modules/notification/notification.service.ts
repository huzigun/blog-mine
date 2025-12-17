import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { PrismaService } from '@lib/database/prisma.service';
import {
  NotificationType,
  NotificationImportance,
  Notification,
} from '@prisma/client';
import { CreateNotificationDto, FilterNotificationDto } from './dto';

interface MessageEvent {
  data: string;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  // userId -> Subject 매핑 (SSE 연결 관리)
  private subjects = new Map<number, Subject<Notification>>();

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 알림 생성 + SSE로 실시간 전송
   */
  async create(dto: CreateNotificationDto): Promise<Notification> {
    const notification = await this.prisma.notification.create({
      data: {
        userId: dto.userId,
        type: dto.type,
        importance: dto.importance || NotificationImportance.NORMAL,
        title: dto.title,
        message: dto.message,
        data: dto.data || undefined,
      },
    });

    // SSE 구독자에게 실시간 전송
    const subject = this.subjects.get(dto.userId);
    if (subject) {
      subject.next(notification);
      this.logger.debug(
        `Notification sent via SSE to user ${dto.userId}: ${notification.id}`,
      );
    }

    this.logger.log(
      `Notification created for user ${dto.userId}: ${notification.type} - ${notification.title}`,
    );

    return notification;
  }

  /**
   * 알림 목록 조회 (페이지네이션)
   */
  async findAll(userId: number, filter: FilterNotificationDto) {
    const { page = 1, limit = 20, type, isRead } = filter;
    const skip = (page - 1) * limit;

    const where = {
      userId,
      ...(type && { type }),
      ...(typeof isRead === 'boolean' && { isRead }),
    };

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      data: notifications,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * 읽지 않은 알림 수 조회
   */
  async getUnreadCount(userId: number): Promise<number> {
    return this.prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });
  }

  /**
   * 단일 알림 읽음 처리
   */
  async markAsRead(
    userId: number,
    notificationId: number,
  ): Promise<Notification> {
    const notification = await this.prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId,
      },
    });

    if (!notification) {
      throw new NotFoundException('알림을 찾을 수 없습니다.');
    }

    if (notification.isRead) {
      return notification;
    }

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  /**
   * 전체 알림 읽음 처리
   */
  async markAllAsRead(userId: number): Promise<{ count: number }> {
    const result = await this.prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return { count: result.count };
  }

  /**
   * 단일 알림 삭제
   */
  async delete(userId: number, notificationId: number): Promise<void> {
    const notification = await this.prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId,
      },
    });

    if (!notification) {
      throw new NotFoundException('알림을 찾을 수 없습니다.');
    }

    await this.prisma.notification.delete({
      where: { id: notificationId },
    });
  }

  /**
   * 오래된 알림 삭제 (스케줄러용)
   */
  async deleteOldNotifications(days: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const result = await this.prisma.notification.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    });

    this.logger.log(
      `Deleted ${result.count} notifications older than ${days} days`,
    );

    return result.count;
  }

  // ==========================================
  // SSE 관련 메서드
  // ==========================================

  /**
   * SSE 구독 등록
   */
  subscribe(userId: number): Observable<MessageEvent> {
    if (!this.subjects.has(userId)) {
      this.subjects.set(userId, new Subject<Notification>());
      this.logger.log(`SSE subscription created for user ${userId}`);
    }

    return this.subjects.get(userId)!.pipe(
      map((notification) => ({
        data: JSON.stringify(notification),
      })),
    );
  }

  /**
   * SSE 구독 해제
   */
  unsubscribe(userId: number): void {
    const subject = this.subjects.get(userId);
    if (subject) {
      subject.complete();
      this.subjects.delete(userId);
      this.logger.log(`SSE subscription removed for user ${userId}`);
    }
  }

  /**
   * 현재 SSE 연결 수 조회 (디버깅용)
   */
  getActiveConnectionCount(): number {
    return this.subjects.size;
  }

  // ==========================================
  // 알림 발송 헬퍼 메서드
  // ==========================================

  /**
   * 원고 생성 완료 알림
   */
  async sendBlogPostCompleted(
    userId: number,
    blogPostId: number,
    displayId: string,
  ): Promise<Notification> {
    return this.create({
      userId,
      type: NotificationType.BLOG_POST,
      importance: NotificationImportance.NORMAL,
      title: '원고 생성 완료',
      message: `원고(${displayId})가 성공적으로 생성되었습니다.`,
      data: { link: `/console/workspace/${blogPostId}`, blogPostId },
    });
  }

  /**
   * 원고 생성 실패 알림
   */
  async sendBlogPostFailed(
    userId: number,
    blogPostId: number,
    displayId: string,
    reason: string,
  ): Promise<Notification> {
    return this.create({
      userId,
      type: NotificationType.BLOG_POST,
      importance: NotificationImportance.HIGH,
      title: '원고 생성 실패',
      message: `원고(${displayId}) 생성에 실패했습니다: ${reason}`,
      data: { link: `/console/workspace/${blogPostId}`, blogPostId },
    });
  }

  /**
   * 구독 갱신 완료 알림
   */
  async sendSubscriptionRenewed(
    userId: number,
    planName: string,
  ): Promise<Notification> {
    return this.create({
      userId,
      type: NotificationType.SUBSCRIPTION,
      importance: NotificationImportance.NORMAL,
      title: '구독 갱신 완료',
      message: `${planName} 플랜이 성공적으로 갱신되었습니다.`,
      data: { link: '/mypage/subscription' },
    });
  }

  /**
   * 결제 실패 알림
   */
  async sendPaymentFailed(
    userId: number,
    reason: string,
  ): Promise<Notification> {
    return this.create({
      userId,
      type: NotificationType.SUBSCRIPTION,
      importance: NotificationImportance.CRITICAL,
      title: '결제 실패',
      message: `결제에 실패했습니다: ${reason}. 결제 수단을 확인해주세요.`,
      data: { link: '/mypage/payment' },
    });
  }

  /**
   * 구독 만료 임박 알림
   */
  async sendSubscriptionExpiringSoon(
    userId: number,
    daysRemaining: number,
  ): Promise<Notification> {
    return this.create({
      userId,
      type: NotificationType.SUBSCRIPTION,
      importance: NotificationImportance.HIGH,
      title: '구독 만료 예정',
      message: `구독이 ${daysRemaining}일 후 만료됩니다. 자동 갱신을 확인해주세요.`,
      data: { link: '/mypage/subscription' },
    });
  }

  /**
   * 크레딧 충전 완료 알림
   */
  async sendCreditCharged(
    userId: number,
    amount: number,
  ): Promise<Notification> {
    return this.create({
      userId,
      type: NotificationType.CREDIT,
      importance: NotificationImportance.NORMAL,
      title: '크레딧 충전 완료',
      message: `${amount.toLocaleString()} BloC가 충전되었습니다.`,
      data: { link: '/mypage/credits' },
    });
  }

  /**
   * 크레딧 부족 알림
   */
  async sendCreditLow(
    userId: number,
    currentBalance: number,
  ): Promise<Notification> {
    return this.create({
      userId,
      type: NotificationType.CREDIT,
      importance: NotificationImportance.HIGH,
      title: '크레딧 부족',
      message: `현재 크레딧 잔액이 ${currentBalance.toLocaleString()} BloC입니다. 충전해주세요.`,
      data: { link: '/mypage/credits' },
    });
  }

  /**
   * 시스템 공지 알림
   */
  async sendSystemNotice(
    userId: number,
    title: string,
    message: string,
    link?: string,
  ): Promise<Notification> {
    return this.create({
      userId,
      type: NotificationType.SYSTEM,
      importance: NotificationImportance.LOW,
      title,
      message,
      data: link ? { link } : undefined,
    });
  }

  /**
   * 프로모션 알림
   */
  async sendPromotion(
    userId: number,
    title: string,
    message: string,
    link?: string,
  ): Promise<Notification> {
    return this.create({
      userId,
      type: NotificationType.PROMOTION,
      importance: NotificationImportance.LOW,
      title,
      message,
      data: link ? { link } : undefined,
    });
  }

  // ==========================================
  // 블로그 순위 추적 알림
  // ==========================================

  /**
   * 순위 추적 오류 알림
   */
  async sendTrackingError(
    userId: number,
    keyword: string,
  ): Promise<Notification> {
    return this.create({
      userId,
      type: NotificationType.SYSTEM,
      importance: NotificationImportance.HIGH,
      title: '추적 오류',
      message: `'${keyword}' 순위 추적 중 문제가 발생했습니다. 설정을 다시 확인해 주세요.`,
      data: { link: '/console/tracking' },
    });
  }

  /**
   * 순위 추적 만료 알림
   */
  async sendTrackingExpired(
    userId: number,
    keyword: string,
  ): Promise<Notification> {
    return this.create({
      userId,
      type: NotificationType.SYSTEM,
      importance: NotificationImportance.NORMAL,
      title: '추적 만료',
      message: `'${keyword}' 추적 기간이 종료되어 더 이상 순위를 업데이트할 수 없습니다.`,
      data: { link: '/console/tracking' },
    });
  }

  // ==========================================
  // 결제·플랜 알림
  // ==========================================

  /**
   * 결제 성공 알림
   */
  async sendPaymentSuccess(
    userId: number,
    planName: string,
    amount: number,
  ): Promise<Notification> {
    return this.create({
      userId,
      type: NotificationType.SUBSCRIPTION,
      importance: NotificationImportance.NORMAL,
      title: '결제 완료',
      message: `결제가 정상 처리되었습니다. ${planName} 플랜이 갱신되었습니다. (${amount.toLocaleString()}원)`,
      data: { link: '/mypage/subscription' },
    });
  }

  /**
   * 한도 초과 임박 알림
   */
  async sendUsageLimitWarning(
    userId: number,
    usagePercent: number,
  ): Promise<Notification> {
    return this.create({
      userId,
      type: NotificationType.SUBSCRIPTION,
      importance: NotificationImportance.HIGH,
      title: '한도 초과 임박',
      message: `현재 플랜의 사용량이 ${usagePercent}%에 도달했습니다. 이용량을 확인해 주세요.`,
      data: { link: '/mypage/subscription' },
    });
  }

  /**
   * 한도 초과 알림
   */
  async sendUsageLimitExceeded(userId: number): Promise<Notification> {
    return this.create({
      userId,
      type: NotificationType.SUBSCRIPTION,
      importance: NotificationImportance.CRITICAL,
      title: '한도 초과',
      message:
        '플랜 사용량이 한도를 넘었습니다. 계속 이용하려면 플랜 업그레이드 또는 추가 상품이 필요합니다.',
      data: { link: '/mypage/subscription' },
    });
  }
}
