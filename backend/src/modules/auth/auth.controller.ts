import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  UnauthorizedException,
  Req,
  Get,
  Query,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { KakaoService } from './kakao.service';
import {
  RegisterDto,
  LoginDto,
  AuthResponseDto,
  RefreshTokenResponseDto,
  SendVerificationCodeDto,
  VerifyCodeDto,
  FindEmailDto,
  SendPasswordResetCodeDto,
  VerifyPasswordResetCodeDto,
  ResetPasswordDto,
} from './dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GetRequestUser } from './decorators/request-user.decorator';
import { RequestUser } from './strategies/jwt.strategy';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly kakaoService: KakaoService,
  ) {}

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

  /**
   * 아이디(이메일) 찾기
   * POST /auth/find-email
   */
  @Post('find-email')
  @HttpCode(HttpStatus.OK)
  async findEmail(@Body() dto: FindEmailDto) {
    return this.authService.findEmail(dto.name);
  }

  /**
   * 비밀번호 재설정용 인증 코드 발송
   * POST /auth/send-password-reset-code
   */
  @Post('send-password-reset-code')
  @HttpCode(HttpStatus.OK)
  async sendPasswordResetCode(
    @Body() dto: SendPasswordResetCodeDto,
  ): Promise<{ message: string }> {
    return this.authService.sendPasswordResetCode(dto.email);
  }

  /**
   * 비밀번호 재설정 인증 코드 검증
   * POST /auth/verify-password-reset-code
   */
  @Post('verify-password-reset-code')
  @HttpCode(HttpStatus.OK)
  async verifyPasswordResetCode(
    @Body() dto: VerifyPasswordResetCodeDto,
  ): Promise<{ message: string; verified: boolean }> {
    return this.authService.verifyPasswordResetCode(dto.email, dto.code);
  }

  /**
   * 비밀번호 재설정
   * POST /auth/reset-password
   */
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(
    @Body() dto: ResetPasswordDto,
  ): Promise<{ message: string }> {
    return this.authService.resetPassword(
      dto.email,
      dto.code,
      dto.newPassword,
      dto.confirmPassword,
    );
  }

  /**
   * Kakao OAuth state 토큰 생성
   * POST /auth/kakao/state
   */
  @Post('/kakao/state')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  generateKakaoState(@GetRequestUser() user: RequestUser): { state: string } {
    const state = this.kakaoService.generateStateToken(user.id);
    return { state };
  }

  /**
   * Kakao OAuth 콜백 처리
   * - state JWT 검증하여 userId 확인
   * - 인가 코드로 Kakao 연결
   * - 팝업 창에서 호출되므로 HTML 응답으로 window.opener.postMessage 전송
   */
  @Get('/callback/kakao')
  async kakaoCallback(
    @Query()
    query: {
      code?: string;
      state?: string;
      error?: string;
      error_description?: string;
    },
  ) {
    // 에러 처리
    if (query.error) {
      const errorMessage =
        query.error_description || 'Kakao authentication failed';
      return this.sendPopupMessage(false, errorMessage);
    }

    // code와 state 검증
    if (!query.code || !query.state) {
      return this.sendPopupMessage(false, '필수 파라미터가 누락되었습니다.');
    }

    try {
      // 1. state JWT 검증 및 userId 추출
      const { userId } = this.kakaoService.verifyStateToken(query.state);

      // 2. Kakao 연결
      const result = await this.authService.connectKakao(userId, query.code);

      return this.sendPopupMessage(result.success, result.message);
    } catch (error) {
      this.logger.error(`Kakao callback error: ${error.message}`);
      return this.sendPopupMessage(
        false,
        error.message || '연결에 실패했습니다.',
      );
    }
  }

  /**
   * Kakao 로그인/회원가입
   * POST /auth/kakao-login
   * - 카카오 인가 코드로 로그인 또는 자동 회원가입
   */
  @Post('/kakao-login')
  @HttpCode(HttpStatus.OK)
  async kakaoLogin(
    @Body() body: { code: string; redirectUri?: string },
    @Req() req: Request,
  ): Promise<AuthResponseDto> {
    const ipAddress = this.extractIpAddress(req);
    const userAgent = req.headers['user-agent'];

    return await this.authService.kakaoLogin(
      body.code,
      body.redirectUri,
      ipAddress,
      userAgent,
    );
  }

  /**
   * Kakao 계정 연결 해제
   * POST /auth/disconnect-kakao
   */
  @Post('/disconnect-kakao')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async disconnectKakao(
    @GetRequestUser() user: RequestUser,
  ): Promise<{ message: string; success: boolean }> {
    return this.authService.disconnectKakao(user.id);
  }

  /**
   * 팝업 창에 postMessage를 전송하는 HTML 응답 생성
   */
  private sendPopupMessage(success: boolean, message: string) {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Kakao Authentication</title>
        </head>
        <body>
          <script>
            try {
              if (window.opener) {
                window.opener.postMessage(
                  {
                    success: ${success},
                    message: "${message.replace(/"/g, '\\"')}"
                  },
                  '*'
                );
                window.close();
              } else {
                document.body.innerHTML = '<p>${success ? '성공' : '실패'}: ${message.replace(/"/g, '\\"')}</p>';
              }
            } catch (error) {
              console.error('postMessage error:', error);
              document.body.innerHTML = '<p>통신 오류가 발생했습니다.</p>';
            }
          </script>
        </body>
      </html>
    `;

    return htmlContent;
  }
}
