import {
  IsString,
  IsNumber,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsObject,
  IsBoolean,
  ValidateIf,
  IsIn,
} from 'class-validator';

export class CreateBlogPostDto {
  @IsString()
  postType: string;

  // personaId와 useRandomPersona 중 하나만 필수
  @ValidateIf((o) => !o.useRandomPersona)
  @IsNumber()
  @IsInt()
  @Min(1)
  personaId?: number;

  // personaId가 없을 때 랜덤 페르소나 사용 플래그
  @ValidateIf((o) => !o.personaId)
  @IsBoolean()
  useRandomPersona?: boolean;

  // 작성 예정 블로그 지수 (normal, semi-optimal, optimal)
  @IsString()
  @IsIn(['normal', 'semi-optimal', 'optimal'])
  blogIndex: string;

  // 희망 키워드
  @IsString()
  keyword: string;

  // 추천 키워드 (선택된 연관 키워드)
  @IsOptional()
  @IsString()
  recommendedKeyword?: string | null;

  @IsNumber()
  @IsInt()
  @Min(300)
  @Max(3000)
  length: number;

  @IsNumber()
  @IsInt()
  @Min(1)
  @Max(100)
  count: number;

  @IsOptional()
  @IsObject()
  additionalFields?: Record<string, any>;
}
