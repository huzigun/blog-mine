import type { UseFetchOptions } from '#app';
import type { FetchContext, FetchResponse } from 'ofetch';

export const useRefreshToken = async (
  token?: string,
): Promise<string | null> => {
  const refreshToken = token || useCookie('refresh_token').value;

  try {
    const data = await $fetch<{ accessToken: string }>('/api/auth/refresh', {
      method: 'POST',
      body: { refreshToken },
    });
    return data.accessToken;
  } catch (error) {
    return null;
  }
};

async function onRequest({ options }: FetchContext<any>) {
  const config = useRuntimeConfig();
  options.baseURL = config.public.apiBaseUrl;

  const auth = useAuth();
  const accessToken = auth.accessToken;

  if (accessToken) {
    options.headers = new Headers({
      ...options.headers,
      Authorization: `Bearer ${accessToken}`,
    });
  }
}

async function onResponseError({
  response,
  options,
}: FetchContext<any> & {
  response: FetchResponse<ResponseType>;
}): Promise<void> {
  // 토큰 만료 에러 (498)
  if (response.status === 498 && response._data?.message === 'Token expired') {
    const config = useRuntimeConfig();
    const refreshToken = useCookie('refresh_token');
    const auth = useAuth();

    // refresh token이 없으면 로그인 페이지로 이동
    if (!refreshToken.value) {
      auth.logout();
      navigateTo('/auth/login');
      return;
    }

    try {
      // 토큰 재발급 시도
      const data = await $fetch<{ accessToken: string }>(
        `${config.public.apiBaseUrl}/auth/refresh`,
        {
          method: 'POST',
          body: { refreshToken: refreshToken.value },
        },
      );

      // 새로운 access token 저장
      auth.setAccessToken(data.accessToken);

      // 요청 헤더에 새 토큰 업데이트
      options.headers = new Headers({
        ...options.headers,
        Authorization: `Bearer ${data.accessToken}`,
      });

      // 재시도 플래그 설정 (ofetch가 자동으로 재시도)
      if (options.retry === undefined) {
        options.retry = 1; // 1회만 재시도
      }
    } catch (error: any) {
      // 토큰 재발급 실패 시 로그아웃 및 로그인 페이지로 이동
      console.error('Token refresh failed:', error);
      auth.logout();
    }
  }
}

export const useApi = $fetch.create({
  retryStatusCodes: [498],
  onRequest,
  onResponse() {
    // response._data = new myBusinessResponse(response._data)
  },
  onResponseError,
});

export function useApiFetch<T>(
  url: string | (() => string),
  options: UseFetchOptions<T> = {},
) {
  return useFetch(url, {
    ...options,
    $fetch: useApi,
  });
}
