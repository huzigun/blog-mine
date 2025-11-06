export interface User {
  id: number
  email: string
  name: string | null
}

export interface AuthResponse {
  accessToken: string
  user: User
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  email: string
  password: string
  name?: string
}

export const useAuth = () => {
  const router = useRouter()
  const user = useState<User | null>('user', () => null)
  const token = useCookie('access_token')

  const isAuthenticated = computed(() => !!token.value && !!user.value)

  const login = async (credentials: LoginCredentials): Promise<AuthResponse> => {
    // Nuxt server API 호출 (쿠키는 서버에서 자동 설정됨)
    const data = await $fetch<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: credentials,
    })

    user.value = data.user

    return data
  }

  const register = async (registerData: RegisterData): Promise<AuthResponse> => {
    const data = await $fetch<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: registerData,
    })

    user.value = data.user

    return data
  }

  const logout = async () => {
    try {
      await $fetch('/api/auth/logout', {
        method: 'POST',
      })
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      user.value = null
      await router.push('/login')
    }
  }

  const refreshToken = async (): Promise<string | null> => {
    try {
      const data = await $fetch<{ accessToken: string }>('/api/auth/refresh', {
        method: 'POST',
      })
      return data.accessToken
    } catch (error) {
      console.error('Token refresh error:', error)
      user.value = null
      return null
    }
  }

  const fetchUser = async (): Promise<User | null> => {
    if (!token.value) {
      user.value = null
      return null
    }

    try {
      const config = useRuntimeConfig()
      const data = await $fetch<User>(`${config.public.apiBaseUrl}/user/me`, {
        headers: {
          Authorization: `Bearer ${token.value}`,
        },
      })
      user.value = data
      return data
    } catch (error: any) {
      // 401 에러면 token refresh 시도
      if (error?.response?.status === 401) {
        const newToken = await refreshToken()
        if (newToken) {
          // Retry with new token
          return fetchUser()
        }
      }

      console.error('Fetch user error:', error)
      user.value = null
      return null
    }
  }

  return {
    user: readonly(user),
    isAuthenticated,
    login,
    register,
    logout,
    refreshToken,
    fetchUser,
  }
}
