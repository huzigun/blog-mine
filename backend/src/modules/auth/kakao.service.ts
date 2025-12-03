import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '../../lib/config/config.service';
import { JwtService } from '@nestjs/jwt';
import { KakaoStatePayload, KakaoTokenResponse, KakaoUserInfo } from './dto';
import * as crypto from 'crypto';

@Injectable()
export class KakaoService {
  private readonly logger = new Logger(KakaoService.name);
  private readonly KAKAO_AUTH_URL = 'https://kauth.kakao.com';
  private readonly KAKAO_API_URL = 'https://kapi.kakao.com';

  // Kakao OAuth 설정
  private readonly kakaoClientId: string;
  private readonly kakaoClientSecret: string;
  private readonly kakaoRedirectUri: string;
  private readonly kakaoAdminKey: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {
    // 환경 변수에서 Kakao OAuth 설정 로드
    this.kakaoClientId = this.configService.kakaoClientId || '';
    this.kakaoClientSecret = this.configService.kakaoClientSecret || '';
    this.kakaoRedirectUri =
      this.configService.kakaoRedirectUri ||
      `http://localhost:9706/auth/callback/kakao`;
    this.kakaoAdminKey = this.configService.kakaoAdminKey || '';

    if (!this.kakaoClientId || !this.kakaoClientSecret) {
      this.logger.error('Kakao OAuth credentials not configured');
    }
    if (!this.kakaoAdminKey) {
      this.logger.warn(
        'Kakao Admin Key not configured - unlink functionality may not work',
      );
    }
  }

  /**
   * JWT 기반 state 파라미터 생성
   * - userId 포함하여 콜백에서 사용자 식별
   * - timestamp와 nonce로 재사용 공격 방지
   */
  generateStateToken(userId: number): string {
    const payload: KakaoStatePayload = {
      userId,
      timestamp: Date.now(),
      nonce: crypto.randomBytes(16).toString('hex'),
    };

    // 5분 유효기간의 JWT 토큰 생성
    return this.jwtService.sign(payload, {
      expiresIn: '5m',
      secret: this.configService.get<string>('JWT_SECRET'),
    });
  }

  /**
   * state 토큰 검증 및 userId 추출
   */
  verifyStateToken(stateToken: string): KakaoStatePayload {
    try {
      const payload = this.jwtService.verify<KakaoStatePayload>(stateToken, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      // timestamp 검증 (5분 이내)
      const now = Date.now();
      const tokenAge = now - payload.timestamp;
      if (tokenAge > 5 * 60 * 1000) {
        throw new BadRequestException('State token expired');
      }

      return payload;
    } catch (error) {
      this.logger.error(`State token verification failed: ${error.message}`);
      throw new BadRequestException('Invalid state token');
    }
  }

  /**
   * Kakao OAuth 인가 코드로 액세스 토큰 교환
   */
  async exchangeCodeForToken(
    code: string,
    redirectUri?: string,
  ): Promise<KakaoTokenResponse> {
    try {
      const params = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: this.kakaoClientId,
        client_secret: this.kakaoClientSecret,
        redirect_uri: redirectUri || this.kakaoRedirectUri,
        code,
      });

      const response = await fetch(`${this.KAKAO_AUTH_URL}/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        this.logger.error(
          `Kakao token exchange failed: ${JSON.stringify(errorData)}`,
        );
        throw new BadRequestException(
          'Failed to exchange Kakao authorization code',
        );
      }

      const tokenData: KakaoTokenResponse = await response.json();
      return tokenData;
    } catch (error) {
      this.logger.error(`Kakao token exchange error: ${error.message}`);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Kakao authentication service error',
      );
    }
  }

  /**
   * Kakao 액세스 토큰으로 사용자 정보 조회
   */
  async getUserInfo(accessToken: string): Promise<KakaoUserInfo> {
    try {
      const response = await fetch(`${this.KAKAO_API_URL}/v2/user/me`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        this.logger.error(
          `Kakao user info retrieval failed: ${JSON.stringify(errorData)}`,
        );
        throw new BadRequestException(
          'Failed to retrieve Kakao user information',
        );
      }

      const userInfo: KakaoUserInfo = await response.json();
      return userInfo;
    } catch (error) {
      this.logger.error(`Kakao user info retrieval error: ${error.message}`);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Kakao API service error');
    }
  }

  /**
   * Kakao 계정 연결 해제 (Admin Key 방식)
   * @param kakaoId - 카카오 사용자 ID
   */
  async unlinkKakaoAccount(kakaoId: string): Promise<void> {
    if (!this.kakaoAdminKey) {
      this.logger.error('Kakao Admin Key is not configured');
      throw new InternalServerErrorException(
        'Kakao Admin Key configuration is missing',
      );
    }

    try {
      const params = new URLSearchParams({
        target_id_type: 'user_id',
        target_id: kakaoId,
      });

      const response = await fetch(`${this.KAKAO_API_URL}/v1/user/unlink`, {
        method: 'POST',
        headers: {
          Authorization: `KakaoAK ${this.kakaoAdminKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        this.logger.error(
          `Kakao account unlink failed: ${JSON.stringify(errorData)}`,
        );
        throw new BadRequestException('Failed to unlink Kakao account');
      }

      const result = await response.json();
      this.logger.log(
        `Kakao account unlinked successfully for user: ${result.id}`,
      );
    } catch (error) {
      this.logger.error(`Kakao account unlink error: ${error.message}`);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Kakao unlink service error');
    }
  }
}
