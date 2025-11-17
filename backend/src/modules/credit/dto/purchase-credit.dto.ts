import { IsInt, IsPositive, IsOptional, IsString } from 'class-validator';

/**
 * 크레딧 구매 DTO
 * - 구매할 크레딧 수량과 결제 관련 정보를 받음
 * - 실제 결제 연동은 향후 구현 예정
 */
export class PurchaseCreditDto {
  @IsInt()
  @IsPositive()
  amount: number; // 구매할 크레딧 수량

  @IsOptional()
  @IsString()
  paymentMethodId?: string; // 결제 수단 ID (카드 ID 등)

  @IsOptional()
  @IsString()
  metadata?: string; // 추가 메타데이터 (JSON string)
}
