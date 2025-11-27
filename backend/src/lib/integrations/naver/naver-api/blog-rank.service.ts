import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../lib/database/prisma.service';
import { NaverApiService } from './naver-api.service';

// 크롤링 결과 타입 정의
interface CrawledBlogResult {
  author: string | null;
  title: string | null;
  link: string | null;
  rank: number;
}

@Injectable()
export class BlogRankService {
  private readonly logger = new Logger(BlogRankService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly naverApiService: NaverApiService,
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

    // 1. 오늘 날짜로 수집한 기록이 있는지 확인
    const existingRecord = await this.prisma.keywordDate.findUnique({
      where: {
        keyword_dateStr: {
          keyword,
          dateStr: today,
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

    if (existingRecord) {
      this.logger.log(
        `Found existing record for "${keyword}" on ${today} with ${existingRecord.blogRanks.length} ranks`,
      );
      return {
        keywordDate: existingRecord,
        isNew: false,
      };
    }

    // 2. 없으면 웹 크롤링으로 조회 (Naver API 대신 실제 웹 결과 사용)
    const results = await this.naverApiService.blogsCrawler(keyword);

    // 3. KeywordDate 생성 (totalResults는 크롤링 결과 수로 설정)
    const keywordDate = await this.prisma.keywordDate.create({
      data: {
        keyword,
        dateStr: today,
        totalResults: results.length,
      },
    });

    this.logger.log(
      `Created KeywordDate record: ${keywordDate.id} for "${keyword}" on ${today}`,
    );

    // 4. 블로그 및 순위 저장 (트랜잭션)
    await this.saveBlogsAndRanks(keywordDate.id, results);

    // 5. 생성된 데이터 조회
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
    await this.prisma.$transaction(async (tx) => {
      for (const result of results) {
        // link가 null이면 건너뛰기
        if (!result.link) {
          this.logger.warn(`Skipping blog rank ${result.rank}: missing link`);
          continue;
        }

        // Blog upsert (link를 unique key로 사용)
        // 크롤링 데이터에는 제한된 정보만 있으므로 최소한의 정보만 저장
        const blog = await tx.blog.upsert({
          where: { link: result.link },
          update: {
            // 기존 블로그가 있으면 title과 bloggerName만 업데이트
            title: result.title || '제목 없음',
            bloggerName: result.author || 'Unknown',
            lastFetchedAt: new Date(),
            // description, bloggerLink, postDate, content, realUrl은 유지
          },
          create: {
            // 새 블로그 생성 (크롤링 데이터의 제한된 정보로 생성)
            link: result.link,
            title: result.title || '제목 없음',
            description: '', // 크롤링에는 description 없음
            bloggerName: result.author || 'Unknown',
            bloggerLink: '', // 크롤링에는 bloggerLink 없음
            postDate: '', // 크롤링에는 postDate 없음
            content: null, // 크롤링에는 content 없음
            summary: null,
            realUrl: result.link, // realUrl은 link와 동일하게 설정
            lastFetchedAt: new Date(),
          },
        });

        // BlogRank 생성
        await tx.blogRank.create({
          data: {
            keywordDateId,
            blogId: blog.id,
            rank: result.rank,
          },
        });

        // this.logger.debug(
        //   `Saved blog rank ${result.rank} for "${result.title}" (blog_id: ${blog.id})`,
        // );
      }
    });
  }

  /**
   * 오늘 날짜 문자열 반환 (YYYY-MM-DD)
   */
  private getTodayDateStr(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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
