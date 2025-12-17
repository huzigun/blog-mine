import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import {
  AdminAdminsService,
  AdminAdminsQuery,
  CreateAdminDto,
  UpdateAdminDto,
  ResetPasswordDto,
} from './admin-admins.service';
import { AdminJwtAuthGuard } from '../guards/admin-jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import {
  CurrentAdmin,
  CurrentAdminData,
} from '../decorators/current-admin.decorator';

@Controller('admin/admins')
@UseGuards(AdminJwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN') // 모든 엔드포인트는 SUPER_ADMIN만 접근 가능
export class AdminAdminsController {
  constructor(private readonly adminsService: AdminAdminsService) {}

  /**
   * 관리자 목록 조회
   */
  @Get()
  async findAll(@Query() query: AdminAdminsQuery) {
    return this.adminsService.findAll(query);
  }

  /**
   * 관리자 통계 조회
   */
  @Get('stats')
  async getStats() {
    return this.adminsService.getStats();
  }

  /**
   * 관리자 상세 조회
   */
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.adminsService.findOne(id);
  }

  /**
   * 관리자 활동 로그 조회
   */
  @Get(':id/activity-logs')
  async getActivityLogs(
    @Param('id', ParseIntPipe) id: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.adminsService.getActivityLogs(id, page, limit);
  }

  /**
   * 관리자 생성
   */
  @Post()
  async create(
    @Body() dto: CreateAdminDto,
    @CurrentAdmin() admin: CurrentAdminData,
  ) {
    return this.adminsService.create(dto, admin.id);
  }

  /**
   * 관리자 정보 수정
   */
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAdminDto,
    @CurrentAdmin() admin: CurrentAdminData,
  ) {
    return this.adminsService.update(id, dto, admin.id);
  }

  /**
   * 관리자 비밀번호 재설정
   */
  @Post(':id/reset-password')
  async resetPassword(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ResetPasswordDto,
    @CurrentAdmin() admin: CurrentAdminData,
  ) {
    return this.adminsService.resetPassword(id, dto, admin.id);
  }

  /**
   * 관리자 삭제
   */
  @Delete(':id')
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentAdmin() admin: CurrentAdminData,
  ) {
    return this.adminsService.remove(id, admin.id);
  }
}
