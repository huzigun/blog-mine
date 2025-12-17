export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const body = await readBody(event);
  const isDev = import.meta.dev;
  const apiUrl = isDev ? 'http://localhost:9706' : config.public.apiBaseUrl;

  try {
    const response = await $fetch<{ message: string }>(
      `${apiUrl}/auth/reset-password`,
      {
        method: 'POST',
        body,
      },
    );

    return response;
  } catch (error: any) {
    throw createError({
      statusCode: error.response?.status || 500,
      statusMessage:
        error.response?._data?.message || '비밀번호 변경에 실패했습니다.',
    });
  }
});
