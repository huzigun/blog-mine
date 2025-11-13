import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { BlogPostService } from './blog-post.service';
import { CreateBlogPostDto, FilterBlogPostDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetRequestUser } from '../auth/decorators/request-user.decorator';
import { RequestUser } from '../auth/strategies/jwt.strategy';

@Controller('blog-posts')
@UseGuards(JwtAuthGuard)
export class BlogPostController {
  constructor(private readonly blogPostService: BlogPostService) {}

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
}
