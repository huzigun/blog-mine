import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { AdminPaymentsService, AdminPaymentsQuery, RefundPaymentDto } from './admin-payments.service';
import { AdminJwtAuthGuard } from '../guards/admin-jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { CurrentAdmin } from '../decorators/current-admin.decorator';

@Controller('admin/payments')
@UseGuards(AdminJwtAuthGuard, RolesGuard)
export class AdminPaymentsController {
  constructor(private readonly paymentsService: AdminPaymentsService) {}

  /**
   * 결제 목록 조회
   */
  @Get()
  @Roles('SUPPORT', 'ADMIN', 'SUPER_ADMIN')
  async findAll(@Query() query: AdminPaymentsQuery) {
    return this.paymentsService.findAll(query);
  }

  /**
   * 결제 통계 조회
   */
  @Get('stats')
  @Roles('SUPPORT', 'ADMIN', 'SUPER_ADMIN')
  async getStats() {
    return this.paymentsService.getStats();
  }

  /**
   * 결제 상세 조회
   */
  @Get(':id')
  @Roles('SUPPORT', 'ADMIN', 'SUPER_ADMIN')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.paymentsService.findOne(id);
  }

  /**
   * 결제 환불 처리
   */
  @Post(':id/refund')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async refundPayment(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RefundPaymentDto,
    @CurrentAdmin() admin: { userId: number },
  ) {
    return this.paymentsService.refundPayment(id, dto, admin.userId);
  }
}
