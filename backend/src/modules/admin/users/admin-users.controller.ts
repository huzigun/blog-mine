import {
  Controller,
  Get,
  Post,
  Query,
  Param,
  Body,
  ParseIntPipe,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import {
  AdminUsersService,
  AdminUsersQuery,
  AdjustCreditDto,
  ChangeSubscriptionPlanDto,
} from './admin-users.service';
import { AdminJwtAuthGuard } from '../guards/admin-jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { CurrentAdmin } from '../decorators/current-admin.decorator';
import { AdminRole } from '@prisma/client';

@Controller('admin/users')
@UseGuards(AdminJwtAuthGuard, RolesGuard)
@Roles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.SUPPORT)
export class AdminUsersController {
  constructor(private readonly adminUsersService: AdminUsersService) {}

  /**
   * 사용자 목록 조회
   */
  @Get()
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: 'all' | 'active' | 'inactive',
    @Query('subscription')
    subscription?: 'all' | 'TRIAL' | 'ACTIVE' | 'EXPIRED' | 'CANCELED' | 'NONE',
    @Query('sortBy') sortBy?: 'createdAt' | 'email' | 'name',
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    const query: AdminUsersQuery = {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      search,
      status,
      subscription,
      sortBy,
      sortOrder,
    };

    return this.adminUsersService.findAll(query);
  }

  /**
   * 사용자 통계 조회
   */
  @Get('stats')
  async getStats() {
    return this.adminUsersService.getStats();
  }

  /**
   * 사용자 상세 조회
   */
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const user = await this.adminUsersService.findOne(id);

    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    return user;
  }

  /**
   * 사용자 크레딧 조정 (관리자용)
   * ADMIN 이상 권한 필요
   */
  @Post(':id/credits/adjust')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN)
  async adjustCredits(
    @Param('id', ParseIntPipe) userId: number,
    @Body() dto: AdjustCreditDto,
    @CurrentAdmin() admin: { id: number; email: string },
  ) {
    return this.adminUsersService.adjustCredits(userId, dto, admin.id);
  }

  /**
   * 사용자 구독 플랜 변경 (관리자용)
   * ADMIN 이상 권한 필요
   */
  @Post(':id/subscription/change-plan')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN)
  async changeSubscriptionPlan(
    @Param('id', ParseIntPipe) userId: number,
    @Body() dto: ChangeSubscriptionPlanDto,
    @CurrentAdmin() admin: { id: number; email: string },
  ) {
    return this.adminUsersService.changeSubscriptionPlan(userId, dto, admin.id);
  }
}
