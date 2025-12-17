import type { H3Event } from 'h3';

/**
 * 환경별 쿠키 설정을 반환하는 헬퍼 함수
 */
export function getCookieOptions(type: 'access' | 'refresh') {
  const isProduction = process.env.NODE_ENV === 'production';

  const baseOptions = {
    secure: isProduction, // HTTPS only in production
    sameSite: isProduction ? ('strict' as const) : ('lax' as const),
    path: '/',
  };

  if (type === 'access') {
    return {
      ...baseOptions,
      httpOnly: false, // 클라이언트에서 읽을 수 있어야 함
      maxAge: 60 * 15, // 15 minutes
    };
  }

  // refresh token
  return {
    ...baseOptions,
    httpOnly: true, // XSS 방지
    maxAge: 60 * 60 * 24 * 7, // 7 days
  };
}

/**
 * Access Token 쿠키 설정
 */
export function setAccessTokenCookie(event: H3Event, token: string) {
  setCookie(event, 'access_token', token, getCookieOptions('access'));
}

/**
 * Refresh Token 쿠키 설정
 */
export function setRefreshTokenCookie(event: H3Event, token: string) {
  setCookie(event, 'refresh_token', token, getCookieOptions('refresh'));
}

/**
 * 인증 쿠키 모두 제거
 */
export function clearAuthCookies(event: H3Event) {
  deleteCookie(event, 'access_token', { path: '/' });
  deleteCookie(event, 'refresh_token', { path: '/' });
}

// ============================================
// 관리자 인증 쿠키 헬퍼 함수
// ============================================

/**
 * 관리자용 쿠키 설정을 반환하는 헬퍼 함수
 */
export function getAdminCookieOptions(type: 'access' | 'refresh') {
  const isProduction = process.env.NODE_ENV === 'production';

  const baseOptions = {
    secure: isProduction,
    sameSite: isProduction ? ('strict' as const) : ('lax' as const),
    path: '/',
  };

  if (type === 'access') {
    return {
      ...baseOptions,
      httpOnly: false, // 클라이언트에서 읽을 수 있어야 함
      maxAge: 60 * 15, // 15 minutes (관리자는 짧은 만료)
    };
  }

  // refresh token
  return {
    ...baseOptions,
    httpOnly: true, // XSS 방지
    maxAge: 60 * 60 * 24 * 7, // 7 days
  };
}

/**
 * 관리자 Access Token 쿠키 설정
 */
export function setAdminAccessTokenCookie(event: H3Event, token: string) {
  setCookie(event, 'admin_access_token', token, getAdminCookieOptions('access'));
}

/**
 * 관리자 Refresh Token 쿠키 설정
 */
export function setAdminRefreshTokenCookie(event: H3Event, token: string) {
  setCookie(event, 'admin_refresh_token', token, getAdminCookieOptions('refresh'));
}

/**
 * 관리자 인증 쿠키 모두 제거
 */
export function clearAdminAuthCookies(event: H3Event) {
  deleteCookie(event, 'admin_access_token', { path: '/' });
  deleteCookie(event, 'admin_refresh_token', { path: '/' });
}
