export default defineNuxtRouteMiddleware(async (to, from) => {
  const auth = useAuth();

  // 서버 사이드: refresh token으로 인증 및 데이터 로드
  if (import.meta.server) {
    const refreshToken = useCookie('refresh_token');

    if (refreshToken.value) {
      const accessToken = await useRefreshToken(refreshToken.value);
      if (accessToken) {
        auth.setAccessToken(accessToken);

        // 사용자 정보와 구독 정보를 병렬로 가져오기
        const [user] = await Promise.all([
          auth.fetchUser(),
          auth.fetchSubscription(),
        ]);

        if (user) {
          auth.setUser(user);
        }
      }
    }
  }

  // 클라이언트 사이드: 인증되어 있지만 구독 정보가 없으면 로드
  if (import.meta.client) {
    if (auth.accessToken && !auth.subscription) {
      try {
        await auth.fetchSubscription();
      } catch (error) {
        console.error('Failed to fetch subscription on client:', error);
      }
    }
  }
});
