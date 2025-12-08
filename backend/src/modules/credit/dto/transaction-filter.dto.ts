import { IsOptional, IsDateString, IsInt, Min, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { CreditTransactionType } from '@prisma/client';

export class TransactionFilterDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @IsOptional()
  @IsEnum(CreditTransactionType)
  type?: CreditTransactionType;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
