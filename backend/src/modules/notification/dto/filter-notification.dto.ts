import {
  IsOptional,
  IsInt,
  IsEnum,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { NotificationType } from '@prisma/client';

export class FilterNotificationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 20;

  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;

  @IsOptional()
  @Transform(({ obj }) => {
    // obj.isRead는 원본 쿼리 파라미터 값 (문자열)
    const value = obj.isRead;
    if (value === 'true') return true;
    if (value === 'false') return false;
    if (value === true) return true;
    if (value === false) return false;
    return undefined;
  })
  isRead?: boolean;
}
