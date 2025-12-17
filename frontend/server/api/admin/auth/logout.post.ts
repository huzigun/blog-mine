import { clearAdminAuthCookies } from '~~/server/utils/cookies';

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const isDev = import.meta.dev;
  const apiUrl = isDev ? 'http://localhost:9706' : config.public.apiBaseUrl;

  // Access token 가져오기
  const accessToken = getCookie(event, 'admin_access_token');
  const refreshToken = getCookie(event, 'admin_refresh_token');

  if (accessToken && refreshToken) {
    try {
      // Backend API 호출 (refresh token 삭제)
      await $fetch(`${apiUrl}/admin/auth/logout`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: {
          refreshToken,
        },
      });
    } catch (error) {
      // 에러가 발생해도 쿠키는 삭제
      console.error('Admin logout error:', error);
    }
  }

  // 쿠키 삭제 (관리자 전용)
  clearAdminAuthCookies(event);

  return {
    message: 'Successfully logged out',
  };
});
