import {
  clearAdminAuthCookies,
  setAdminAccessTokenCookie,
} from '~~/server/utils/cookies';

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();

  // httpOnly 쿠키에서 refresh token 읽기
  const refreshToken = getCookie(event, 'admin_refresh_token');

  if (!refreshToken) {
    throw createError({
      statusCode: 401,
      statusMessage: 'No admin refresh token',
    });
  }

  const isDev = import.meta.dev;
  // 서버 사이드에서는 내부 URL 사용 (Docker 네트워크), 없으면 public URL fallback
  const apiUrl = isDev
    ? 'http://localhost:9706'
    : config.internalApiUrl || config.public.apiBaseUrl;

  try {
    // Backend API 호출 (body로 refreshToken 전달)
    const response = await $fetch<{
      accessToken: string;
    }>(`${apiUrl}/admin/auth/refresh`, {
      method: 'POST',
      body: {
        refreshToken,
      },
    });

    // 새로운 access token을 쿠키에 저장
    setAdminAccessTokenCookie(event, response.accessToken);

    return {
      accessToken: response.accessToken,
    };
  } catch (error: any) {
    // Refresh token이 만료되었거나 유효하지 않으면 쿠키 삭제
    clearAdminAuthCookies(event);

    throw createError({
      statusCode: 401,
      statusMessage: error.data?.message || 'Admin token refresh failed',
    });
  }
});
