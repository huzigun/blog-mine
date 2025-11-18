import {
  setAccessTokenCookie,
  setRefreshTokenCookie,
} from '~~/server/utils/cookies';

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const body = await readBody(event);

  try {
    // Backend API 호출
    const response = await $fetch<{
      accessToken: string;
      refreshToken: string;
      user: {
        id: number;
        email: string;
        name: string | null;
      };
    }>(`${config.public.apiBaseUrl}/auth/login`, {
      method: 'POST',
      body,
    });

    // 환경별 쿠키 설정 (헬퍼 함수 사용)
    setAccessTokenCookie(event, response.accessToken);
    setRefreshTokenCookie(event, response.refreshToken);

    // 응답에서는 refresh token 제외 (보안)
    return {
      accessToken: response.accessToken,
      user: response.user,
    };
  } catch (error: any) {
    throw createError({
      statusCode: error.response?.status || 500,
      statusMessage: error.data?.message || 'Login failed',
    });
  }
});
