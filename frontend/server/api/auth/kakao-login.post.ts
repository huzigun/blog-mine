import {
  setAccessTokenCookie,
  setRefreshTokenCookie,
} from '~~/server/utils/cookies';

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const body = await readBody(event);
  const isDev = import.meta.dev;
  const apiUrl = isDev ? 'http://localhost:9706' : config.public.apiBaseUrl;

  try {
    // Backend API 호출 (redirectUri 포함)
    const response = await $fetch<{
      accessToken: string;
      refreshToken: string;
      user: {
        id: number;
        email: string;
        name: string | null;
      };
      isAccountLinked?: boolean;
    }>(`${apiUrl}/auth/kakao-login`, {
      method: 'POST',
      body: {
        code: body.code,
        redirectUri: body.redirectUri, // 프론트엔드에서 실제 사용한 redirect URI 전달
      },
    });

    // 환경별 쿠키 설정 (헬퍼 함수 사용)
    setAccessTokenCookie(event, response.accessToken);
    setRefreshTokenCookie(event, response.refreshToken);

    // 응답에서는 refresh token 제외 (보안)
    return {
      accessToken: response.accessToken,
      user: response.user,
      isAccountLinked: response.isAccountLinked,
    };
  } catch (error: any) {
    throw createError({
      statusCode: error.response?.status || 500,
      statusMessage:
        error.response?._data?.message || 'Kakao login failed',
    });
  }
});
