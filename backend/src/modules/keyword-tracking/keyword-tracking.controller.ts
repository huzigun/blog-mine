import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { KeywordTrackingService } from './keyword-tracking.service';
import {
  CreateKeywordTrackingDto,
  UpdateKeywordTrackingDto,
  QueryKeywordTrackingDto,
} from './dto';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { GetRequestUser } from '@modules/auth/decorators/request-user.decorator';
import { RequestUser } from '@modules/auth';
import { NaverApiService } from '@lib/integrations/naver/naver-api/naver-api.service';

@Controller('keyword-tracking')
@UseGuards(JwtAuthGuard)
export class KeywordTrackingController {
  constructor(
    private keywordTrackingService: KeywordTrackingService,
    private naverApiService: NaverApiService,
  ) {}

  /**
   * 키워드 추적 생성
   * POST /keyword-tracking
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @GetRequestUser() user: RequestUser,
    @Body() createDto: CreateKeywordTrackingDto,
  ) {
    return this.keywordTrackingService.create(user.id, createDto);
  }

  /**
   * 사용자의 모든 키워드 추적 조회 (페이지네이션 및 검색 지원)
   * GET /keyword-tracking?page=1&limit=10&search=키워드&isActive=true
   */
  @Get()
  findAll(
    @GetRequestUser() user: RequestUser,
    @Query() query: QueryKeywordTrackingDto,
  ) {
    return this.keywordTrackingService.findAll(user.id, query);
  }

  /**
   * 특정 키워드 추적 조회
   * GET /keyword-tracking/:id
   */
  @Get(':id')
  findOne(
    @GetRequestUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.keywordTrackingService.findOne(id, user.id);
  }

  /**
   * 키워드 추적 수정
   * PATCH /keyword-tracking/:id
   */
  @Patch(':id')
  update(
    @GetRequestUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateKeywordTrackingDto,
  ) {
    return this.keywordTrackingService.update(id, user.id, updateDto);
  }

  /**
   * 키워드 추적 삭제
   * DELETE /keyword-tracking/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(
    @GetRequestUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.keywordTrackingService.remove(id, user.id);
  }

  /**
   * 키워드 추적 활성화/비활성화 토글
   * PATCH /keyword-tracking/:id/toggle
   */
  @Patch(':id/toggle')
  toggleActive(
    @GetRequestUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { isActive: boolean },
  ) {
    return this.keywordTrackingService.toggleActive(id, user.id, body.isActive);
  }

  @Get('search/blog-details')
  async fetchBlogDetails(@Query('blogUrl') blogUrl: string) {
    const content = await this.naverApiService.getBlogContent(blogUrl);

    return {
      bloggerName: content.nickname,
      title: content.title,
    };
  }
}
