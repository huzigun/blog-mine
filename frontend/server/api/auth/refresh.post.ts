import {
  clearAuthCookies,
  setAccessTokenCookie,
} from '~~/server/utils/cookies';

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();

  // httpOnly 쿠키에서 refresh token 읽기
  // const refreshToken = getCookie(event, 'refresh_token');
  const data = await readBody<{ token?: string }>(event);
  const refreshToken = data.token;

  if (!refreshToken) {
    throw createError({
      statusCode: 401,
      statusMessage: 'No refresh token',
    });
  }

  const isDev = import.meta.dev;
  const apiUrl = isDev ? 'http://localhost:9706' : config.public.apiBaseUrl;

  try {
    // Backend API 호출 (body로 refreshToken 전달)
    const response = await $fetch<{
      accessToken: string;
    }>(`${apiUrl}/auth/refresh`, {
      method: 'POST',
      body: {
        refreshToken,
      },
    });

    // 새로운 access token을 쿠키에 저장 (헬퍼 함수 사용)
    setAccessTokenCookie(event, response.accessToken);

    return {
      accessToken: response.accessToken,
    };
  } catch (error: any) {
    // Refresh token이 만료되었거나 유효하지 않으면 쿠키 삭제
    clearAuthCookies(event);

    throw createError({
      statusCode: 401,
      statusMessage: error.data?.message || 'Token refresh failed',
    });
  }
});
