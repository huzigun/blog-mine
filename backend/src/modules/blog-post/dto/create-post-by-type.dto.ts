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

/**
 * 공통 기본 필드 (모든 타입에서 사용)
 */
class BaseCreatePostDto {
  // 페르소나 ID (필수)
  @IsNumber()
  @IsInt()
  @Min(1)
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

/**
 * 맛집 후기 원고 생성 DTO
 * - 네이버 플레이스 URL 필수
 */
export class CreateRestaurantPostDto extends BaseCreatePostDto {
  // 네이버 플레이스 URL (필수)
  @IsUrl({}, { message: '올바른 URL 형식을 입력해주세요.' })
  placeUrl: string;
}

/**
 * 제품 후기 원고 생성 DTO
 * - 제품 URL 필수
 */
export class CreateProductPostDto extends BaseCreatePostDto {
  // 제품 URL (필수)
  @IsUrl({}, { message: '올바른 URL 형식을 입력해주세요.' })
  productUrl: string;
}

/**
 * 일반 후기 원고 생성 DTO
 * - 관련 URL 필수
 */
export class CreateGeneralReviewPostDto extends BaseCreatePostDto {
  // 관련 URL (필수 - 배포 시 wg_url_link로 전달)
  @IsUrl({}, { message: '올바른 URL 형식을 입력해주세요.' })
  relatedUrl: string;
}

/**
 * 일반 키워드 정보성 원고 생성 DTO
 */
export class CreateGeneralPostDto extends BaseCreatePostDto {}

/**
 * 병/의원 의료상식 원고 생성 DTO
 * - 네이버 플레이스 URL 선택
 */
export class CreateMedicalPostDto extends BaseCreatePostDto {
  // 네이버 플레이스 URL (선택)
  @IsOptional()
  @IsUrl({}, { message: '올바른 URL 형식을 입력해주세요.' })
  placeUrl?: string;
}

/**
 * 법률상식 원고 생성 DTO
 * - 네이버 플레이스 URL 선택
 */
export class CreateLegalPostDto extends BaseCreatePostDto {
  // 네이버 플레이스 URL (선택)
  @IsOptional()
  @IsUrl({}, { message: '올바른 URL 형식을 입력해주세요.' })
  placeUrl?: string;
}

/**
 * 뉴스 기반 원고 생성 DTO
 * - 뉴스 URL 필수
 */
export class CreateNewsPostDto extends BaseCreatePostDto {
  // 뉴스 URL (필수)
  @IsUrl({}, { message: '올바른 뉴스 URL을 입력해주세요.' })
  newsUrl: string;
}
