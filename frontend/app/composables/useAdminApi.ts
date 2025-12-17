import type { UseFetchOptions } from '#app'
import type { FetchContext, FetchResponse } from 'ofetch'

async function onRequest({ options }: FetchContext<any>) {
  const config = useRuntimeConfig()
  const isDev = import.meta.dev
  // 배포 환경일때는 실제 도메인으로 요청
  options.baseURL = isDev ? 'http://localhost:9706' : config.public.apiBaseUrl

  // 관리자 access token 가져오기
  const adminAccessToken = useCookie('admin_access_token')

  if (adminAccessToken.value) {
    options.headers = new Headers({
      ...options.headers,
      Authorization: `Bearer ${adminAccessToken.value}`,
    })
  }
}

async function onResponseError({
  response,
  options,
}: FetchContext<any> & {
  response: FetchResponse<ResponseType>
}): Promise<void> {
  // 토큰 만료 에러 (498)
  if (response.status === 498 && response._data?.message === 'Token expired') {
    try {
      // Nuxt API를 통해 토큰 재발급 (httpOnly 쿠키 자동 전송)
      const data = await $fetch<{ accessToken: string }>('/api/admin/auth/refresh', {
        method: 'POST',
      })

      // 새로운 access token 저장 (쿠키는 서버에서 자동 설정됨)
      const adminAccessToken = useCookie('admin_access_token')
      adminAccessToken.value = data.accessToken

      // 요청 헤더에 새 토큰 업데이트
      options.headers = new Headers({
        ...options.headers,
        Authorization: `Bearer ${data.accessToken}`,
      })

      // 재시도 플래그 설정 (ofetch가 자동으로 재시도)
      if (options.retry === undefined) {
        options.retry = 1 // 1회만 재시도
      }
    } catch (error: any) {
      // 토큰 재발급 실패 시 로그인 페이지로 이동
      console.error('Admin token refresh failed:', error)
      const adminAccessToken = useCookie('admin_access_token')
      adminAccessToken.value = null
      navigateTo('/admin/login')
    }
  }
}

export const useAdminApi = $fetch.create({
  retryStatusCodes: [498],
  onRequest,
  onResponse() {
    // response._data = new myBusinessResponse(response._data)
  },
  onResponseError,
})

export function useAdminApiFetch<T>(url: string | (() => string), options: UseFetchOptions<T> = {}) {
  return useFetch(url, {
    ...options,
    $fetch: useAdminApi,
  })
}
