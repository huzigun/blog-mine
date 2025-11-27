import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsNotEmpty({ message: '현재 비밀번호를 입력해주세요.' })
  @IsString()
  currentPassword: string;

  @IsNotEmpty({ message: '새 비밀번호를 입력해주세요.' })
  @IsString()
  @MinLength(8, { message: '비밀번호는 최소 8자 이상이어야 합니다.' })
  newPassword: string;
}
