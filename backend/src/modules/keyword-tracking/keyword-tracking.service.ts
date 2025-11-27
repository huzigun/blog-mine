import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@lib/database/prisma.service';
import {
  CreateKeywordTrackingDto,
  UpdateKeywordTrackingDto,
  QueryKeywordTrackingDto,
} from './dto';
import { DateService } from '@lib/date';
import { BlogRankService } from '@lib/integrations/naver/naver-api/blog-rank.service';
import { SubscriptionStatus } from '@prisma/client';

@Injectable()
export class KeywordTrackingService {
  private logger = new Logger(KeywordTrackingService.name);
  constructor(
    private prisma: PrismaService,
    private dateService: DateService,
    private blogRankService: BlogRankService,
  ) {}

  /**
   * 키워드 추적 생성
   * @param userId 사용자 ID
   * @param dto 생성 DTO
   * @returns 생성된 키워드 추적
   */
  async create(userId: number, dto: CreateKeywordTrackingDto) {
    const now = this.dateService.now().format('YYYY-MM-DD');
    const isExisting = await this.hasTrackingRecordOnDate(dto.keyword, now);

    if (!isExisting) {
      // 신규 키워드에 대해 오늘 날짜로 기본 기록 생성
      await this.blogRankService.collectBlogRanks(dto.keyword, 40);
    }

    // 중복 체크: 동일 사용자-키워드-블로그 조합
    const existing = await this.prisma.keywordTracking.findUnique({
      where: {
        userId_keyword_myBlogUrl: {
          userId,
          keyword: dto.keyword,
          myBlogUrl: dto.myBlogUrl,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        '이미 동일한 키워드와 블로그 URL로 추적 중입니다.',
      );
    }

    return this.prisma.keywordTracking.create({
      data: {
        userId,
        keyword: dto.keyword,
        myBlogUrl: dto.myBlogUrl,
        bloggerName: dto.bloggerName,
        title: dto.title,
        isActive: dto.isActive ?? true,
        displayCount: dto.displayCount ?? 40,
      },
    });
  }

  /**
   * 사용자의 모든 키워드 추적 조회 (페이지네이션 및 검색 지원)
   * @param userId 사용자 ID
   * @param query 쿼리 파라미터 (페이지, 검색어, 필터 등)
   * @returns 페이지네이션된 키워드 추적 목록
   */
  async findAll(userId: number, query: QueryKeywordTrackingDto) {
    const { page = 1, limit = 10, search, isActive } = query;
    const skip = (page - 1) * limit;

    // 검색 조건 구성
    const where = {
      userId,
      ...(isActive !== undefined && { isActive }),
      ...(search && {
        OR: [
          { keyword: { contains: search, mode: 'insensitive' as const } },
          { bloggerName: { contains: search, mode: 'insensitive' as const } },
          { myBlogUrl: { contains: search, mode: 'insensitive' as const } },
          { title: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    };

    // 데이터 조회 및 총 개수 조회를 병렬로 실행
    const [data, total] = await Promise.all([
      this.prisma.keywordTracking.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { isActive: 'desc' }, // 활성화된 것 먼저
          { createdAt: 'desc' }, // 최신순
        ],
      }),
      this.prisma.keywordTracking.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPreviousPage: page > 1,
      },
    };
  }

  /**
   * 특정 키워드 추적 조회
   * @param id 키워드 추적 ID
   * @param userId 사용자 ID
   * @returns 키워드 추적
   */
  async findOne(id: number, userId: number) {
    const tracking = await this.prisma.keywordTracking.findUnique({
      where: { id },
    });

    if (!tracking) {
      throw new NotFoundException('키워드 추적을 찾을 수 없습니다.');
    }

    // 본인 소유 확인
    if (tracking.userId !== userId) {
      throw new ForbiddenException('접근 권한이 없습니다.');
    }

    return tracking;
  }

  /**
   * 키워드 추적 수정
   * @param id 키워드 추적 ID
   * @param userId 사용자 ID
   * @param dto 수정 DTO
   * @returns 수정된 키워드 추적
   */
  async update(id: number, userId: number, dto: UpdateKeywordTrackingDto) {
    // 존재 여부 및 소유권 확인
    await this.findOne(id, userId);

    // 키워드나 블로그 URL 변경 시 중복 체크
    if (dto.keyword || dto.myBlogUrl) {
      const existing = await this.prisma.keywordTracking.findFirst({
        where: {
          id: { not: id },
          userId,
          keyword: dto.keyword,
          myBlogUrl: dto.myBlogUrl,
        },
      });

      if (existing) {
        throw new ConflictException(
          '이미 동일한 키워드와 블로그 URL로 추적 중입니다.',
        );
      }
    }

    return this.prisma.keywordTracking.update({
      where: { id },
      data: dto,
    });
  }

  /**
   * 키워드 추적 삭제
   * @param id 키워드 추적 ID
   * @param userId 사용자 ID
   */
  async remove(id: number, userId: number) {
    // 존재 여부 및 소유권 확인
    await this.findOne(id, userId);

    await this.prisma.keywordTracking.delete({
      where: { id },
    });

    return { message: '키워드 추적이 삭제되었습니다.' };
  }

  /**
   * 키워드 추적 활성화/비활성화 토글
   * @param id 키워드 추적 ID
   * @param userId 사용자 ID
   * @returns 수정된 키워드 추적
   */
  async toggleActive(id: number, userId: number, isActive: boolean) {
    const tracking = await this.findOne(id, userId);

    if (tracking.isActive === isActive) {
      return {
        newActive: tracking.isActive,
      };
    }
    await this.prisma.keywordTracking.update({
      where: { id },
      data: { isActive },
    });

    return {
      newActive: isActive,
    };
  }

  /**
   * 활성화된 모든 키워드 추적 조회 (스케줄러용)
   * @returns 활성화된 키워드 추적 목록
   */
  async findAllActive() {
    return this.prisma.keywordTracking.findMany({
      where: { isActive: true },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: { lastCollectedAt: 'asc' }, // 수집 안 된 것 우선
    });
  }

  /**
   * 마지막 수집 시간 업데이트
   * @param id 키워드 추적 ID
   */
  async updateLastCollectedAt(id: number) {
    return this.prisma.keywordTracking.update({
      where: { id },
      data: { lastCollectedAt: new Date() },
    });
  }

  /**
   * 사용자의 블로그 추적 제한 및 현재 사용량 조회
   * @param userId 사용자 ID
   * @returns 추적 제한, 현재 사용량, 활성 구독 정보
   */
  async getTrackingLimitStatus(userId: number) {
    // 1. 사용자 존재 확인 (최소 컬럼만 조회)
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    // 2. 활성화된 구독 조회 (필요한 컬럼만 선택)
    const activeSubscription = await this.prisma.userSubscription.findFirst({
      where: {
        userId,
        status: {
          in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL],
        },
        expiresAt: { gte: new Date() }, // 만료되지 않은 구독만
      },
      select: {
        id: true,
        planId: true,
        status: true,
        expiresAt: true,
        plan: {
          select: {
            id: true,
            name: true,
            displayName: true,
            maxKeywordTrackings: true, // 키워드 추적 제한
          },
        },
      },
      orderBy: { createdAt: 'desc' }, // 최신 구독 우선
    });

    if (!activeSubscription) {
      throw new NotFoundException(
        '활성화된 구독을 찾을 수 없습니다. 구독 플랜을 확인해주세요.',
      );
    }

    // 3. 현재 추적 중인 블로그 개수 조회
    const currentTrackingCount = await this.prisma.keywordTracking.count({
      where: { userId },
    });

    // 4. 제한 및 사용량 정보 반환
    const maxTrackings = activeSubscription.plan.maxKeywordTrackings;
    const hasLimit = maxTrackings !== null;
    const canAddMore = !hasLimit || currentTrackingCount < maxTrackings;

    return {
      subscription: {
        id: activeSubscription.id,
        planId: activeSubscription.planId,
        planName: activeSubscription.plan.name,
        planDisplayName: activeSubscription.plan.displayName,
        status: activeSubscription.status,
        expiresAt: activeSubscription.expiresAt,
      },
      trackingLimit: {
        max: maxTrackings, // null이면 무제한
        current: currentTrackingCount,
        remaining: hasLimit ? maxTrackings - currentTrackingCount : null, // null이면 무제한
        hasLimit,
        canAddMore,
        isLimitReached: hasLimit && currentTrackingCount >= maxTrackings,
      },
    };
  }

  /**
   * 특정 키워드가 특정 날짜에 순위 추적한 기록이 있는지 확인
   * @param keyword 키워드
   * @param date 날짜 (YYYY-MM-DD)
   * @returns 존재 여부 (있음: true, 없음: false)
   */
  async hasTrackingRecordOnDate(keyword: string, date: string) {
    const keywordDateId = await this.prisma.keywordDate.findFirst({
      where: {
        keyword,
        dateStr: date,
      },
      select: {
        id: true,
      },
    });

    return keywordDateId !== null;
  }

  /**
   * 키워드 추적의 블로그 순위 히스토리 조회
   * @param id 키워드 추적 ID
   * @param userId 사용자 ID
   * @returns 순위 히스토리 및 블로그 정보
   */
  async findBlogRanks(id: number, userId: number) {
    // 1. 키워드 추적 조회 (소유권 확인)
    const tracking = await this.findOne(id, userId);

    // 2. myBlogUrl과 일치하는 Blog 찾기
    const blog = await this.prisma.blog.findUnique({
      where: {
        link: tracking.myBlogUrl,
      },
      select: {
        id: true,
        link: true,
        title: true,
        bloggerName: true,
        bloggerLink: true,
      },
    });

    // 3. Blog가 없으면 순위 데이터도 없음
    if (!blog) {
      return {
        trackingId: tracking.id,
        keyword: tracking.keyword,
        myBlogUrl: tracking.myBlogUrl,
        blog: null,
        rankHistory: [],
        latestRank: null,
        rankChange: null,
      };
    }

    // 4. 최근 일주일 날짜 문자열 생성 (Asia/Seoul 타임존 기준, 최신순)
    const today = this.dateService.now();
    const last7Days: string[] = [];
    for (let i = 0; i <= 6; i++) {
      const date = this.dateService.subtract(today, i, 'day');
      last7Days.push(date.format('YYYY-MM-DD'));
    }

    // 5. 해당 블로그의 순위 히스토리 조회 (해당 키워드만, 최근 일주일)
    const rankHistory = await this.prisma.blogRank.findMany({
      where: {
        blogId: blog.id,
        keywordDate: {
          keyword: tracking.keyword,
          dateStr: {
            in: last7Days, // 최근 7일 날짜 문자열로 조회
          },
        },
      },
      include: {
        keywordDate: {
          select: {
            dateStr: true,
          },
        },
      },
      orderBy: [
        { keywordDate: { dateStr: 'desc' } }, // 최신 날짜 순
        { createdAt: 'desc' },
      ],
    });

    // 6. 날짜별 순위 맵 생성
    const rankMap = new Map<string, number>();
    rankHistory.forEach((rank) => {
      const dateStr = rank.keywordDate.dateStr;
      // 같은 날짜에 여러 순위가 있을 경우 첫 번째 것만 사용
      if (!rankMap.has(dateStr)) {
        rankMap.set(dateStr, rank.rank);
      }
    });

    // 7. 최근 7일 전체 날짜에 대해 순위 데이터 생성 (빈 날짜는 null)
    const formattedHistory = last7Days.map((dateStr) => ({
      dateStr,
      rank: rankMap.get(dateStr) || null,
    }));

    // 8. 순위 변동 계산 (실제 순위가 있는 데이터만 사용)
    let latestRank: number | null = null;
    let rankChange: number | null = null;

    const ranksWithData = formattedHistory.filter((item) => item.rank !== null);
    if (ranksWithData.length > 0) {
      latestRank = ranksWithData[0].rank;

      if (ranksWithData.length > 1) {
        const previousRank = ranksWithData[1].rank;
        // 순위가 낮아지면 음수 (하락), 높아지면 양수 (상승)
        rankChange = previousRank! - latestRank!;
      }
    }

    return {
      trackingId: tracking.id,
      keyword: tracking.keyword,
      myBlogUrl: tracking.myBlogUrl,
      blog: {
        id: blog.id,
        link: blog.link,
        title: blog.title,
        bloggerName: blog.bloggerName,
        bloggerLink: blog.bloggerLink,
      },
      rankHistory: formattedHistory,
      latestRank,
      rankChange,
    };
  }
}
