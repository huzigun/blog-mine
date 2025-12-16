import { PrismaService } from '@lib/database';
import { BlogRankService } from '@lib/integrations/naver/naver-api/blog-rank.service';
import { SubscriptionService } from '@modules/subscription/subscription.service';
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SubscriptionStatus, SchedulerTaskStatus } from '@prisma/client';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private prisma: PrismaService,
    private blogRankService: BlogRankService,
    private subscriptionService: SubscriptionService,
  ) {}

  /**
   * 스케줄러 작업 로그 생성
   */
  private async createTaskLog(taskName: string, totalItems?: number) {
    return this.prisma.schedulerLog.create({
      data: {
        taskName,
        status: SchedulerTaskStatus.RUNNING,
        totalItems,
      },
    });
  }

  /**
   * 스케줄러 작업 로그 업데이트 (성공)
   */
  private async completeTaskLog(
    logId: number,
    processedItems: number,
    successItems: number,
    failedItems: number,
    metadata?: any,
  ) {
    const startedAt = await this.prisma.schedulerLog
      .findUnique({ where: { id: logId } })
      .then((log) => log?.startedAt);

    const duration = startedAt
      ? Date.now() - new Date(startedAt).getTime()
      : null;

    return this.prisma.schedulerLog.update({
      where: { id: logId },
      data: {
        status:
          failedItems > 0
            ? SchedulerTaskStatus.PARTIAL
            : SchedulerTaskStatus.COMPLETED,
        completedAt: new Date(),
        duration,
        processedItems,
        successItems,
        failedItems,
        message:
          failedItems > 0
            ? `작업 완료 (성공: ${successItems}, 실패: ${failedItems})`
            : `작업 정상 완료 (처리: ${processedItems})`,
        metadata: metadata || undefined,
      },
    });
  }

  /**
   * 스케줄러 작업 로그 업데이트 (실패)
   */
  private async failTaskLog(logId: number, error: Error, metadata?: any) {
    const startedAt = await this.prisma.schedulerLog
      .findUnique({ where: { id: logId } })
      .then((log) => log?.startedAt);

    const duration = startedAt
      ? Date.now() - new Date(startedAt).getTime()
      : null;

    return this.prisma.schedulerLog.update({
      where: { id: logId },
      data: {
        status: SchedulerTaskStatus.FAILED,
        completedAt: new Date(),
        duration,
        message: error.message,
        metadata: metadata || { error: error.stack },
      },
    });
  }

  /**
   * 예제: 매일 kst 오전 07:00에 실행되는 작업
   * Cron 표현식을 사용하여 원하는 시간에 작업을 스케줄링할 수 있습니다.
   */
  @Cron('0 0 22 * * *')
  async handleDailyTask() {
    const taskName = 'daily-blog-rank-collection';
    let taskLog: { id: number } | null = null;

    try {
      this.logger.log('Daily blog rank collection task started');

      // 구독 활성화 된 사용자 목록 가져오기
      const activeSubscribers = await this.prisma.userSubscription.findMany({
        where: {
          status: {
            in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL],
          },
        },
        include: {
          user: {
            select: {
              id: true,
              keywordTrackings: {
                where: { isActive: true },
              },
            },
          },
        },
      });

      // 각 사용자의 추적할 키워드 배열 생성
      const keywords = activeSubscribers.flatMap((subscription) => {
        return subscription.user.keywordTrackings.map(
          (tracking) => tracking.keyword,
        );
      });

      // 중복 키워드 제거
      const uniqueKeywords = Array.from(new Set(keywords));

      // 작업 로그 생성
      taskLog = await this.createTaskLog(taskName, uniqueKeywords.length);

      this.logger.log(
        `Collecting blog ranks for ${uniqueKeywords.length} unique keywords`,
      );
      this.logger.debug(`Keywords: ${uniqueKeywords.join(', ')}`);

      // 성공/실패 카운터
      let successCount = 0;
      let failedCount = 0;
      const failedKeywords: string[] = [];

      // 순차 실행으로 차단 방지
      for (let i = 0; i < uniqueKeywords.length; i++) {
        const keyword = uniqueKeywords[i];
        try {
          await this.blogRankService.collectBlogRanks(keyword, 40);
          successCount++;
          this.logger.debug(
            `[${i + 1}/${uniqueKeywords.length}] Success: ${keyword}`,
          );
        } catch (error) {
          failedCount++;
          failedKeywords.push(keyword);
          this.logger.error(
            `[${i + 1}/${uniqueKeywords.length}] Failed: ${keyword}`,
            error,
          );
        }

        // 차단 방지용 대기 (마지막 항목 제외)
        if (i < uniqueKeywords.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 300));
        }
      }

      // 작업 로그 완료 처리
      if (taskLog) {
        await this.completeTaskLog(
          taskLog.id,
          uniqueKeywords.length,
          successCount,
          failedCount,
          {
            keywords: uniqueKeywords,
            failedKeywords,
            activeSubscribers: activeSubscribers.length,
          },
        );
      }

      this.logger.log(
        `Daily blog rank collection completed (Success: ${successCount}, Failed: ${failedCount})`,
      );
    } catch (error) {
      this.logger.error('Daily blog rank collection task failed', error);

      // 작업 로그 실패 처리
      if (taskLog) {
        await this.failTaskLog(taskLog.id, error as Error);
      }

      throw error;
    }
  }

  // ============================================
  // 구독 자동 갱신 스케줄러
  // ============================================

  /**
   * 구독 자동 갱신 스케줄러 (매일 00:05 KST = 15:05 UTC)
   * - 만료된 구독을 자동으로 갱신
   * - 결제 실패 시 PAST_DUE 상태로 전환
   */
  @Cron('0 5 15 * * *')
  async handleSubscriptionRenewal() {
    const taskName = 'subscription-renewal';
    let taskLog: { id: number } | null = null;

    try {
      this.logger.log('Subscription renewal task started');

      // 갱신 대상 구독 조회
      const subscriptions =
        await this.subscriptionService.findSubscriptionsToRenew();

      if (subscriptions.length === 0) {
        this.logger.log('No subscriptions to renew');
        return;
      }

      // 작업 로그 생성
      taskLog = await this.createTaskLog(taskName, subscriptions.length);

      let successCount = 0;
      let failedCount = 0;
      const results: Array<{
        subscriptionId: number;
        userId: number;
        success: boolean;
        action: string;
        error?: string;
      }> = [];

      // 각 구독에 대해 갱신 시도
      for (const subscription of subscriptions) {
        try {
          const result = await this.subscriptionService.renewSubscription(
            subscription.id,
          );

          if (result.success || result.action === 'renewed') {
            successCount++;
          } else {
            failedCount++;
          }

          results.push({
            subscriptionId: result.subscriptionId,
            userId: result.userId,
            success: result.success,
            action: result.action,
            error: result.error,
          });

          this.logger.debug(
            `Subscription ${subscription.id}: ${result.action} - ${result.message}`,
          );
        } catch (error) {
          failedCount++;
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';
          results.push({
            subscriptionId: subscription.id,
            userId: subscription.userId,
            success: false,
            action: 'error',
            error: errorMessage,
          });
          this.logger.error(
            `Error renewing subscription ${subscription.id}:`,
            error,
          );
        }

        // 결제 API 부하 방지를 위한 대기
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      // 작업 로그 완료 처리
      if (taskLog) {
        await this.completeTaskLog(
          taskLog.id,
          subscriptions.length,
          successCount,
          failedCount,
          { results },
        );
      }

      this.logger.log(
        `Subscription renewal completed (Success: ${successCount}, Failed: ${failedCount})`,
      );
    } catch (error) {
      this.logger.error('Subscription renewal task failed', error);

      if (taskLog) {
        await this.failTaskLog(taskLog.id, error as Error);
      }

      throw error;
    }
  }

  /**
   * 결제 재시도 스케줄러 (매일 12:00, 18:00 KST = 03:00, 09:00 UTC)
   * - PAST_DUE 상태의 구독에 대해 재결제 시도
   */
  @Cron('0 0 3,9 * * *')
  async handlePaymentRetry() {
    const taskName = 'payment-retry';
    let taskLog: { id: number } | null = null;

    try {
      this.logger.log('Payment retry task started');

      // 재시도 대상 구독 조회
      const subscriptions =
        await this.subscriptionService.findSubscriptionsToRetry();

      if (subscriptions.length === 0) {
        this.logger.log('No subscriptions to retry');
        return;
      }

      taskLog = await this.createTaskLog(taskName, subscriptions.length);

      let successCount = 0;
      let failedCount = 0;
      const results: Array<{
        subscriptionId: number;
        userId: number;
        success: boolean;
        action: string;
        error?: string;
      }> = [];

      for (const subscription of subscriptions) {
        try {
          const result = await this.subscriptionService.renewSubscription(
            subscription.id,
          );

          if (result.success || result.action === 'renewed') {
            successCount++;
          } else {
            failedCount++;
          }

          results.push({
            subscriptionId: result.subscriptionId,
            userId: result.userId,
            success: result.success,
            action: result.action,
            error: result.error,
          });

          this.logger.debug(
            `Retry subscription ${subscription.id}: ${result.action} - ${result.message}`,
          );
        } catch (error) {
          failedCount++;
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';
          results.push({
            subscriptionId: subscription.id,
            userId: subscription.userId,
            success: false,
            action: 'error',
            error: errorMessage,
          });
          this.logger.error(
            `Error retrying subscription ${subscription.id}:`,
            error,
          );
        }

        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      if (taskLog) {
        await this.completeTaskLog(
          taskLog.id,
          subscriptions.length,
          successCount,
          failedCount,
          { results },
        );
      }

      this.logger.log(
        `Payment retry completed (Success: ${successCount}, Failed: ${failedCount})`,
      );
    } catch (error) {
      this.logger.error('Payment retry task failed', error);

      if (taskLog) {
        await this.failTaskLog(taskLog.id, error as Error);
      }

      throw error;
    }
  }

  /**
   * 유예기간 만료 처리 스케줄러 (매일 01:00 KST = 16:00 UTC)
   * - 유예기간이 만료된 PAST_DUE 구독을 EXPIRED로 전환
   * - FREE 플랜으로 자동 다운그레이드
   */
  @Cron('0 0 16 * * *')
  async handleGracePeriodExpiration() {
    const taskName = 'grace-period-expiration';
    let taskLog: { id: number } | null = null;

    try {
      this.logger.log('Grace period expiration task started');

      taskLog = await this.createTaskLog(taskName);

      const processedCount =
        await this.subscriptionService.handleExpiredSubscriptions();

      if (taskLog) {
        await this.completeTaskLog(
          taskLog.id,
          processedCount,
          processedCount,
          0,
          { expiredSubscriptions: processedCount },
        );
      }

      this.logger.log(
        `Grace period expiration completed (Processed: ${processedCount})`,
      );
    } catch (error) {
      this.logger.error('Grace period expiration task failed', error);

      if (taskLog) {
        await this.failTaskLog(taskLog.id, error as Error);
      }

      throw error;
    }
  }
}
