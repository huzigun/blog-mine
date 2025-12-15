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
import { GetRequestUser } from '../auth/decorators/request-user.decorator';
import { RequestUser } from '../auth/strategies/jwt.strategy';
import { OrderService } from './order.service';

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
  ) {}

  /**
   * 블로그 원고 생성 요청
   * POST /blog-posts
   */
  @Post()
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
