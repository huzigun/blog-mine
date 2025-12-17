import {
  Controller,
  Get,
  Patch,
  Post,
  Query,
  Param,
  Body,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import {
  AdminSubscriptionsService,
  AdminSubscriptionsQuery,
  UpdateSubscriptionStatusDto,
  ExtendSubscriptionDto,
} from './admin-subscriptions.service';
import { AdminJwtAuthGuard } from '../guards/admin-jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { CurrentAdmin } from '../decorators/current-admin.decorator';
import { AdminRole, SubscriptionStatus } from '@prisma/client';

@Controller('admin/subscriptions')
@UseGuards(AdminJwtAuthGuard, RolesGuard)
@Roles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN)
export class AdminSubscriptionsController {
  constructor(
    private readonly adminSubscriptionsService: AdminSubscriptionsService,
  ) {}

  /**
   * 구독 목록 조회
   */
  @Get()
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: 'all' | SubscriptionStatus,
    @Query('planId') planId?: string,
    @Query('sortBy') sortBy?: 'createdAt' | 'expiresAt' | 'startedAt',
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    const query: AdminSubscriptionsQuery = {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      search,
      status,
      planId: planId ? parseInt(planId, 10) : undefined,
      sortBy,
      sortOrder,
    };

    return this.adminSubscriptionsService.findAll(query);
  }

  /**
   * 구독 통계 조회
   */
  @Get('stats')
  async getStats() {
    return this.adminSubscriptionsService.getStats();
  }

  /**
   * 요금제 목록 조회
   */
  @Get('plans')
  async getPlans() {
    return this.adminSubscriptionsService.getPlans();
  }

  /**
   * 구독 상세 조회
   */
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.adminSubscriptionsService.findOne(id);
  }

  /**
   * 구독 상태 변경
   */
  @Patch(':id/status')
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSubscriptionStatusDto,
    @CurrentAdmin('id') adminId: number,
  ) {
    return this.adminSubscriptionsService.updateStatus(id, dto, adminId);
  }

  /**
   * 구독 기간 연장
   */
  @Post(':id/extend')
  async extendSubscription(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ExtendSubscriptionDto,
    @CurrentAdmin('id') adminId: number,
  ) {
    return this.adminSubscriptionsService.extendSubscription(id, dto, adminId);
  }
}
