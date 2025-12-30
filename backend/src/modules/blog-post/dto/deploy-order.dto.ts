import {
  IsString,
  IsNotEmpty,
  IsInt,
  Min,
  Max,
  IsEmail,
  Matches,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 원고 배포 요청 DTO
 * POST /blog-posts/:id/deploy
 */
export class DeployOrderDto {
  /**
   * 배포 상품 ID (DeployProduct.id)
   */
  @IsInt({ message: '상품 ID는 정수여야 합니다' })
  @Min(1, { message: '유효한 상품 ID를 선택해주세요' })
  @Type(() => Number)
  productId: number;

  /**
   * 배포 제목 (HelloDM title)
   * 기본값: YYYYMMDD 배포신청
   */
  @IsString()
  @IsNotEmpty({ message: '배포 제목을 입력해주세요' })
  @MaxLength(100, { message: '배포 제목은 최대 100자까지 입력 가능합니다' })
  deployTitle: string;

  /**
   * 업체명 (HelloDM adcompany)
   */
  @IsString()
  @IsNotEmpty({ message: '업체명을 입력해주세요' })
  @MaxLength(100, { message: '업체명은 최대 100자까지 입력 가능합니다' })
  companyName: string;

  /**
   * 연락처 (HelloDM adhp)
   * 이미지/가이드에 궁금한점이 있는 경우 연락드리는 번호
   */
  @IsString()
  @IsNotEmpty({ message: '연락처를 입력해주세요' })
  @Matches(/^01[016789]-?\d{3,4}-?\d{4}$/, {
    message: '올바른 휴대폰 번호 형식으로 입력해주세요',
  })
  applicantPhone: string;

  /**
   * 이메일 (HelloDM ademail)
   * 이미지 수신 여부 및 광고시작, 광고종료 안내 메일 발송
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
}
