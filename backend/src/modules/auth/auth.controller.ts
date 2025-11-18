import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
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
  async register(@Body() registerDto: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    console.log('Login attempt for:', loginDto.email);
    return this.authService.login(loginDto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async logout(
    @GetRequestUser() user: RequestUser,
  ): Promise<{ message: string }> {
    return this.authService.logout(user.id);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Body('refreshToken') refreshToken: string,
  ): Promise<RefreshTokenResponseDto> {
    return await this.authService.refreshAccessToken(refreshToken);
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
