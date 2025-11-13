import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';
import { ICardInfo } from '@lib/integrations/nicepay/nicepay.dto';

/**
 * 카드 등록 DTO
 * - 클라이언트로부터 카드 정보(ICardInfo)를 받아 NicePay 빌링키를 발급받음
 */
export class CreateCardDto implements ICardInfo {
  // 카드 정보 (NicePay 빌링키 발급용)
  @IsString()
  @IsNotEmpty()
  cardNo: string; // 카드 번호

  @IsString()
  @IsNotEmpty()
  expireYear: string; // 카드 만료 연도 (YY)

  @IsString()
  @IsNotEmpty()
  expireMonth: string; // 카드 만료 월 (MM)

  @IsString()
  @IsNotEmpty()
  idNo: string; // 카드 소유자 주민등록번호 (앞 6자리 또는 사업자 등록번호)

  @IsString()
  @IsNotEmpty()
  cardPw: string; // 카드 비밀번호 (앞 2자리)

  // 선택적 추가 정보
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean; // 기본 카드로 설정 여부
}
