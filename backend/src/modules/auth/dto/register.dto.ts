import { IsEmail, IsString, MinLength, IsBoolean } from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: '유효한 이메일 주소를 입력하세요.' })
  email: string;

  @IsString({ message: '비밀번호는 문자열이어야 합니다.' })
  @MinLength(6, { message: '비밀번호는 최소 6자 이상이어야 합니다.' })
  password: string;

  @IsString({ message: '이름은 문자열이어야 합니다.' })
  name?: string;

  @IsBoolean({ message: '이메일 인증 여부는 불리언이어야 합니다.' })
  emailVerified: boolean;
}
