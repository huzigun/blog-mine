import {
  setAdminAccessTokenCookie,
  setAdminRefreshTokenCookie,
} from '~~/server/utils/cookies';

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const body = await readBody(event);
  const isDev = import.meta.dev;
  const apiUrl = isDev ? 'http://localhost:9706' : config.public.apiBaseUrl;

  try {
    // Backend Admin API 호출
    const response = await $fetch<{
      accessToken: string;
      refreshToken: string;
      admin: {
        id: number;
        email: string;
        name: string;
        role: string;
      };
    }>(`${apiUrl}/admin/auth/login`, {
      method: 'POST',
      body,
    });

    // 환경별 쿠키 설정 (관리자 전용 쿠키)
    setAdminAccessTokenCookie(event, response.accessToken);
    setAdminRefreshTokenCookie(event, response.refreshToken);

    // 응답에서는 refresh token 제외 (보안)
    return {
      accessToken: response.accessToken,
      admin: response.admin,
    };
  } catch (error: any) {
    throw createError({
      statusCode: error.response?.status || 500,
      statusMessage: error.response?._data?.message || 'Admin login failed',
    });
  }
});
