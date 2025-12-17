import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { AdminAuthService } from './admin-auth.service';
import {
  AdminLoginDto,
  CreateAdminDto,
  AdminRefreshTokenDto,
  ChangePasswordDto,
} from '../dto';
import { AdminJwtAuthGuard } from '../guards/admin-jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { CurrentAdmin } from '../decorators/current-admin.decorator';
import { AdminRole } from '@prisma/client';

interface AdminRequest extends Request {
  user: {
    id: number;
    email: string;
    role: AdminRole;
  };
}

@Controller('admin/auth')
export class AdminAuthController {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  /**
   * 관리자 로그인
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: AdminLoginDto, @Req() req: Request) {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    return this.adminAuthService.login(loginDto, ipAddress, userAgent);
  }

  /**
   * 관리자 생성 (SUPER_ADMIN 전용)
   */
  @Post('create')
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles(AdminRole.SUPER_ADMIN)
  async createAdmin(
    @Body() createDto: CreateAdminDto,
    @CurrentAdmin('id') adminId: number,
    @Req() req: Request,
  ) {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    return this.adminAuthService.createAdmin(createDto, adminId, ipAddress, userAgent);
  }

  /**
   * 토큰 갱신
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshToken(@Body() refreshDto: AdminRefreshTokenDto, @Req() req: Request) {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    return this.adminAuthService.refreshToken(refreshDto.refreshToken, ipAddress, userAgent);
  }

  /**
   * 로그아웃
   */
  @Post('logout')
  @UseGuards(AdminJwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(
    @Body() refreshDto: AdminRefreshTokenDto,
    @CurrentAdmin('id') adminId: number,
  ) {
    await this.adminAuthService.logout(refreshDto.refreshToken, adminId);
    return { message: '로그아웃되었습니다.' };
  }

  /**
   * 비밀번호 변경
   */
  @Post('change-password')
  @UseGuards(AdminJwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @Body() changePasswordDto: ChangePasswordDto,
    @CurrentAdmin('id') adminId: number,
    @Req() req: Request,
  ) {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    return this.adminAuthService.changePassword(
      adminId,
      changePasswordDto,
      ipAddress,
      userAgent,
    );
  }

  /**
   * 내 정보 조회
   */
  @Get('profile')
  @UseGuards(AdminJwtAuthGuard)
  async getProfile(@CurrentAdmin('id') adminId: number) {
    return this.adminAuthService.getProfile(adminId);
  }
}
