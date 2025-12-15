import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsEmail,
  IsBoolean,
  IsArray,
  ValidateNested,
  Matches,
  MaxLength,
  IsUrl,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

/**
 * 상품별 배포 수량 DTO
 */
export class ProductDistributionDto {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsInt()
  @Min(0)
  quantity: number;
}

/**
 * 원고 배포 신청 DTO
 * POST /blog-post/order
 */
export class CreateOrderDto {
  /**
   * 업체명
   */
  @IsString()
  @IsNotEmpty({ message: '업체명을 입력해주세요' })
  @MaxLength(100, { message: '업체명은 최대 100자까지 입력 가능합니다' })
  companyName: string;

  /**
   * 네이버 지도 URL (선택)
   */
  @IsOptional()
  @IsString()
  @Transform(({ value }: { value?: string }) =>
    value === '' ? undefined : value,
  )
  @IsUrl({}, { message: '올바른 URL 형식으로 입력해주세요' })
  @Matches(
    /^https?:\/\/(map\.naver\.com|naver\.me|m\.place\.naver\.com|place\.naver\.com)/,
    { message: '네이버 지도 URL만 입력 가능합니다' },
  )
  naverMapUrl?: string;

  /**
   * 필수 내용
   */
  @IsString()
  @IsNotEmpty({ message: '필수 내용을 입력해주세요' })
  @MaxLength(2000, { message: '필수 내용은 최대 2000자까지 입력 가능합니다' })
  requiredContent: string;

  /**
   * 신청인 이름
   */
  @IsString()
  @IsNotEmpty({ message: '신청인 이름을 입력해주세요' })
  @MaxLength(50, { message: '이름은 최대 50자까지 입력 가능합니다' })
  applicantName: string;

  /**
   * 신청인 연락처
   */
  @IsString()
  @IsNotEmpty({ message: '연락처를 입력해주세요' })
  @Matches(/^01[016789]-?\d{3,4}-?\d{4}$/, {
    message: '올바른 휴대폰 번호 형식으로 입력해주세요',
  })
  applicantPhone: string;

  /**
   * 신청인 이메일
   */
  @IsEmail({}, { message: '올바른 이메일 형식으로 입력해주세요' })
  @IsNotEmpty({ message: '이메일 주소를 입력해주세요' })
  applicantEmail: string;

  /**
   * 일 업로드 건수
   */
  @IsInt({ message: '일 업로드 건수는 정수여야 합니다' })
  @Min(1, { message: '일 업로드 건수는 최소 1건 이상이어야 합니다' })
  @Max(100, { message: '일 업로드 건수는 최대 100건까지 가능합니다' })
  @Type(() => Number)
  dailyUploadCount: number;

  /**
   * 상품별 배포 수량 (JSON string으로 전달됨)
   */
  @IsString()
  @IsNotEmpty()
  productDistributions: string;

  /**
   * 광고 심사지침 동의
   */
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean({ message: '광고 심사지침에 동의해주세요' })
  adGuidelineAgreement: boolean;
}

/**
 * 파싱된 상품별 배포 수량
 */
export interface ParsedProductDistribution {
  productId: string;
  quantity: number;
}

export interface SubmitPostDto {
  adcompany: string; // 회사명
  adhp: string; // 이미지/가이드에 궁금한점이 있는 경우 연락드리는 번호
  ademail: string; // 이미지 수신 여부 및 광고시작, 광고종료 안내 메일 발송
  title: string; // 보고서에 작성되는 광고명칭
  orderItem: number;
  mosu: number; // 총 발행할 포스팅 건수
  okdayCnt?: number; // 매일 진행할 포스팅 건수
  wgHugi?: string; //타입수정  number -> string // 포스팅 작성 유형 1 : 소개성, 2 : 자유선택(랜덤)
  wgCompany: string; // 블로그 제목에 들어갈 업체명 또는 상품명
  wgKeyword: string[]; // 제목과 내용에 사용될 키워드
  keywordOptionUse?: string; // 플레이스 저인망 키워드 추출배포 사용유무 (미입력 : 사용안함, 1:추출배포 사용)
  keywordId?: string; //	플레이스 저인망 키워드 추출배포 사용시 스마트 플레이스 ID
  keywordPw?: string; // 플레이스 저인망 키워드 추출배포 사용시 스마트 플레이스 패스워드
  wgExSite?: string[]; // 업체(상품) 참고링크	(참고하여 작성할 링크)
  wgContent: string; // 업체(상품) 참고사항 (업체(상품) 소개, 장점, 이벤트 등 참고사항)
  wgRequiredTxt?: string; // 필수 내용 (주소, 전화번호, 이벤트 등)
  wgUrlLink?: string; // 링크 (본문 글에 들어갈 링크)
  wgMapLink?: string; // 네이버 지도 링크
  wgTag?: string[];
  wgCostImage?: boolean; // 대가성 문구 동의 (4 : 대가성이미지A 사용, 5 : 대가성이미지B 사용)
}

// orderItem
// 1 : 기본포스팅, 사진 5장이상, 글자수 300자~500자
// 2 : 일반포스팅, 사진 10장이상, 글자수 600자~900자
// 3 : 고품질포스팅, 사진 15장이상, 글자수 1000자~1200자
// 4 : 준최적화 2단계이상, 사진 5장이상, 글자수 300자~500자
// 6 : 준최적화 3단계이상, 사진 10장이상, 글자수 700자~900자
// 7 : 준최적화 3단계이상, 사진 15장이상, 글자수 1200자~1500자
// 8 : 최적화 1~4단계, 사진 15장이상, 글자수 1200자~1500자
// 9 : 포스팅, 사진 3장이상, 글자수 100자~300자
// 10 : 준최적화 5단계이상, 사진 10장이상, 글자수 1200자~1500자
// 12 : 저인망 준최적화 2~4단계이상, 사진 10장이상, 글자수 1000자이상
