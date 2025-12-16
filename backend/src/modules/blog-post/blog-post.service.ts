import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../lib/database/prisma.service';
import { OpenAIService } from '../../lib/integrations/openai/openai/openai.service';
import { BlogRankService } from '../../lib/integrations/naver/naver-api/blog-rank.service';
import { DateService } from '../../lib/date/date.service';
import { CreditService } from '@modules/credit/credit.service';
import { NotificationService } from '@modules/notification/notification.service';
import { PromptLogService } from '@lib/integrations/openai/prompt-log';
import { CreateBlogPostDto, FilterBlogPostDto } from './dto';
import { generateRandomPersona } from './random-persona.util';
import { getDatePrefix, generateDisplayId } from './display-id.util';

@Injectable()
export class BlogPostService {
  private readonly logger = new Logger(BlogPostService.name);
  private readonly MAX_RETRY = 3; // 최대 재시도 횟수
  private readonly RETRY_DELAY = 2000; // 재시도 간격 (ms)
  private readonly BATCH_SIZE = 1; // 순차 생성 (메모리 안정성 확보, 4GB 인스턴스 OOM 방지)
  private readonly SINGLE_POST_TIMEOUT = 180000; // 단일 원고 생성 타임아웃 (3분, OpenAI 응답 시간 고려)
  private readonly TOTAL_TIMEOUT = 1200000; // 전체 프로세스 타임아웃 (20분, 순차 처리 고려)

  // BloC 비용 정의 (원고당 고정 비용)
  private readonly CREDIT_COST_PER_POST = 5; // 원고 1개당 1 BloC

  constructor(
    private readonly prisma: PrismaService,
    private readonly openaiService: OpenAIService,
    private readonly blogRankService: BlogRankService,
    private readonly dateService: DateService,
    private readonly creditService: CreditService,
    private readonly notificationService: NotificationService,
    private readonly promptLogService: PromptLogService,
  ) {}

  /**
   * 해당 날짜의 다음 displayId 생성
   * @param datePrefix - YYYYMMDD 형식 날짜 문자열
   * @returns 새로운 displayId
   */
  private async generateNextDisplayId(datePrefix: string): Promise<string> {
    // 해당 날짜로 시작하는 가장 마지막 displayId 조회
    const lastPost = await this.prisma.blogPost.findFirst({
      where: {
        displayId: {
          startsWith: datePrefix,
        },
      },
      orderBy: {
        displayId: 'desc',
      },
      select: {
        displayId: true,
      },
    });

    let sequence = 0;

    if (lastPost) {
      const lastShortCode = lastPost.displayId.substring(8);

      // Base36 3자리인 경우 (예: 000, 00A, ZZZ)
      if (lastShortCode.length === 3 && /^[0-9A-Z]{3}$/.test(lastShortCode)) {
        // Base36 디코딩
        const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const d2 = chars.indexOf(lastShortCode[0]);
        const d1 = chars.indexOf(lastShortCode[1]);
        const d0 = chars.indexOf(lastShortCode[2]);
        sequence = d2 * 36 * 36 + d1 * 36 + d0 + 1;
      } else {
        // 숫자 확장 형태인 경우 (예: 46656, 46657)
        sequence = parseInt(lastShortCode, 10) + 1;
      }
    }

    return generateDisplayId(datePrefix, sequence);
  }

  /**
   * 블로그 원고 생성 요청 생성
   */
  async create(userId: number, dto: CreateBlogPostDto) {
    let personaSnapshot: any;

    // 1. 페르소나 처리 (DB 조회 또는 랜덤 플래그 설정)
    if (dto.personaId) {
      // 기존 페르소나 ID 사용
      const persona = await this.prisma.persona.findFirst({
        where: {
          id: dto.personaId,
          userId, // 본인의 페르소나만 사용 가능
        },
      });

      if (!persona) {
        throw new NotFoundException(
          `Persona with id ${dto.personaId} not found or access denied`,
        );
      }

      // 페르소나 스냅샷 생성
      personaSnapshot = {
        gender: persona.gender,
        age: persona.age,
        isMarried: persona.isMarried,
        hasChildren: persona.hasChildren,
        occupation: persona.occupation,
        blogStyle: persona.blogStyle,
        blogTone: persona.blogTone,
        additionalInfo: persona.additionalInfo,
        isRandom: false,
      };
    } else if (dto.useRandomPersona) {
      // 랜덤 페르소나 플래그 설정 (실제 생성은 각 원고마다)
      // 플레이스홀더 스냅샷 (실제로는 사용되지 않음)
      personaSnapshot = {
        isRandom: true,
      };

      this.logger.log(
        `Random persona generation enabled - each post will get unique persona`,
      );
    } else {
      throw new BadRequestException(
        'personaId 또는 useRandomPersona 중 하나는 필수입니다.',
      );
    }

    // 2. 필요한 BloC 계산 (원고 개수만으로 계산)
    const totalCost = this.CREDIT_COST_PER_POST * dto.count;

    this.logger.log(
      `Credit cost: ${this.CREDIT_COST_PER_POST} BloC per post × ${dto.count} posts = ${totalCost} BloC`,
    );

    // 3. BloC 잔액 확인
    const balance = await this.creditService.getBalance(userId);
    if (balance.totalCredits < totalCost) {
      throw new BadRequestException(
        `BloC이 부족합니다. (필요: ${totalCost} BloC, 보유: ${balance.totalCredits} BloC)`,
      );
    }

    // 4. 키워드로 오늘 날짜 블로그 순위 수집 (없으면 수집)
    this.logger.log(
      `Collecting blog ranks for keyword: "${dto.keyword}" before generating posts`,
    );
    await this.blogRankService.collectBlogRanks(dto.keyword, 40);

    // 5. displayId 생성 (YYYYMMDD + Base36 단축코드)
    const datePrefix = getDatePrefix();
    const displayId = await this.generateNextDisplayId(datePrefix);

    // 6. BlogPost 생성
    const blogPost = await this.prisma.blogPost.create({
      data: {
        userId,
        displayId,
        keyword: dto.keyword,
        postType: dto.postType,
        subKeywords: dto.subKeywords || [],
        length: dto.length,
        count: dto.count,
        targetCount: dto.count,
        additionalFields: dto.additionalFields || {},
        status: 'IN_PROGRESS',
        persona: personaSnapshot,
        // creditCost: totalCost, // TODO: 추가 예정 (Prisma migration 필요)
      },
    });

    this.logger.log(
      `Created blog post request ${blogPost.id} for user ${userId}`,
    );

    // 5. BloC 차감 (즉시 차감)
    try {
      await this.creditService.useCredits(
        userId,
        totalCost,
        'blog_post', // referenceType
        blogPost.id, // referenceId
        JSON.stringify({
          keyword: dto.keyword,
          count: dto.count,
          costPerPost: this.CREDIT_COST_PER_POST,
        }),
      );

      this.logger.log(
        `Charged ${totalCost} BloC for user ${userId} (blogPost ${blogPost.id})`,
      );
    } catch (error) {
      // BloC 차감 실패 시 BlogPost 삭제
      await this.prisma.blogPost.delete({ where: { id: blogPost.id } });
      throw error;
    }

    // 6. 시작 시간 기록
    await this.prisma.blogPost.update({
      where: { id: blogPost.id },
      data: { startedAt: new Date() },
    });

    // 7. 백그라운드에서 원고 생성 시작 (비동기, 에러 핸들링 강화)
    this.generatePostsWithRetry(blogPost.id, dto.count, userId).catch(
      async (error) => {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        this.logger.error(
          `Failed to generate posts for blogPost ${blogPost.id}: ${errorMessage}`,
          error.stack,
        );

        // 실제 생성된 원고 개수 확인
        const actualCount = await this.prisma.aIPost.count({
          where: { blogPostId: blogPost.id },
        });

        // 에러 발생 시 상태 업데이트 (FAILED로 마킹)
        try {
          await this.prisma.blogPost.update({
            where: { id: blogPost.id },
            data: {
              status: 'FAILED',
              completedCount: actualCount,
              lastError: errorMessage.substring(0, 500), // 에러 메시지 저장 (최대 500자)
              errorAt: new Date(),
            },
          });
          this.logger.log(
            `BlogPost ${blogPost.id} marked as FAILED due to: ${errorMessage}`,
          );
        } catch (updateError) {
          this.logger.error(
            `Failed to update blogPost ${blogPost.id} status to FAILED`,
            updateError,
          );
        }

        // 실패한 원고에 대한 BloC 환불
        const failedCount = dto.count - actualCount;
        if (failedCount > 0) {
          const refundAmount = failedCount * this.CREDIT_COST_PER_POST;
          try {
            await this.creditService.grantBonusCredits(
              userId,
              refundAmount,
              `원고 생성 실패 환불 (${failedCount}/${dto.count}개 실패, BlogPost ${blogPost.id})`,
            );
            this.logger.log(
              `Refunded ${refundAmount} BloC to user ${userId} for ${failedCount} failed posts (blogPost ${blogPost.id})`,
            );
          } catch (refundError) {
            this.logger.error(
              `Failed to refund ${refundAmount} BloC to user ${userId}`,
              refundError,
            );
          }
        }
      },
    );

    return blogPost;
  }

  /**
   * 사용자의 블로그 원고 요청 목록 조회 (필터링 지원)
   */
  async findAll(userId: number, filterDto: FilterBlogPostDto) {
    const {
      page = 1,
      limit = 10,
      startDate,
      endDate,
      postType,
      keyword,
    } = filterDto;
    const skip = (page - 1) * limit;

    // 동적 where 조건 생성
    const where: any = { userId };

    // 날짜 필터 (검색 기간)
    // DateService를 사용하여 로컬 날짜를 UTC 범위로 변환
    if (startDate || endDate) {
      const dateRange = this.dateService.getDateRangeForQuery(
        startDate,
        endDate,
      );
      where.createdAt = {};
      if (dateRange.start) {
        where.createdAt.gte = dateRange.start;
      }
      if (dateRange.end) {
        where.createdAt.lte = dateRange.end;
      }
    }

    // postType 필터
    if (postType) {
      where.postType = postType;
    }

    // 키워드 검색 (부분 일치)
    if (keyword) {
      where.keyword = {
        contains: keyword,
        mode: 'insensitive', // 대소문자 구분 없음
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.blogPost.findMany({
        where,
        include: {
          _count: {
            select: { posts: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.blogPost.count({
        where,
      }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPreviousPage: page > 1,
      },
    };
  }

  /**
   * 특정 블로그 원고 요청 조회 (생성된 원고 포함)
   */
  async findOne(id: number, userId: number) {
    const blogPost = await this.prisma.blogPost.findFirst({
      where: {
        id,
        userId,
      },
      include: {
        posts: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!blogPost) {
      throw new NotFoundException(`BlogPost with id ${id} not found`);
    }

    return blogPost;
  }

  /**
   * 진행 상황 조회 (에러 정보 포함)
   */
  async getProgress(id: number, userId: number) {
    const blogPost = await this.prisma.blogPost.findFirst({
      where: {
        id,
        userId,
      },
      include: {
        _count: {
          select: { posts: true },
        },
      },
    });

    if (!blogPost) {
      throw new NotFoundException(`BlogPost with id ${id} not found`);
    }

    // 실행 시간 계산 (진행 중이면 현재까지, 완료/실패면 총 소요 시간)
    let elapsedTime: number | null = null;
    if (blogPost.startedAt) {
      const endTime = blogPost.completedAt || blogPost.errorAt || new Date();
      elapsedTime = Math.floor(
        (endTime.getTime() - blogPost.startedAt.getTime()) / 1000,
      ); // 초 단위
    }

    return {
      status: blogPost.status,
      completed: blogPost.completedCount,
      target: blogPost.targetCount,
      progress: Math.round(
        (blogPost.completedCount / blogPost.targetCount) * 100,
      ),
      postsCreated: blogPost._count.posts,
      // 시간 정보
      startedAt: blogPost.startedAt,
      completedAt: blogPost.completedAt,
      elapsedTime, // 초 단위
      // 에러 정보 (실패 시에만)
      ...(blogPost.status === 'FAILED' && {
        error: {
          message: blogPost.lastError,
          occurredAt: blogPost.errorAt,
        },
      }),
    };
  }

  /**
   * 재시도 로직이 포함된 원고 생성
   * - 전체 원고 생성 시도 후 실패한 것만 재시도 (최대 3회)
   * - BATCH_SIZE 단위로 병렬 처리
   * - 최종 실패 시 환불 처리
   */
  private async generatePostsWithRetry(
    blogPostId: number,
    targetCount: number,
    userId: number,
  ) {
    const startTime = Date.now();

    // BlogPost 정보 조회
    const blogPost = await this.prisma.blogPost.findUnique({
      where: { id: blogPostId },
    });

    if (!blogPost) {
      throw new Error(`BlogPost ${blogPostId} not found`);
    }

    // 상위 블로그 참조 조회 (전체 프로세스에서 재사용)
    const referenceContents = await this.fetchReferenceContents(
      blogPost.keyword,
    );

    // 생성할 원고 인덱스 목록 (1부터 시작)
    let pendingIndices = Array.from({ length: targetCount }, (_, i) => i + 1);
    let lastError: string | null = null;

    // 최대 3번 시도 (1차 시도 + 2번 재시도)
    for (let attempt = 1; attempt <= this.MAX_RETRY; attempt++) {
      // 전체 타임아웃 체크
      if (Date.now() - startTime > this.TOTAL_TIMEOUT) {
        throw new Error(
          `전체 프로세스 타임아웃 (${this.TOTAL_TIMEOUT / 60000}분 초과)`,
        );
      }

      if (pendingIndices.length === 0) break;

      this.logger.log(
        `[시도 ${attempt}/${this.MAX_RETRY}] ${pendingIndices.length}개 원고 생성 시작 (blogPost ${blogPostId})`,
      );

      // 이번 시도에서 실패한 인덱스 수집
      const failedIndices: number[] = [];

      // BATCH_SIZE 단위로 나눠서 처리
      for (let i = 0; i < pendingIndices.length; i += this.BATCH_SIZE) {
        // 전체 타임아웃 체크
        if (Date.now() - startTime > this.TOTAL_TIMEOUT) {
          throw new Error(
            `전체 프로세스 타임아웃 (${this.TOTAL_TIMEOUT / 60000}분 초과)`,
          );
        }

        const batchIndices = pendingIndices.slice(i, i + this.BATCH_SIZE);

        this.logger.log(
          `[시도 ${attempt}] 배치 처리: ${batchIndices.join(', ')} (blogPost ${blogPostId})`,
        );

        // 배치 내 원고들을 병렬로 생성 (각 원고 결과 개별 수집)
        const results = await Promise.allSettled(
          batchIndices.map((postIndex) =>
            this.withTimeout(
              this.generateSinglePost(
                blogPostId,
                postIndex,
                targetCount,
                blogPost,
                referenceContents,
              ),
              this.SINGLE_POST_TIMEOUT,
              `원고 ${postIndex}/${targetCount} 생성 타임아웃 (${this.SINGLE_POST_TIMEOUT / 1000}초 초과)`,
            ),
          ),
        );

        // 결과 분석: 실패한 인덱스 수집
        results.forEach((result, idx) => {
          const postIndex = batchIndices[idx];
          if (result.status === 'rejected') {
            failedIndices.push(postIndex);
            lastError = result.reason?.message || String(result.reason);
            this.logger.warn(
              `[시도 ${attempt}] 원고 ${postIndex} 생성 실패: ${lastError}`,
            );
          }
        });

        // 현재까지 생성된 원고 수 업데이트
        const actualCount = await this.prisma.aIPost.count({
          where: { blogPostId },
        });

        await this.prisma.blogPost.update({
          where: { id: blogPostId },
          data: {
            completedCount: actualCount,
            status: 'IN_PROGRESS',
          },
        });

        // Rate Limit 방지를 위한 배치 간 대기
        if (i + this.BATCH_SIZE < pendingIndices.length) {
          await this.sleep(1000);
        }
      }

      // 다음 시도에서 처리할 인덱스 = 이번에 실패한 인덱스
      pendingIndices = failedIndices;

      if (pendingIndices.length === 0) {
        this.logger.log(
          `[시도 ${attempt}] 모든 원고 생성 완료 (blogPost ${blogPostId})`,
        );
        break;
      }

      // 재시도 전 대기 (exponential backoff)
      if (attempt < this.MAX_RETRY) {
        const delay = this.RETRY_DELAY * Math.pow(2, attempt - 1);
        this.logger.log(
          `[시도 ${attempt}] ${pendingIndices.length}개 실패. ${delay / 1000}초 후 재시도...`,
        );
        await this.sleep(delay);
      }
    }

    // 최종 결과 확인
    const finalCount = await this.prisma.aIPost.count({
      where: { blogPostId },
    });

    if (finalCount === targetCount) {
      // 모든 원고 생성 성공
      const updatedBlogPost = await this.prisma.blogPost.update({
        where: { id: blogPostId },
        data: {
          status: 'COMPLETED',
          completedCount: finalCount,
          completedAt: new Date(),
        },
      });
      this.logger.log(
        `BlogPost ${blogPostId} 완료: ${finalCount}/${targetCount}개 생성`,
      );

      // 원고 생성 완료 알림 발송
      try {
        await this.notificationService.sendBlogPostCompleted(
          userId,
          blogPostId,
          updatedBlogPost.displayId,
        );
      } catch (notifyError) {
        this.logger.error(
          `Failed to send completion notification for BlogPost ${blogPostId}`,
          notifyError,
        );
      }
    } else {
      // 일부 또는 전체 실패
      const failedCount = targetCount - finalCount;
      const errorMessage = `${this.MAX_RETRY}회 시도 후 ${failedCount}개 실패`;

      const failedBlogPost = await this.prisma.blogPost.update({
        where: { id: blogPostId },
        data: {
          status: 'FAILED',
          completedCount: finalCount,
          lastError: `${errorMessage}. 마지막 에러: ${lastError ? String(lastError).substring(0, 400) : '알 수 없음'}`,
          errorAt: new Date(),
        },
      });

      // 실패한 원고에 대한 BloC 환불
      const refundAmount = failedCount * this.CREDIT_COST_PER_POST;
      if (refundAmount > 0) {
        try {
          await this.creditService.grantBonusCredits(
            userId,
            refundAmount,
            `원고 생성 실패 환불 (${failedCount}/${targetCount}개 실패, ${this.MAX_RETRY}회 시도, BlogPost ${blogPostId})`,
          );
          this.logger.log(
            `Refunded ${refundAmount} BloC to user ${userId} for ${failedCount} failed posts`,
          );
        } catch (refundError) {
          this.logger.error(
            `Failed to refund ${refundAmount} BloC to user ${userId}`,
            refundError,
          );
        }
      }

      // 원고 생성 실패 알림 발송
      try {
        await this.notificationService.sendBlogPostFailed(
          userId,
          blogPostId,
          failedBlogPost.displayId,
          errorMessage,
        );
      } catch (notifyError) {
        this.logger.error(
          `Failed to send failure notification for BlogPost ${blogPostId}`,
          notifyError,
        );
      }

      throw new Error(
        `${this.MAX_RETRY}회 시도 후 ${failedCount}/${targetCount}개 원고 생성 실패`,
      );
    }
  }

  /**
   * 단일 원고 생성 (재시도 없이 1회 시도)
   */
  private async generateSinglePost(
    blogPostId: number,
    postIndex: number,
    totalCount: number,
    blogPost: any,
    referenceContents: string[],
  ): Promise<void> {
    // 이미 생성된 원고인지 확인 (중복 방지)
    const existingPost = await this.prisma.aIPost.findFirst({
      where: {
        blogPostId,
        // postIndex 필드가 없으므로 생성된 원고 수로 체크
      },
      select: { id: true },
    });

    // 이미 해당 인덱스의 원고가 있으면 스킵
    const currentCount = await this.prisma.aIPost.count({
      where: { blogPostId },
    });
    if (currentCount >= postIndex) {
      this.logger.log(`원고 ${postIndex} 이미 존재, 스킵`);
      return;
    }

    // 이미 생성된 원고들의 제목 조회 (중복 방지)
    const existingPosts = await this.prisma.aIPost.findMany({
      where: { blogPostId },
      select: { title: true },
    });

    const existingTitles: string[] = existingPosts
      .map((post) => post.title)
      .filter((title): title is string => !!title);

    // 랜덤 페르소나 모드인 경우 각 원고마다 새로운 랜덤 페르소나 생성
    const isRandomMode = blogPost.persona?.isRandom === true;
    const actualPersona = isRandomMode
      ? generateRandomPersona()
      : blogPost.persona;

    if (isRandomMode) {
      this.logger.log(
        `Generated random persona for post ${postIndex}/${totalCount}: ${actualPersona.occupation} (${actualPersona.age}세, ${actualPersona.gender})`,
      );
    }

    const startTime = Date.now();

    // LLM 호출
    const result = await this.openaiService.generatePost({
      keyword: blogPost.keyword,
      postType: blogPost.postType,
      persona: actualPersona,
      subKeywords: blogPost.subKeywords,
      length: blogPost.length,
      additionalFields: blogPost.additionalFields as Record<string, any>,
      referenceContents,
      postIndex,
      totalCount,
      existingTitles,
    });

    const responseTime = Date.now() - startTime;

    // JSON 파싱 (title과 content 분리)
    let title: string | null = null;
    let content: string = result.content;

    try {
      const parsed = JSON.parse(result.content) as {
        title?: string;
        content?: string;
      };
      title = parsed.title || null;
      content = parsed.content || result.content;
    } catch {
      this.logger.warn(
        `Failed to parse JSON response for blogPost ${blogPostId}, storing as-is`,
      );
    }

    // AIPost 생성
    const aiPost = await this.prisma.aIPost.create({
      data: {
        blogPostId,
        title,
        content,
        retryCount: 0,
        promptTokens: result.usage.promptTokens,
        completionTokens: result.usage.completionTokens,
        totalTokens: result.usage.totalTokens,
      },
    });

    // 프롬프트 로깅
    if (result.prompts) {
      this.promptLogService
        .logPrompt({
          userId: blogPost.userId,
          blogPostId,
          aiPostId: aiPost.id,
          systemPrompt: result.prompts.systemPrompt,
          userPrompt: result.prompts.userPrompt,
          fullPrompt: result.prompts.fullPrompt,
          model: 'gpt-4o',
          promptTokens: result.usage.promptTokens,
          completionTokens: result.usage.completionTokens,
          totalTokens: result.usage.totalTokens,
          response: result.content,
          responseTime,
          success: true,
          purpose: 'blog_generation',
          metadata: {
            keyword: blogPost.keyword,
            postType: blogPost.postType,
            length: blogPost.length,
            postIndex,
            totalCount,
          },
        })
        .catch((error) => {
          this.logger.warn(
            `Failed to log prompt for aiPost ${aiPost.id}: ${error.message}`,
          );
        });
    }

    this.logger.log(
      `원고 ${postIndex}/${totalCount} 생성 완료 (blogPost ${blogPostId})`,
    );
  }

  /**
   * 상위 블로그 참조 컨텐츠 조회 및 요약 생성
   * - 배치 처리 시 한 번만 호출되어 DB 조회 및 요약 생성 최소화
   */
  private async fetchReferenceContents(keyword: string): Promise<string[]> {
    // 오늘 날짜의 상위 10개 블로그 컨텐츠 조회
    const today = this.dateService.getTodayDateStr();
    const topBlogs = await this.prisma.blogRank.findMany({
      where: {
        keywordDate: {
          keyword,
          dateStr: today,
        },
      },
      include: {
        blog: true,
      },
      orderBy: {
        rank: 'asc',
      },
      take: 10,
    });

    // 상위 10개 블로그 중 summary가 없는 것만 요약 생성
    const referenceContents: string[] = [];

    for (const blogRank of topBlogs) {
      const blog = blogRank.blog;

      // summary가 있으면 바로 재사용 (토큰 절약)
      if (blog.summary) {
        referenceContents.push(blog.summary);
        continue;
      }

      // summary가 없으면 새로 생성
      if (blog.content && blog.content.length > 200) {
        try {
          this.logger.debug(
            `Generating summary for top-ranked blog: ${blog.title.substring(0, 30)}...`,
          );

          const summary = await this.openaiService.summarizeContent(
            blog.content,
            keyword,
          );

          // DB에 summary 저장
          await this.prisma.blog.update({
            where: { id: blog.id },
            data: { summary },
          });

          // 생성된 전체 요약 사용 (400-600자, 작성 기법 분석 결과)
          referenceContents.push(summary);

          this.logger.debug(`Summary generated and saved for blog ${blog.id}`);
        } catch (error) {
          this.logger.warn(
            `Failed to generate summary for blog ${blog.id}: ${error.message}`,
          );
          // 요약 실패 시 원본 앞부분 사용 (문장 단위로 최대 600자)
          referenceContents.push(this.truncateAtSentence(blog.content, 600));
        }
      } else if (blog.content) {
        // content가 짧으면 그대로 사용 (문장 단위로 최대 600자)
        referenceContents.push(this.truncateAtSentence(blog.content, 600));
      }
    }

    this.logger.debug(
      `Prepared ${referenceContents.length} reference contents for keyword: ${keyword}`,
    );

    return referenceContents;
  }

  /**
   * 문장 단위로 텍스트를 자르기
   * 마지막 완전한 문장까지만 포함하여 중간 단절 방지
   * @param text - 원본 텍스트
   * @param maxLength - 최대 길이
   * @returns 문장 단위로 잘린 텍스트
   */
  private truncateAtSentence(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text;
    }

    let truncated = text.substring(0, maxLength);

    // 마지막 완전한 문장 찾기
    const lastPeriod = truncated.lastIndexOf('.');
    const lastExclamation = truncated.lastIndexOf('!');
    const lastQuestion = truncated.lastIndexOf('?');

    const lastSentenceEnd = Math.max(lastPeriod, lastExclamation, lastQuestion);

    // 최소 길이 보장 (maxLength의 60% 이상)
    const minLength = Math.floor(maxLength * 0.6);
    if (lastSentenceEnd > minLength) {
      truncated = truncated.substring(0, lastSentenceEnd + 1);
    }

    return truncated.trim();
  }

  /**
   * 지연 함수
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 타임아웃이 적용된 Promise 래퍼
   * @param promise - 원본 Promise
   * @param ms - 타임아웃 (밀리초)
   * @param errorMessage - 타임아웃 발생 시 에러 메시지
   */
  private withTimeout<T>(
    promise: Promise<T>,
    ms: number,
    errorMessage: string,
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(errorMessage)), ms),
      ),
    ]);
  }
}
