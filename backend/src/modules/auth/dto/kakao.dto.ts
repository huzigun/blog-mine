import { IsNotEmpty, IsString } from 'class-validator';

/**
 * Kakao OAuth 토큰 응답 DTO
 */
export interface KakaoTokenResponse {
  access_token: string;
  token_type: string;
  refresh_token: string;
  expires_in: number;
  scope?: string;
  refresh_token_expires_in: number;
}

/**
 * Kakao 사용자 정보 응답 DTO
 */
export interface KakaoUserInfo {
  id: number; // Kakao 고유 ID
  connected_at?: string;
  kakao_account?: {
    profile?: {
      nickname?: string;
      profile_image_url?: string;
      thumbnail_image_url?: string;
    };
    email?: string;
    email_needs_agreement?: boolean;
  };
}

/**
 * Kakao 연결 요청 DTO (state parameter JWT payload)
 */
export interface KakaoStatePayload {
  userId: number;
  timestamp: number;
  nonce: string;
}

/**
 * Kakao 연결 결과 DTO
 */
export class KakaoConnectResultDto {
  @IsNotEmpty()
  @IsString()
  code: string;

  @IsNotEmpty()
  @IsString()
  state: string;
}

/**
 * Kakao 연결 해제 요청 DTO
 */
export class KakaoDisconnectDto {
  // 현재는 JWT 인증으로 사용자 확인하므로 추가 필드 불필요
}
