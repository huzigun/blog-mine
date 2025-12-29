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
import { FileInterceptor } from '@nestjs/platform-express';
import { BlogPostService } from './blog-post.service';
import {
  CreateBlogPostDto,
  FilterBlogPostDto,
  CreateOrderDto,
  SubmitPostDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ActiveSubscriptionGuard } from '../subscription/guards/active-subscription.guard';
import { GetRequestUser } from '../auth/decorators/request-user.decorator';
import { RequestUser } from '../auth/strategies/jwt.strategy';
import { OrderService } from './order.service';
import { SearchAdService } from '@lib/integrations/naver/naver-api/search.ad.service';

// Multer file type definition
interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@Controller('blog-posts')
@UseGuards(JwtAuthGuard)
export class BlogPostController {
  private readonly logger = new Logger(BlogPostController.name);

  constructor(
    private readonly blogPostService: BlogPostService,
    private readonly orderService: OrderService,
    private readonly searchAdService: SearchAdService,
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
   * GET /blog-post/:id/progress
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
   * 원고 배포 신청
   * POST /blog-post/order
   * FormData로 파일과 함께 전송됨
   */
  @Post('order')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 500 * 1024 * 1024, // 500MB
      },
      fileFilter: (req, file, callback) => {
        // ZIP 파일만 허용
        const allowedMimeTypes = [
          'application/zip',
          'application/x-zip-compressed',
          'application/x-zip',
        ];
        const isZip =
          allowedMimeTypes.includes(file.mimetype) ||
          file.originalname.toLowerCase().endsWith('.zip');

        if (isZip) {
          callback(null, true);
        } else {
          callback(new Error('ZIP 파일만 업로드 가능합니다.'), false);
        }
      },
    }),
  )
  createOrder(
    @GetRequestUser() user: RequestUser,
    @Body() createOrderDto: CreateOrderDto,
    @UploadedFile() file?: MulterFile,
  ) {
    const userId = user.id;

    // 상품별 배포 수량 파싱
    let productDistributions: Array<{ productId: string; quantity: number }> =
      [];
    try {
      productDistributions = JSON.parse(createOrderDto.productDistributions);
    } catch (e) {
      this.logger.warn('Failed to parse productDistributions', e);
    }

    // 디버그 로깅
    this.logger.debug('=== 원고 배포 신청 데이터 ===');
    this.logger.debug(`userId: ${userId}`);
    this.logger.debug(`companyName: ${createOrderDto.companyName}`);
    this.logger.debug(`naverMapUrl: ${createOrderDto.naverMapUrl || '(없음)'}`);
    this.logger.debug(
      `requiredContent: ${createOrderDto.requiredContent.substring(0, 100)}...`,
    );
    this.logger.debug(`applicantName: ${createOrderDto.applicantName}`);
    this.logger.debug(`applicantPhone: ${createOrderDto.applicantPhone}`);
    this.logger.debug(`applicantEmail: ${createOrderDto.applicantEmail}`);
    this.logger.debug(`dailyUploadCount: ${createOrderDto.dailyUploadCount}`);
    this.logger.debug(
      `adGuidelineAgreement: ${createOrderDto.adGuidelineAgreement}`,
    );
    this.logger.debug(
      `productDistributions: ${JSON.stringify(productDistributions)}`,
    );

    if (file) {
      this.logger.debug('=== 업로드된 파일 정보 ===');
      this.logger.debug(`filename: ${file.originalname}`);
      this.logger.debug(`mimetype: ${file.mimetype}`);
      this.logger.debug(
        `size: ${(file.size / (1024 * 1024)).toFixed(2)} MB (${file.size} bytes)`,
      );
    } else {
      this.logger.debug('업로드된 파일 없음');
    }

    const orderDatas: SubmitPostDto[] = productDistributions.map((el) => {
      return {
        // adcompany: createOrderDto.applicantName,
        adcompany: '테스트',
        adhp: createOrderDto.applicantPhone,
        ademail: createOrderDto.applicantEmail,
        title: '테스트',
        wgCostImage: createOrderDto.adGuidelineAgreement,
        wgMapLink: createOrderDto.naverMapUrl,
        okdayCnt: createOrderDto.dailyUploadCount,
        mosu: el.quantity,
        orderItem: Number(el.productId),
        wgCompany: createOrderDto.companyName,
        wgContent: createOrderDto.requiredContent,
        wgKeyword: ['test'],
      };
    });

    // TODO: 실제 배포 신청 로직 구현

    return {
      orderDatas,
    };
  }
}
