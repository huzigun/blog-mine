import {
  IsOptional,
  IsEnum,
  IsInt,
  IsPositive,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreditTransactionType, CreditType } from '@prisma/client';

/**
 * 크레딧 거래 내역 조회 필터 DTO
 */
export class CreditTransactionFilterDto {
  @IsOptional()
  @IsEnum(CreditTransactionType)
  type?: CreditTransactionType; // 거래 유형 필터

  @IsOptional()
  @IsEnum(CreditType)
  creditType?: CreditType; // 크레딧 타입 필터

  @IsOptional()
  @IsDateString()
  startDate?: string; // 조회 시작일

  @IsOptional()
  @IsDateString()
  endDate?: string; // 조회 종료일

  @IsOptional()
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  page?: number = 1; // 페이지 번호 (기본값: 1)

  @IsOptional()
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  limit?: number = 20; // 페이지당 항목 수 (기본값: 20)
}
