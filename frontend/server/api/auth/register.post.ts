export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const body = await readBody(event)

  try {
    // Backend API 호출
    const response = await $fetch<{
      accessToken: string
      refreshToken: string
      user: {
        id: number
        email: string
        name: string | null
      }
    }>(`${config.public.apiBaseUrl}/auth/register`, {
      method: 'POST',
      body,
    })

    // Access token은 일반 쿠키로
    setCookie(event, 'access_token', response.accessToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 15, // 15 minutes
      path: '/',
    })

    // Refresh token은 httpOnly 쿠키로
    setCookie(event, 'refresh_token', response.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    })

    return {
      accessToken: response.accessToken,
      user: response.user,
    }
  } catch (error: any) {
    throw createError({
      statusCode: error.response?.status || 500,
      statusMessage: error.data?.message || 'Registration failed',
    })
  }
})
