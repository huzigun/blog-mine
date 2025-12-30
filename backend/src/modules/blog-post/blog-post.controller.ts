import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { BlogPostService } from './blog-post.service';
import { DeployService } from './deploy.service';
import { S3UploadInterceptor } from './interceptors';
import { CreateBlogPostDto, FilterBlogPostDto, DeployOrderDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { HelloDmService } from '@lib/integrations/hello-dm/hello-dm.service';
import { ActiveSubscriptionGuard } from '../subscription/guards/active-subscription.guard';
import { GetRequestUser } from '../auth/decorators/request-user.decorator';
import { RequestUser } from '../auth/strategies/jwt.strategy';
import { SearchAdService } from '@lib/integrations/naver/naver-api/search.ad.service';

@Controller('blog-posts')
@UseGuards(JwtAuthGuard)
export class BlogPostController {
  private readonly logger = new Logger(BlogPostController.name);

  constructor(
    private readonly blogPostService: BlogPostService,
    private readonly deployService: DeployService,
    private readonly searchAdService: SearchAdService,
    private readonly helloDmService: HelloDmService,
  ) {}

  /**
   * 연관 키워드 조회 (네이버 검색광고 API)
   * GET /blog-posts/keywords/related?keyword=검색어
   * 일일 캐싱 적용 - 동일 키워드는 하루 1회만 API 호출
   * 0번(원본 키워드) + PC/모바일 검색량 합산 상위 14개 반환
   */
  @Get('keywords/related')
  async getRelatedKeywords(@Query('keyword') keyword: string) {
    if (!keyword || keyword.trim().length === 0) {
      throw new BadRequestException('키워드를 입력해주세요.');
    }

    const result = await this.searchAdService.getRelatedKeyword([
      keyword.trim(),
    ]);

    if (!result.success) {
      throw new BadRequestException(result.error.detail);
    }

    const keywordList = result.data.keywordList;

    // 결과가 없거나 1개 이하면 그대로 반환
    if (!keywordList || keywordList.length <= 1) {
      return {
        keyword: keyword.trim(),
        keywordList: keywordList || [],
      };
    }

    // 0번 인덱스(원본 키워드)는 유지
    const originalKeyword = keywordList[0];
    const restKeywords = keywordList.slice(1);

    // 검색량을 숫자로 변환하는 헬퍼 함수 ("< 10" 같은 문자열 처리)
    const toNumber = (val: number | string): number => {
      if (typeof val === 'number') return val;
      if (typeof val === 'string' && val.includes('<')) return 0;
      return parseInt(val, 10) || 0;
    };

    // 1. 먼저 연관성 순서(API 반환 순서)대로 상위 14개 선택
    const top14ByRelevance = restKeywords.slice(0, 14);

    // 2. 선택된 14개를 검색량 기준으로 정렬
    const sortedBySearchVolume = top14ByRelevance.sort((a, b) => {
      const totalA =
        toNumber(a.monthlyPcQcCnt) + toNumber(a.monthlyMobileQcCnt);
      const totalB =
        toNumber(b.monthlyPcQcCnt) + toNumber(b.monthlyMobileQcCnt);
      return totalB - totalA; // 내림차순
    });

    return {
      keyword: keyword.trim(),
      keywordList: [originalKeyword, ...sortedBySearchVolume],
    };
  }

  /**
   * 블로그 원고 생성 요청
   * POST /blog-posts
   * 활성 구독 상태(TRIAL, ACTIVE)이고 만료일이 지나지 않은 경우에만 허용
   */
  @Post()
  @UseGuards(ActiveSubscriptionGuard)
  async create(
    @GetRequestUser() user: RequestUser,
    @Body() createBlogPostDto: CreateBlogPostDto,
  ) {
    const userId = user.id;
    return this.blogPostService.create(userId, createBlogPostDto);
  }

  /**
   * 사용자의 블로그 원고 요청 목록 조회
   * GET /blog-posts?page=1&limit=10&startDate=2024-01-01&endDate=2024-12-31&postType=맛집 후기&keyword=검색어
   */
  @Get()
  async findAll(
    @GetRequestUser() user: RequestUser,
    @Query() filterDto: FilterBlogPostDto,
  ) {
    const userId = user.id;
    return this.blogPostService.findAll(userId, filterDto);
  }

  /**
   * 특정 블로그 원고 요청 조회 (생성된 원고 포함)
   * GET /blog-posts/:id
   */
  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @GetRequestUser() user: RequestUser,
  ) {
    const userId = user.id;
    return this.blogPostService.findOne(id, userId);
  }

  /**
   * 진행 상황 조회
   * GET /blog-posts/:id/progress
   */
  @Get(':id/progress')
  async getProgress(
    @Param('id', ParseIntPipe) id: number,
    @GetRequestUser() user: RequestUser,
  ) {
    const userId = user.id;
    return this.blogPostService.getProgress(id, userId);
  }

  /**
   * 원고 배포 요청
   * POST /blog-posts/:id/deploy
   *
   * - 파일은 S3UploadInterceptor에 의해 바로 S3로 스트리밍 업로드됨
   * - 업로드된 파일 정보는 req.file에 S3File 형태로 저장
   */
  @Post(':id/deploy')
  @UseInterceptors(S3UploadInterceptor)
  deploy(
    @Param('id', ParseIntPipe) id: number,
    @GetRequestUser() user: RequestUser,
    @Body() deployOrderDto: DeployOrderDto,
    @UploadedFile() attachmentFile?: Express.MulterS3.File,
  ) {
    const userId = user.id;

    this.logger.log(
      `원고 배포 요청 - userId: ${userId}, blogPostId: ${id}, productId: ${deployOrderDto.productId}`,
    );

    return this.deployService.deployBlogPost(
      userId,
      id,
      deployOrderDto,
      attachmentFile,
    );
  }

  /**
   * 배포 결과 조회
   * GET /blog-posts/:id/deploy-result?page=1&limit=30
   *
   * - HelloDM API를 통해 배포된 블로그 포스팅 목록 조회
   * - 페이징 지원
   */
  @Get(':id/deploy-result')
  async getDeployResult(
    @Param('id', ParseIntPipe) id: number,
    @GetRequestUser() user: RequestUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const userId = user.id;

    // 해당 BlogPost가 사용자 소유인지 확인
    const blogPost = await this.blogPostService.findOne(id, userId);

    if (!blogPost.helloPostNo) {
      throw new BadRequestException('배포되지 않은 원고입니다.');
    }

    // HelloDM API로 배포 결과 조회
    return this.helloDmService.getBlogList({
      postNo: blogPost.helloPostNo,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 30,
    });
  }
}
