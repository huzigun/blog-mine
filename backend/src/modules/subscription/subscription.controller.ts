import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Query,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { GetRequestUser } from '@modules/auth/decorators/request-user.decorator';
import { SubscriptionService } from './subscription.service';
import { StartSubscriptionDto, CancelSubscriptionDto } from './dto';

@Controller('subscriptions')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  /**
   * 내 구독 정보 조회
   * GET /subscriptions/me
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMySubscription(@GetRequestUser('id') userId: number) {
    return this.subscriptionService.getCurrentSubscription(userId);
  }

  /**
   * 사용 가능한 플랜 목록 조회 (공개 API)
   * GET /subscriptions/plans
   */
  @Get('plans')
  async getAvailablePlans() {
    return this.subscriptionService.getAvailablePlans();
  }

  /**
   * 특정 플랜 조회 (공개 API)
   * GET /subscriptions/plans/:id
   */
  @Get('plans/:id')
  async getPlanById(@Param('id', ParseIntPipe) planId: number) {
    return this.subscriptionService.getPlanById(planId);
  }

  /**
   * 구독 내역 조회
   * GET /subscriptions/history
   */
  @Get('history')
  @UseGuards(JwtAuthGuard)
  async getHistory(
    @GetRequestUser('id') userId: number,
    @Query('limit') limit?: number,
  ) {
    return this.subscriptionService.getSubscriptionHistory(userId, limit || 10);
  }

  /**
   * 구독 시작 또는 업그레이드
   * POST /subscriptions/start
   */
  @Post('start')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async startSubscription(
    @GetRequestUser('id') userId: number,
    @Body() dto: StartSubscriptionDto,
  ) {
    return this.subscriptionService.startSubscription(userId, dto);
  }

  /**
   * 구독 취소
   * POST /subscriptions/cancel
   */
  @Post('cancel')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async cancelSubscription(
    @GetRequestUser('id') userId: number,
    @Body() dto: CancelSubscriptionDto,
  ) {
    return this.subscriptionService.cancelSubscription(userId, dto);
  }

  /**
   * 구독 재활성화
   * POST /subscriptions/reactivate
   */
  @Post('reactivate')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async reactivateSubscription(@GetRequestUser('id') userId: number) {
    return this.subscriptionService.reactivateSubscription(userId);
  }

  /**
   * 플랜 업그레이드 가격 계산
   * GET /subscriptions/upgrade-price/:planId
   */
  @Get('upgrade-price/:planId')
  @UseGuards(JwtAuthGuard)
  async calculateUpgradePrice(
    @GetRequestUser('id') userId: number,
    @Param('planId', ParseIntPipe) planId: number,
  ) {
    return await this.subscriptionService.calculateUpgradePrice(userId, planId);
  }

  /**
   * 플랜 업그레이드 실행
   * POST /subscriptions/upgrade
   */
  @Post('upgrade')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async upgradeSubscription(
    @GetRequestUser('id') userId: number,
    @Body() dto: StartSubscriptionDto,
  ) {
    return await this.subscriptionService.upgradeSubscription(
      userId,
      dto.planId,
      dto.paymentMethodId,
    );
  }
}
