import { PrismaService } from '@lib/database';
import { BlogRankService } from '@lib/integrations/naver/naver-api/blog-rank.service';
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private prisma: PrismaService,
    private blogRankService: BlogRankService,
  ) {}

  /**
   * 예제: 매일 kst 오전 07:00에 실행되는 작업
   * Cron 표현식을 사용하여 원하는 시간에 작업을 스케줄링할 수 있습니다.
   */
  @Cron('0 0 7 * * *')
  async handleDailyTask() {
    this.logger.log('Daily task executed at 7 AM');
    // 구독 활성화 된 사용자 목록 가져오기
    const activeSubscribers = await this.prisma.userSubscription.findMany({
      where: {
        status: 'ACTIVE',
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

    this.logger.log(
      `Collecting blog ranks for ${uniqueKeywords.length} unique keywords`,
    );
    this.logger.debug(`Keywords: ${uniqueKeywords.join(', ')}`);

    // 각 키워드에 대해 블로그 순위 수집 배치 실행
    const batchSize = 5; // 한 번에 처리할 키워드 수
    for (let i = 0; i < uniqueKeywords.length; i += batchSize) {
      const batch = uniqueKeywords.slice(i, i + batchSize);
      await Promise.all(
        batch.map((keyword) =>
          this.blogRankService.collectBlogRanks(keyword, 40),
        ),
      );
      this.logger.log(
        `Processed batch ${i / batchSize + 1} (${batch.length} keywords)`,
      );
    }

    this.logger.log('Hourly blog rank collection completed');
  }
}
