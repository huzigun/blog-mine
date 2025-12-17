export default defineNuxtRouteMiddleware(async (to) => {
  const { isAdminAuthenticated, adminAccessToken, fetchAdminProfile, refreshAccessToken } =
    useAdminAuth()

  // 이미 인증된 상태
  if (isAdminAuthenticated.value) {
    return
  }

  // 토큰이 있으면 프로필 가져오기 시도
  if (adminAccessToken.value) {
    const profile = await fetchAdminProfile()
    if (profile) {
      return
    }

    // 프로필 가져오기 실패 시 토큰 갱신 시도
    const refreshed = await refreshAccessToken()
    if (refreshed) {
      const retryProfile = await fetchAdminProfile()
      if (retryProfile) {
        return
      }
    }
  }

  // 인증 실패 시 로그인 페이지로 리다이렉트
  return navigateTo('/admin/login')
})
