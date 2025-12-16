import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../lib/database/prisma.service';
import { NaverApiService } from './naver-api.service';
import { DateService } from '@lib/date/date.service';

// 크롤링 결과 타입 정의
interface CrawledBlogResult {
  author: string | null;
  title: string | null;
  link: string | null;
  rank: number;
  content: string;
  date: string;
  description: string;
}

@Injectable()
export class BlogRankService {
  private readonly logger = new Logger(BlogRankService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly naverApiService: NaverApiService,
    private readonly dateService: DateService,
  ) {}

  /**
   * 특정 키워드의 블로그 순위 수집
   * @param keyword - 검색 키워드
   * @param _display - 검색 결과 수 (하위 호환성을 위해 유지, 크롤러는 고정된 결과를 반환)
   * @returns 수집된 순위 정보
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async collectBlogRanks(keyword: string, _display: number = 40) {
    const today = this.getTodayDateStr();

    this.logger.log(
      `Collecting blog ranks for keyword: "${keyword}" on ${today}`,
    );

    // 웹 크롤링으로 조회 (Naver API 대신 실제 웹 결과 사용)
    const results = await this.naverApiService.blogsCrawler(keyword);

    if (results.length === 0) {
      this.logger.log(`크롤링된 결과가 없습니다. "${keyword}" ${today}`);
    }

    // 3. KeywordDate 생성 (totalResults는 크롤링 결과 수로 설정)
    const keywordDate = await this.prisma.keywordDate.upsert({
      where: {
        keyword_dateStr: {
          keyword,
          dateStr: today,
        },
      },
      create: {
        keyword,
        dateStr: today,
        totalResults: results.length,
      },
      update: {
        totalResults: results.length,
      },
    });

    this.logger.log(
      `Created KeywordDate record: ${keywordDate.id} for "${keyword}" on ${today}`,
    );

    // 블로그 및 순위 저장 (트랜잭션)
    await this.saveBlogsAndRanks(keywordDate.id, results);

    // 생성된 데이터 조회
    const createdRecord = await this.prisma.keywordDate.findUnique({
      where: { id: keywordDate.id },
      include: {
        blogRanks: {
          include: {
            blog: true,
          },
          orderBy: {
            rank: 'asc',
          },
        },
      },
    });

    this.logger.log(
      `Successfully collected ${results.length} blog ranks for "${keyword}"`,
    );

    return {
      keywordDate: createdRecord,
      isNew: true,
    };
  }

  /**
   * 블로그 및 순위 저장 (크롤링 결과 처리)
   * @param keywordDateId - KeywordDate ID
   * @param results - 크롤링 결과
   */
  private async saveBlogsAndRanks(
    keywordDateId: number,
    results: CrawledBlogResult[],
  ) {
    // 트랜잭션으로 일괄 처리
    for (const result of results) {
      // link가 null이면 건너뛰기
      if (!result.link || !result.title || !result.author) {
        this.logger.warn(`Skipping blog rank ${result.rank}: missing link`);
        continue;
      }

      let naverBlogId = '';
      try {
        const url = new URL(result.link);
        const paths = url.pathname.split('/');
        naverBlogId = paths[paths.length - 1];
      } catch {
        naverBlogId = result.link;
      }

      // 상대 시간 문자열을 날짜로 변환 (예: "1시간 전", "3분 전", "1일 전")
      if (result.date && result.date.includes('전')) {
        const relativeTimeMatch = result.date.match(/(\d+)(분|시간|일)\s*전/);
        if (relativeTimeMatch) {
          const amount = parseInt(relativeTimeMatch[1], 10);
          const unit = relativeTimeMatch[2];

          let convertedDate = this.dateService.now();

          // 단위에 따라 시간 빼기
          if (unit === '분') {
            convertedDate = this.dateService.subtract(
              convertedDate,
              amount,
              'minute',
            );
          } else if (unit === '시간') {
            convertedDate = this.dateService.subtract(
              convertedDate,
              amount,
              'hour',
            );
          } else if (unit === '일') {
            convertedDate = this.dateService.subtract(
              convertedDate,
              amount,
              'day',
            );
          }

          // YYYY-MM-DD HH:mm 형식으로 변환
          result.date = this.dateService.formatDateTime(
            convertedDate,
            'YYYY-MM-DD HH:mm',
          );
        }
      }

      try {
        // Blog upsert (link를 unique key로 사용)
        // 크롤링 데이터에는 제한된 정보만 있으므로 최소한의 정보만 저장
        const blog = await this.prisma.blog.upsert({
          where: { link: naverBlogId },
          update: {
            // 기존 블로그가 있으면 title과 bloggerName만 업데이트
            title: result.title || '제목 없음',
            description: result.description,
            content: result.content,
            lastFetchedAt: new Date(),
            postDate: result.date,
            // description, bloggerLink, postDate, content, realUrl은 유지
          },
          create: {
            // 새 블로그 생성 (크롤링 데이터의 제한된 정보로 생성)
            link: naverBlogId,
            title: result.title,
            description: result.description,
            bloggerName: result.author,
            bloggerLink: '', // 크롤링에는 bloggerLink 없음
            postDate: result.date, // 크롤링에는 postDate 없음
            content: result.content,
            summary: null,
            realUrl: result.link, // realUrl은 link와 동일하게 설정
            lastFetchedAt: new Date(),
          },
        });

        await this.prisma.blogRank.upsert({
          where: {
            keywordDateId_blogId: {
              keywordDateId,
              blogId: blog.id,
            },
          },
          update: {
            rank: result.rank, // 랭크 업데이트
          },
          create: {
            keywordDateId,
            blogId: blog.id,
            rank: result.rank, // 랭크 생성
          },
        });
      } catch (error) {
        this.logger.error(error);
      }

      await new Promise((resolve) => {
        setTimeout(() => {
          resolve(true);
        }, 100);
      }); // 수집 차단 방지용 대기

      // this.logger.debug(
      //   `Saved blog rank ${result.rank} for "${result.title}" (blog_id: ${blog.id})`,
      // );
    }
    // await this.prisma.$transaction(async (tx) => {
    // });
  }

  /**
   * 오늘 날짜 문자열 반환 (YYYY-MM-DD, Asia/Seoul 타임존)
   */
  private getTodayDateStr(): string {
    return this.dateService.getTodayDateStr();
  }

  /**
   * 특정 키워드의 순위 이력 조회
   * @param keyword - 검색 키워드
   * @param limit - 조회할 날짜 수 (기본 30일)
   * @returns 순위 이력
   */
  async getBlogRankHistory(keyword: string, limit: number = 30) {
    const records = await this.prisma.keywordDate.findMany({
      where: { keyword },
      include: {
        blogRanks: {
          include: {
            blog: true,
          },
          orderBy: {
            rank: 'asc',
          },
        },
      },
      orderBy: {
        dateStr: 'desc',
      },
      take: limit,
    });

    return records;
  }

  /**
   * 특정 날짜의 키워드 순위 조회
   * @param keyword - 검색 키워드
   * @param dateStr - 날짜 (YYYY-MM-DD)
   * @returns 순위 정보
   */
  async getBlogRanksByDate(keyword: string, dateStr: string) {
    const record = await this.prisma.keywordDate.findUnique({
      where: {
        keyword_dateStr: {
          keyword,
          dateStr,
        },
      },
      include: {
        blogRanks: {
          include: {
            blog: true,
          },
          orderBy: {
            rank: 'asc',
          },
        },
      },
    });

    return record;
  }
}
