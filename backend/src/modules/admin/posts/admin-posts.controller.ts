import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { AdminPostsService, AdminPostsQuery } from './admin-posts.service';
import { AdminJwtAuthGuard } from '../guards/admin-jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { CurrentAdmin } from '../decorators/current-admin.decorator';

@Controller('admin/posts')
@UseGuards(AdminJwtAuthGuard, RolesGuard)
export class AdminPostsController {
  constructor(private readonly postsService: AdminPostsService) {}

  /**
   * 블로그 포스트 목록 조회
   */
  @Get()
  @Roles('VIEWER', 'SUPPORT', 'ADMIN', 'SUPER_ADMIN')
  async findAll(@Query() query: AdminPostsQuery) {
    return this.postsService.findAll(query);
  }

  /**
   * 블로그 포스트 통계 조회
   */
  @Get('stats')
  @Roles('VIEWER', 'SUPPORT', 'ADMIN', 'SUPER_ADMIN')
  async getStats() {
    return this.postsService.getStats();
  }

  /**
   * 블로그 포스트 상세 조회
   */
  @Get(':id')
  @Roles('VIEWER', 'SUPPORT', 'ADMIN', 'SUPER_ADMIN')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.postsService.findOne(id);
  }

  /**
   * 실패한 포스트 재시도
   */
  @Post(':id/retry')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async retryPost(
    @Param('id', ParseIntPipe) id: number,
    @CurrentAdmin() admin: { userId: number },
  ) {
    return this.postsService.retryPost(id, admin.userId);
  }

  /**
   * AI 포스트의 프롬프트 로그 조회
   */
  @Get('ai-posts/:aiPostId/prompt-log')
  @Roles('VIEWER', 'SUPPORT', 'ADMIN', 'SUPER_ADMIN')
  async getPromptLog(@Param('aiPostId', ParseIntPipe) aiPostId: number) {
    return this.postsService.getPromptLog(aiPostId);
  }
}
