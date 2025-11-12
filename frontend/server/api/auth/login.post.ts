export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const body = await readBody(event);

  console.log('Login attempt with body:', body);

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

    // Access token은 일반 쿠키로 (클라이언트에서 읽을 수 있음)
    setCookie(event, 'access_token', response.accessToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 15, // 15 minutes
      path: '/',
    });

    // Refresh token은 httpOnly 쿠키로 (보안)
    setCookie(event, 'refresh_token', response.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    // 응답에서는 refresh token 제외
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
