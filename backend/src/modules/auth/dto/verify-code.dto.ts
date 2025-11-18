import { IsEmail, IsString, Length } from 'class-validator';

/**
 * 이메일 인증 코드 확인 요청 DTO
 */
export class VerifyCodeDto {
  @IsEmail({}, { message: '유효한 이메일 주소를 입력하세요.' })
  email: string;

  @IsString({ message: '인증 코드는 문자열이어야 합니다.' })
  @Length(6, 6, { message: '인증 코드는 6자리 숫자여야 합니다.' })
  code: string;
}
