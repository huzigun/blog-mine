import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { GetRequestUser } from '@modules/auth/decorators/request-user.decorator';
import { PaymentService } from './payment.service';
import { PaymentFilterDto } from './dto';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  /**
   * 결제 내역 조회 (페이징)
   * GET /payments
   */
  @Get()
  async getPayments(
    @GetRequestUser('id') userId: number,
    @Query() filter: PaymentFilterDto,
  ) {
    return this.paymentService.getPayments(userId, filter);
  }

  /**
   * 특정 결제 내역 조회
   * GET /payments/:id
   */
  @Get(':id')
  async getPayment(
    @GetRequestUser('id') userId: number,
    @Param('id', ParseIntPipe) paymentId: number,
  ) {
    return this.paymentService.getPayment(userId, paymentId);
  }
}
