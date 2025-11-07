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
  error,
}: FetchContext<any> & { response: FetchResponse<ResponseType> }) {
  if (response.status === 498 && response._data?.message === 'Token expired') {
    const config = useRuntimeConfig();
    const refreshToken = useCookie('refresh_token');

    try {
      const response = await $fetch<{ accessToken: string }>(
        `${config.public.apiBaseUrl}/auth/refresh`,
        { method: 'POST', body: { refreshToken: refreshToken.value } },
      );
      options.retry = 1;

      const auth = useAuth();
      auth.setAccessToken(response.accessToken);
    } catch (error: any) {
      navigateTo('/login');
    }
  }
}

export const useApi = $fetch.create({
  retryStatusCodes: [401, 498],
  onRequest,
  onResponse({ response }) {
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
