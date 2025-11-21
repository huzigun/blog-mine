import {
  IsString,
  IsBoolean,
  IsOptional,
  IsInt,
  Min,
  Max,
} from 'class-validator';

export class CreateKeywordTrackingDto {
  @IsString()
  keyword: string; // 추적할 키워드

  @IsString()
  myBlogUrl: string; // 사용자의 블로그 URL

  @IsString()
  bloggerName: string; // 블로거 이름

  @IsString()
  @IsOptional()
  title?: string; // 블로그 제목 (선택)

  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true; // 활성화 여부 (기본값: true)

  @IsInt()
  @Min(10)
  @Max(100)
  @IsOptional()
  displayCount?: number = 40; // 검색 결과 수 (기본값: 40, 범위: 10-100)
}
