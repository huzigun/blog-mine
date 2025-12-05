import { PrismaService } from '@lib/database';
import { BlogRankService } from '@lib/integrations/naver/naver-api/blog-rank.service';
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SubscriptionStatus, SchedulerTaskStatus } from '@prisma/client';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private prisma: PrismaService,
    private blogRankService: BlogRankService,
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
}
