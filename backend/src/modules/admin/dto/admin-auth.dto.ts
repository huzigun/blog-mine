import {
  IsEmail,
  IsString,
  MinLength,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { AdminRole } from '@prisma/client';

export class AdminLoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;
}

export class CreateAdminDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  name: string;

  @IsEnum(AdminRole)
  @IsOptional()
  role?: AdminRole;
}

export class UpdateAdminDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEnum(AdminRole)
  @IsOptional()
  role?: AdminRole;

  @IsOptional()
  isActive?: boolean;
}

export class ChangePasswordDto {
  @IsString()
  @MinLength(8)
  currentPassword: string;

  @IsString()
  @MinLength(8)
  newPassword: string;
}

export class AdminAuthResponseDto {
  accessToken: string;
  refreshToken: string;
  admin: {
    id: number;
    email: string;
    name: string;
    role: AdminRole;
  };
}

export class AdminRefreshTokenResponseDto {
  accessToken: string;
}

export class AdminRefreshTokenDto {
  @IsString()
  refreshToken: string;
}
