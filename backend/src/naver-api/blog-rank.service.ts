import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NaverApiService, BlogSearchResult } from './naver-api.service';

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
   * @param display - 검색 결과 수 (기본 40)
   * @returns 수집된 순위 정보
   */
  async collectBlogRanks(keyword: string, display: number = 40) {
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

    // 2. 없으면 Naver API로 조회
    const { total, results } = await this.naverApiService.searchBlogsByKeyword(
      keyword,
      display,
    );

    // 3. KeywordDate 생성
    const keywordDate = await this.prisma.keywordDate.create({
      data: {
        keyword,
        dateStr: today,
        totalResults: total,
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
   * 블로그 및 순위 저장
   * @param keywordDateId - KeywordDate ID
   * @param results - 검색 결과
   */
  private async saveBlogsAndRanks(
    keywordDateId: number,
    results: BlogSearchResult[],
  ) {
    // 트랜잭션으로 일괄 처리 (요약 없이 content만 저장)
    await this.prisma.$transaction(async (tx) => {
      for (const result of results) {
        // Blog upsert (link를 unique key로 사용)
        // 수집 시점에는 요약하지 않고 content만 저장
        const blog = await tx.blog.upsert({
          where: { link: result.link },
          update: {
            // 기존 블로그 정보 업데이트 (summary는 유지)
            title: result.title,
            description: result.description,
            bloggerName: result.bloggerName,
            bloggerLink: result.bloggerLink,
            postDate: result.postDate,
            content: result.content || null,
            // summary는 업데이트하지 않음 (기존 값 유지)
            realUrl: result.realUrl,
            lastFetchedAt: new Date(),
          },
          create: {
            // 새 블로그 생성 (summary는 null)
            link: result.link,
            title: result.title,
            description: result.description,
            bloggerName: result.bloggerName,
            bloggerLink: result.bloggerLink,
            postDate: result.postDate,
            content: result.content || null,
            summary: null, // 수집 시점에는 요약하지 않음
            realUrl: result.realUrl,
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

        this.logger.debug(
          `Saved blog rank ${result.rank} for "${result.title}" (blog_id: ${blog.id})`,
        );
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
