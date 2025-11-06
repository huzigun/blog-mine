export default defineNuxtPlugin(() => {
  const { refreshToken } = useAuth()
  const accessToken = useCookie('access_token')

  // Access token이 있으면 자동 갱신 체크 시작
  if (accessToken.value && process.client) {
    // 10분마다 토큰 상태 체크 (access token은 15분)
    const interval = setInterval(async () => {
      if (!accessToken.value) {
        clearInterval(interval)
        return
      }

      // Access token 갱신 시도
      await refreshToken()
    }, 10 * 60 * 1000) // 10 minutes

    // 페이지 언로드 시 interval 정리
    if (process.client) {
      window.addEventListener('beforeunload', () => {
        clearInterval(interval)
      })
    }
  }
})
