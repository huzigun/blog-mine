import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { AdminPlansService, UpdatePlanDto } from './admin-plans.service';
import { AdminJwtAuthGuard } from '../guards/admin-jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import {
  CurrentAdmin,
  CurrentAdminData,
} from '../decorators/current-admin.decorator';

@Controller('admin/plans')
@UseGuards(AdminJwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN') // 플랜 관리는 SUPER_ADMIN만 접근 가능
export class AdminPlansController {
  constructor(private readonly plansService: AdminPlansService) {}

  /**
   * 플랜 목록 조회
   */
  @Get()
  async findAll() {
    return this.plansService.findAll();
  }

  /**
   * 플랜 통계 조회
   */
  @Get('stats')
  async getStats() {
    return this.plansService.getStats();
  }

  /**
   * 플랜 상세 조회
   */
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.plansService.findOne(id);
  }

  /**
   * 플랜 수정 (등록/삭제 엔드포인트 없음)
   */
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePlanDto,
    @CurrentAdmin() admin: CurrentAdminData,
  ) {
    return this.plansService.update(id, dto, admin.id);
  }
}
