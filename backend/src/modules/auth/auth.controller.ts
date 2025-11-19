import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
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
  ): Promise<AuthResponseDto> {
    // Nuxt Server API가 쿠키를 설정하므로 여기서는 refreshToken 포함하여 반환
    return await this.authService.register(registerDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
  ): Promise<AuthResponseDto> {
    // Nuxt Server API가 쿠키를 설정하므로 여기서는 refreshToken 포함하여 반환
    return await this.authService.login(loginDto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async logout(
    @GetRequestUser() user: RequestUser,
  ): Promise<{ message: string }> {
    // Nuxt Server API가 쿠키를 삭제하므로 여기서는 로그아웃 처리만
    return this.authService.logout(user.id);
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
