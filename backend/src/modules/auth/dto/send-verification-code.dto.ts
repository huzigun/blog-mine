import { IsEmail } from 'class-validator';

/**
 * 이메일 인증 코드 발송 요청 DTO
 */
export class SendVerificationCodeDto {
  @IsEmail({}, { message: '유효한 이메일 주소를 입력하세요.' })
  email: string;
}
