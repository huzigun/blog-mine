/**
 * 구독 전용 미들웨어
 * - 구독이 필요한 기능(페이지)에만 선택적으로 적용
 * - 활성 구독(ACTIVE 또는 TRIAL) 체크
 * - 구독 정보가 없으면 1회 로드
 */
export default defineNuxtRouteMiddleware(async (to, from) => {
  const auth = useAuth();

  // 구독 정보가 없으면 먼저 로드
  if (!auth.subscription) {
    await auth.fetchUser();
  }

  // 활성 구독이 없으면 pricing 페이지로 리다이렉트
  if (!auth.hasActiveSubscription) {
    return navigateTo(
      {
        path: '/pricing',
        query: { redirect: to.fullPath },
      },
      { replace: true, redirectCode: 302 },
    );
  }
});
