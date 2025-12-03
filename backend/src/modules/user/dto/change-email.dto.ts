import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';

export class ChangeEmailRequestDto {
  @IsNotEmpty({ message: '새 이메일을 입력해주세요.' })
  @IsEmail({}, { message: '올바른 이메일 형식이 아닙니다.' })
  newEmail: string;
}

export class VerifyEmailChangeDto {
  @IsNotEmpty({ message: '이메일을 입력해주세요.' })
  @IsEmail({}, { message: '올바른 이메일 형식이 아닙니다.' })
  email: string;

  @IsNotEmpty({ message: '인증 코드를 입력해주세요.' })
  @IsString()
  @Length(6, 6, { message: '인증 코드는 6자리여야 합니다.' })
  code: string;
}
