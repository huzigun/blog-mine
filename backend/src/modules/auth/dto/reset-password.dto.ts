import {
  IsString,
  IsNotEmpty,
  IsEmail,
  MinLength,
  MaxLength,
  Matches,
  Length,
} from 'class-validator';

/**
 * 비밀번호 재설정용 인증코드 발송 요청 DTO
 */
export class SendPasswordResetCodeDto {
  @IsEmail({}, { message: '올바른 이메일 형식이 아닙니다.' })
  @IsNotEmpty({ message: '이메일을 입력해주세요.' })
  email: string;
}

/**
 * 비밀번호 재설정 인증코드 검증 DTO
 */
export class VerifyPasswordResetCodeDto {
  @IsEmail({}, { message: '올바른 이메일 형식이 아닙니다.' })
  @IsNotEmpty({ message: '이메일을 입력해주세요.' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: '인증 코드를 입력해주세요.' })
  @Length(6, 6, { message: '인증 코드는 6자리입니다.' })
  code: string;
}

/**
 * 비밀번호 재설정 DTO
 */
export class ResetPasswordDto {
  @IsEmail({}, { message: '올바른 이메일 형식이 아닙니다.' })
  @IsNotEmpty({ message: '이메일을 입력해주세요.' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: '인증 코드를 입력해주세요.' })
  @Length(6, 6, { message: '인증 코드는 6자리입니다.' })
  code: string;

  @IsString()
  @IsNotEmpty({ message: '새 비밀번호를 입력해주세요.' })
  @MinLength(8, { message: '비밀번호는 8자 이상이어야 합니다.' })
  @MaxLength(100, { message: '비밀번호는 100자 이하이어야 합니다.' })
  @Matches(/^(?=.*[a-zA-Z])(?=.*[0-9])(?=.*[!@#$%^&*])/, {
    message: '비밀번호는 영문, 숫자, 특수문자를 포함해야 합니다.',
  })
  newPassword: string;

  @IsString()
  @IsNotEmpty({ message: '비밀번호 확인을 입력해주세요.' })
  confirmPassword: string;
}
