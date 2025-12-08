import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { GetRequestUser } from '@modules/auth/decorators/request-user.decorator';
import { CreditService } from './credit.service';
import {
  PurchaseCreditDto,
  CreditTransactionFilterDto,
  TransactionFilterDto,
} from './dto';

@Controller('credits')
@UseGuards(JwtAuthGuard)
export class CreditController {
  constructor(private readonly creditService: CreditService) {}

  /**
   * 크레딧 잔액 조회
   * GET /credits/balance
   */
  @Get('balance')
  async getBalance(@GetRequestUser('id') userId: number) {
    return this.creditService.getBalance(userId);
  }

  /**
   * 크레딧 구매/충전
   * POST /credits/purchase
   * TODO: 실제 결제 연동 구현 필요
   */
  @Post('purchase')
  @HttpCode(HttpStatus.OK)
  async purchaseCredits(
    @GetRequestUser('id') userId: number,
    @Body() purchaseDto: PurchaseCreditDto,
  ) {
    return this.creditService.purchaseCredits(userId, purchaseDto);
  }

  /**
   * 크레딧 거래 내역 조회 (페이징 및 필터링)
   * GET /credits/transactions
   * - type 파라미터로 거래 타입 필터링 가능 (전체/충전/사용/환불 등)
   * - startDate, endDate로 날짜 범위 필터링 가능
   */
  @Get('transactions')
  async getTransactions(
    @GetRequestUser('id') userId: number,
    @Query() filter: TransactionFilterDto,
  ) {
    return this.creditService.getTransactions(userId, filter);
  }

  /**
   * 특정 크레딧 거래 내역 조회
   * GET /credits/transactions/:id
   */
  @Get('transactions/:id')
  async getTransaction(
    @GetRequestUser('id') userId: number,
    @Param('id', ParseIntPipe) transactionId: number,
  ) {
    return this.creditService.getTransaction(userId, transactionId);
  }

  /**
   * 크레딧 환불
   * POST /credits/refund/:transactionId
   */
  @Post('refund/:transactionId')
  @HttpCode(HttpStatus.OK)
  async refundCredits(
    @GetRequestUser('id') userId: number,
    @Param('transactionId', ParseIntPipe) transactionId: number,
    @Body('reason') reason: string,
  ) {
    return this.creditService.refundCredits(userId, transactionId, reason);
  }
}
