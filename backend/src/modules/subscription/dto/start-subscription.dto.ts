import { IsInt, IsPositive, IsOptional, IsBoolean } from 'class-validator';

/**
 * 구독 시작/업그레이드 DTO
 */
export class StartSubscriptionDto {
  @IsInt()
  @IsPositive()
  planId: number; // 구독할 플랜 ID

  @IsOptional()
  @IsInt()
  paymentMethodId?: number; // 결제 수단 ID (카드 ID)

  @IsOptional()
  @IsBoolean()
  autoRenewal?: boolean = true; // 자동 갱신 여부 (기본값: true)
}
