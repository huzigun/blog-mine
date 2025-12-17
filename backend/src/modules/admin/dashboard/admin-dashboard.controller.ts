import { Controller, Get, UseGuards, Query } from '@nestjs/common';
import { AdminDashboardService } from './admin-dashboard.service';
import { AdminJwtAuthGuard } from '../guards/admin-jwt-auth.guard';

@Controller('admin/dashboard')
@UseGuards(AdminJwtAuthGuard)
export class AdminDashboardController {
  constructor(private readonly dashboardService: AdminDashboardService) {}

  /**
   * 대시보드 통계 조회
   */
  @Get('stats')
  async getStats() {
    return this.dashboardService.getStats();
  }

  /**
   * 최근 활동 로그 조회
   */
  @Get('activities')
  async getRecentActivities(@Query('limit') limit?: string) {
    const parsedLimit = limit ? parseInt(limit, 10) : 10;
    return this.dashboardService.getRecentActivities(parsedLimit);
  }
}
