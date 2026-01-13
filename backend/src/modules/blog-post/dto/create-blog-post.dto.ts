import {
  IsString,
  IsNumber,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsObject,
  IsIn,
  IsUrl,
} from 'class-validator';

export class CreateBlogPostDto {
  @IsString()
  postType: string;

  // 페르소나 ID (필수, 0: 기본 페르소나, 1+: 사용자 페르소나)
  @IsNumber()
  @IsInt()
  @Min(0)
  personaId: number;

  // 작성 예정 블로그 지수 (normal, semi-optimal, optimal)
  @IsString()
  @IsIn(['normal', 'semi-optimal', 'optimal'])
  blogIndex: string;

  // 원고 말투 (casual: ~해요체, formal: ~습니다체, narrative: ~한다체)
  @IsString()
  @IsIn(['casual', 'formal', 'narrative'])
  writingTone: string;

  // 희망 키워드
  @IsString()
  keyword: string;

  // 추천 키워드 (선택된 연관 키워드)
  @IsOptional()
  @IsString()
  recommendedKeyword?: string | null;

  // 네이버 플레이스 URL (맛집 후기 전용)
  @IsOptional()
  @IsUrl({}, { message: '올바른 URL 형식을 입력해주세요.' })
  placeUrl?: string | null;

  // 제품 URL (제품 후기 전용, 저장만 하고 사용 안함)
  @IsOptional()
  @IsUrl({}, { message: '올바른 URL 형식을 입력해주세요.' })
  productUrl?: string | null;

  // 관련 URL (일반 후기 전용, 배포 시 wg_url_link로 전달)
  @IsOptional()
  @IsUrl({}, { message: '올바른 URL 형식을 입력해주세요.' })
  relatedUrl?: string | null;

  // 원고 글자수 (2000자 고정)
  @IsNumber()
  @IsInt()
  @Min(2000)
  @Max(2000)
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
