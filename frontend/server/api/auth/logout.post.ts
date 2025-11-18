import { clearAuthCookies } from '~~/server/utils/cookies';

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();

  // Access token 가져오기
  const accessToken = getCookie(event, 'access_token');

  if (accessToken) {
    try {
      // Backend API 호출 (refresh token 삭제)
      await $fetch(`${config.public.apiBaseUrl}/auth/logout`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
    } catch (error) {
      // 에러가 발생해도 쿠키는 삭제
      console.error('Logout error:', error);
    }
  }

  // 쿠키 삭제 (헬퍼 함수 사용)
  clearAuthCookies(event);

  return {
    message: 'Successfully logged out',
  };
});
