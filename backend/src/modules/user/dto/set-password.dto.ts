import { IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class SetPasswordDto {
  @IsOptional()
  @IsString()
  currentPassword?: string; // 기존 비밀번호가 있을 때만 필수

  @IsNotEmpty({ message: '새 비밀번호를 입력해주세요.' })
  @IsString()
  @MinLength(8, { message: '비밀번호는 최소 8자 이상이어야 합니다.' })
  newPassword: string;
}
