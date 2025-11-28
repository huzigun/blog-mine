import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  UnauthorizedException,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import {
  RegisterDto,
  LoginDto,
  AuthResponseDto,
  RefreshTokenResponseDto,
  SendVerificationCodeDto,
  VerifyCodeDto,
} from './dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GetRequestUser } from './decorators/request-user.decorator';
import { RequestUser } from './strategies/jwt.strategy';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(
    @Body() registerDto: RegisterDto,
    @Req() req: Request,
  ): Promise<AuthResponseDto> {
    // IP 주소와 User-Agent 추출
    const ipAddress = this.extractIpAddress(req);
    const userAgent = req.headers['user-agent'];

    return await this.authService.register(registerDto, ipAddress, userAgent);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Req() req: Request,
  ): Promise<AuthResponseDto> {
    // IP 주소와 User-Agent 추출
    const ipAddress = this.extractIpAddress(req);
    const userAgent = req.headers['user-agent'];

    return await this.authService.login(loginDto, ipAddress, userAgent);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async logout(
    @GetRequestUser() user: RequestUser,
    @Body() body: { refreshToken?: string },
  ): Promise<{ message: string }> {
    // 특정 디바이스 로그아웃 또는 전체 로그아웃
    return this.authService.logout(user.id, body.refreshToken);
  }

  /**
   * Request에서 실제 IP 주소 추출 (프록시 환경 고려)
   */
  private extractIpAddress(req: Request): string {
    // X-Forwarded-For 헤더 확인 (프록시/로드밸런서 사용 시)
    const forwardedFor = req.headers['x-forwarded-for'];
    if (forwardedFor) {
      // 여러 IP가 있을 경우 첫 번째가 실제 클라이언트 IP
      const ips = Array.isArray(forwardedFor)
        ? forwardedFor[0]
        : forwardedFor.split(',')[0];
      return ips.trim();
    }

    // X-Real-IP 헤더 확인 (Nginx 등)
    const realIp = req.headers['x-real-ip'];
    if (realIp && typeof realIp === 'string') {
      return realIp;
    }

    // 기본적으로 req.ip 사용
    return req.ip || 'unknown';
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Body() body: { refreshToken: string },
  ): Promise<RefreshTokenResponseDto> {
    // Nuxt Server API가 body로 refreshToken을 전달
    if (!body.refreshToken) {
      throw new UnauthorizedException('Refresh token not found');
    }

    return await this.authService.refreshAccessToken(body.refreshToken);
  }

  /**
   * 이메일 인증 코드 발송
   * POST /auth/send-verification-code
   */
  @Post('send-verification-code')
  @HttpCode(HttpStatus.OK)
  async sendVerificationCode(
    @Body() dto: SendVerificationCodeDto,
  ): Promise<{ message: string }> {
    return this.authService.sendVerificationCode(dto.email);
  }

  /**
   * 이메일 인증 코드 확인
   * POST /auth/verify-code
   */
  @Post('verify-code')
  @HttpCode(HttpStatus.OK)
  async verifyCode(
    @Body() dto: VerifyCodeDto,
  ): Promise<{ message: string; verified: boolean }> {
    return this.authService.verifyCode(dto.email, dto.code);
  }
}
