import {
  IsString,
  IsOptional,
  IsDateString,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class FilterBlogPostDto {
  // 페이지네이션
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

  // 날짜 필터 (검색 기간)
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  // postType 필터
  @IsOptional()
  @IsString()
  postType?: string;

  // 키워드 검색 (keyword 필드 검색)
  @IsOptional()
  @IsString()
  keyword?: string;
}
