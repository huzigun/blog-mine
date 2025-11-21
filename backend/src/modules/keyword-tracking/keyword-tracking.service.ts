import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '@lib/database/prisma.service';
import {
  CreateKeywordTrackingDto,
  UpdateKeywordTrackingDto,
  QueryKeywordTrackingDto,
} from './dto';

@Injectable()
export class KeywordTrackingService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 키워드 추적 생성
   * @param userId 사용자 ID
   * @param dto 생성 DTO
   * @returns 생성된 키워드 추적
   */
  async create(userId: number, dto: CreateKeywordTrackingDto) {
    console.log('Creating keyword tracking with DTO:', dto);
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
}
