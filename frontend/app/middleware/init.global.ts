export default defineNuxtRouteMiddleware(async (to, from) => {
  const auth = useAuth();

  // 서버 사이드: refresh token으로 인증 및 데이터 로드
  if (import.meta.server) {
    const refreshToken = useCookie('refresh_token');

    if (refreshToken.value) {
      const accessToken = await useRefreshToken(refreshToken.value);
      if (accessToken) {
        auth.setAccessToken(accessToken);

        // 사용자 정보, 구독 정보, BloC 잔액을 병렬로 가져오기
        const [user] = await Promise.all([
          auth.fetchUser(),
          auth.fetchSubscription(),
          auth.fetchCreditBalance(),
        ]);

        if (user) {
          auth.setUser(user);
        }
      }
    }
  }

  // 클라이언트 사이드: 인증되어 있지만 데이터가 없으면 로드
  if (import.meta.client) {
    if (auth.accessToken) {
      const promises = [];
      if (!auth.subscription) {
        promises.push(auth.fetchSubscription());
      }
      if (!auth.creditBalance) {
        promises.push(auth.fetchCreditBalance());
      }

      if (promises.length > 0) {
        try {
          await Promise.all(promises);
        } catch (error) {
          console.error('Failed to fetch data on client:', error);
        }
      }
    }
  }
});
