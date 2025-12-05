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
import { PromptLogService } from '@lib/integrations/openai/prompt-log';
import { CreateBlogPostDto, FilterBlogPostDto } from './dto';
import { generateRandomPersona } from './random-persona.util';

@Injectable()
export class BlogPostService {
  private readonly logger = new Logger(BlogPostService.name);
  private readonly MAX_RETRY = 3; // 최대 재시도 횟수
  private readonly RETRY_DELAY = 2000; // 재시도 간격 (ms)
  private readonly BATCH_SIZE = 5; // 동시 생성할 원고 개수 (캐싱 효과 + Rate Limit 고려)

  // BloC 비용 정의 (원고당 고정 비용)
  private readonly CREDIT_COST_PER_POST = 5; // 원고 1개당 1 BloC

  constructor(
    private readonly prisma: PrismaService,
    private readonly openaiService: OpenAIService,
    private readonly blogRankService: BlogRankService,
    private readonly dateService: DateService,
    private readonly creditService: CreditService,
    private readonly promptLogService: PromptLogService,
  ) {}

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

    // 4. BlogPost 생성
    const blogPost = await this.prisma.blogPost.create({
      data: {
        userId,
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

    // 6. 백그라운드에서 원고 생성 시작 (비동기)
    this.generatePostsWithRetry(blogPost.id, dto.count, userId).catch(
      (error) => {
        this.logger.error(
          `Failed to generate posts for blogPost ${blogPost.id}:`,
          error.stack,
        );
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
   * 진행 상황 조회
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

    return {
      status: blogPost.status,
      completed: blogPost.completedCount,
      target: blogPost.targetCount,
      progress: (blogPost.completedCount / blogPost.targetCount) * 100,
      postsCreated: blogPost._count.posts,
    };
  }

  /**
   * 재시도 로직이 포함된 원고 생성 (준-배치 처리)
   * - BATCH_SIZE 단위로 병렬 처리하여 속도 향상
   * - 캐싱 효과 유지 및 Rate Limit 준수
   * - 실패 시 부분 환불 처리
   */
  private async generatePostsWithRetry(
    blogPostId: number,
    targetCount: number,
    userId: number,
  ) {
    let completedCount = 0;

    // BATCH_SIZE 단위로 배치 처리
    while (completedCount < targetCount) {
      const remainingCount = targetCount - completedCount;
      const currentBatchSize = Math.min(this.BATCH_SIZE, remainingCount);

      this.logger.log(
        `Starting batch generation: ${completedCount + 1}-${completedCount + currentBatchSize}/${targetCount} for blogPost ${blogPostId}`,
      );

      try {
        // BlogPost 정보 조회 (배치 전체에서 재사용)
        const blogPost = await this.prisma.blogPost.findUnique({
          where: { id: blogPostId },
        });

        if (!blogPost) {
          throw new Error(`BlogPost ${blogPostId} not found`);
        }

        // 상위 블로그 참조 조회 (배치 전체에서 재사용 - 캐싱 효과 극대화)
        const referenceContents = await this.fetchReferenceContents(
          blogPost.keyword,
        );

        // 배치 내 원고들을 병렬로 생성
        const batchPromises: Promise<void>[] = [];
        for (let i = 0; i < currentBatchSize; i++) {
          const postIndex = completedCount + i + 1;
          batchPromises.push(
            this.generateSinglePostWithRetry(
              blogPostId,
              postIndex,
              targetCount,
              blogPost,
              referenceContents, // 배치 내 모든 원고가 동일한 참조 사용
            ),
          );
        }

        // 배치 내 모든 원고 생성 완료 대기
        await Promise.all(batchPromises);

        // 배치 성공 시 카운트 업데이트
        completedCount += currentBatchSize;

        // BlogPost 진행 상황 업데이트
        await this.prisma.blogPost.update({
          where: { id: blogPostId },
          data: {
            completedCount,
            status:
              completedCount === targetCount ? 'COMPLETED' : 'IN_PROGRESS',
          },
        });

        this.logger.log(
          `Batch completed: ${completedCount}/${targetCount} posts for blogPost ${blogPostId}`,
        );

        // Rate Limit 방지를 위한 배치 간 짧은 대기 (마지막 배치 제외)
        if (completedCount < targetCount) {
          await this.sleep(1000); // 1초 대기
        }
      } catch (error) {
        // 배치 실패 시 (일부 성공 가능)
        // 실제 생성된 원고 개수 확인
        const actualCount = await this.prisma.aIPost.count({
          where: { blogPostId },
        });

        this.logger.error(
          `Batch generation failed for blogPost ${blogPostId}. Actual count: ${actualCount}/${targetCount}`,
          error.stack,
        );

        // 실패로 마킹
        await this.prisma.blogPost.update({
          where: { id: blogPostId },
          data: {
            status: 'FAILED',
            completedCount: actualCount,
          },
        });

        // 실패한 원고에 대한 BloC 환불 (원고당 1 BloC)
        if (actualCount < targetCount) {
          const failedCount = targetCount - actualCount;
          const refundAmount = failedCount * this.CREDIT_COST_PER_POST;

          if (refundAmount > 0) {
            try {
              await this.creditService.grantBonusCredits(
                userId,
                refundAmount,
                `원고 생성 실패 환불 (${failedCount}/${targetCount}개 실패, BlogPost ${blogPostId})`,
              );

              this.logger.log(
                `Refunded ${refundAmount} BloC to user ${userId} for ${failedCount} failed posts (blogPost ${blogPostId})`,
              );
            } catch (refundError) {
              this.logger.error(
                `Failed to refund ${refundAmount} BloC to user ${userId}`,
                refundError.stack,
              );
              // 환불 실패해도 원본 에러는 그대로 throw
            }
          }
        }

        throw error;
      }
    }
  }

  /**
   * 단일 원고 생성 (exponential backoff 재시도)
   * - 배치 처리 시 blogPost와 referenceContents를 재사용하여 DB 조회 최소화
   * - 랜덤 페르소나 모드에서는 각 원고마다 새로운 랜덤 페르소나 생성
   */
  private async generateSinglePostWithRetry(
    blogPostId: number,
    postIndex: number,
    totalCount: number,
    blogPost?: any, // 배치 처리 시 전달받음 (선택적)
    referenceContents?: string[], // 배치 처리 시 전달받음 (선택적)
  ): Promise<void> {
    let retryCount = 0;
    let lastError: Error | null = null;

    while (retryCount <= this.MAX_RETRY) {
      try {
        // blogPost가 전달되지 않은 경우에만 조회 (하위 호환성)
        const post =
          blogPost ||
          (await this.prisma.blogPost.findUnique({
            where: { id: blogPostId },
          }));

        if (!post) {
          throw new Error(`BlogPost ${blogPostId} not found`);
        }

        // 이미 생성된 원고들의 제목 조회 (중복 방지)
        const existingPosts = await this.prisma.aIPost.findMany({
          where: { blogPostId },
          select: { title: true },
        });

        const existingTitles: string[] = existingPosts
          .map((post) => post.title)
          .filter((title): title is string => !!title);

        // referenceContents가 전달되지 않은 경우에만 조회 (하위 호환성)
        const references =
          referenceContents ||
          (await this.fetchReferenceContents(post.keyword));

        // 랜덤 페르소나 모드인 경우 각 원고마다 새로운 랜덤 페르소나 생성
        const isRandomMode = post.persona?.isRandom === true;
        const actualPersona = isRandomMode
          ? generateRandomPersona()
          : post.persona;

        if (isRandomMode) {
          this.logger.log(
            `Generated random persona for post ${postIndex}/${totalCount}: ${actualPersona.occupation} (${actualPersona.age}세, ${actualPersona.gender})`,
          );
        }

        this.logger.log(
          `Generating post ${postIndex}/${totalCount} with diversity strategy (existing titles: ${existingTitles.length})`,
        );

        const startTime = Date.now();

        // LLM 호출 (다양성 전략 적용)
        const result = await this.openaiService.generatePost({
          keyword: post.keyword,
          postType: post.postType,
          persona: actualPersona, // 랜덤 모드면 새로 생성된 페르소나, 아니면 기존 페르소나
          subKeywords: post.subKeywords,
          length: post.length,
          additionalFields: post.additionalFields as Record<string, any>,
          referenceContents: references, // 상위 10개 블로그 컨텐츠 전달
          postIndex, // 현재 원고 번호 (다양성 확보)
          totalCount, // 전체 원고 개수
          existingTitles, // 이미 생성된 제목들 (중복 방지)
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
          // 파싱 실패 시 전체를 content로 저장
        }

        // 성공 시 AIPost 생성 (title과 content 분리 저장, 토큰 사용량 포함)
        const aiPost = await this.prisma.aIPost.create({
          data: {
            blogPostId,
            title,
            content,
            retryCount, // 몇 번 재시도 후 성공했는지 기록
            promptTokens: result.usage.promptTokens,
            completionTokens: result.usage.completionTokens,
            totalTokens: result.usage.totalTokens,
          },
        });

        // 프롬프트 로깅 (백그라운드 처리 - 실패해도 메인 로직에 영향 없음)
        if (result.prompts) {
          this.promptLogService
            .logPrompt({
              userId: post.userId,
              blogPostId,
              aiPostId: aiPost.id,
              systemPrompt: result.prompts.systemPrompt,
              userPrompt: result.prompts.userPrompt,
              fullPrompt: result.prompts.fullPrompt,
              model: 'gpt-4o', // generationModel 사용 (환경변수에서 가져옴)
              promptTokens: result.usage.promptTokens,
              completionTokens: result.usage.completionTokens,
              totalTokens: result.usage.totalTokens,
              response: result.content,
              responseTime,
              success: true,
              purpose: 'blog_generation',
              metadata: {
                keyword: post.keyword,
                postType: post.postType,
                length: post.length,
                postIndex,
                totalCount,
                retryCount,
              },
            })
            .catch((error) => {
              this.logger.warn(
                `Failed to log prompt for aiPost ${aiPost.id}: ${error.message}`,
              );
            });
        }

        this.logger.log(
          `Post generated successfully after ${retryCount} retries for blogPost ${blogPostId}`,
        );

        return; // 성공 시 종료
      } catch (error) {
        lastError = error;
        retryCount++;

        if (retryCount <= this.MAX_RETRY) {
          // Exponential backoff: 2초, 4초, 8초
          const delay = this.RETRY_DELAY * Math.pow(2, retryCount - 1);

          this.logger.warn(
            `Retry ${retryCount}/${this.MAX_RETRY} for blogPost ${blogPostId} after ${delay}ms. Error: ${error.message}`,
          );

          await this.sleep(delay);
        }
      }
    }

    // 모든 재시도 실패
    throw new Error(
      `Failed after ${this.MAX_RETRY} retries. Last error: ${lastError?.message}`,
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

      // summary가 이미 있고 작성 기법 분석 버전인지 확인
      // 작성 기법 분석 버전은 "글 구성:", "문체와 어조:" 등의 키워드를 포함
      if (blog.summary) {
        const isNewStyleSummary =
          blog.summary.includes('글 구성') ||
          blog.summary.includes('문체와 어조') ||
          blog.summary.includes('작성 기법');

        if (isNewStyleSummary) {
          // 이미 새로운 방식으로 생성된 summary 재사용
          referenceContents.push(blog.summary);
          continue;
        }
        // summary가 있지만 구버전이면 아래에서 재생성
      }

      // summary가 없거나 구버전이면 새로 생성
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
}
