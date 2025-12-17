export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const body = await readBody(event);
  const isDev = import.meta.dev;
  const apiUrl = isDev ? 'http://localhost:9706' : config.public.apiBaseUrl;

  try {
    const response = await $fetch<
      Array<{
        maskedEmail: string;
        createdAt: string;
        hasKakao: boolean;
      }>
    >(`${apiUrl}/auth/find-email`, {
      method: 'POST',
      body,
    });

    return response;
  } catch (error: any) {
    throw createError({
      statusCode: error.response?.status || 500,
      statusMessage: error.response?._data?.message || '아이디 찾기에 실패했습니다.',
    });
  }
});
