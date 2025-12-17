import type { AdminRole } from '~/type/admin'
import { useAdminApi } from '~/composables/useAdminApi'

interface AdminUser {
  id: number
  email: string
  name: string
  role: AdminRole
  isActive?: boolean
  lastLoginAt?: string
  createdAt?: string
}

interface AdminLoginCredentials {
  email: string
  password: string
}

interface AdminAuthResponse {
  accessToken: string
  admin: AdminUser
}

export const useAdminAuth = () => {
  const adminUser = useState<AdminUser | null>('admin-user', () => null)
  const adminAccessToken = useCookie('admin_access_token')

  const isAdminAuthenticated = computed(() => !!adminAccessToken.value && !!adminUser.value)

  /**
   * 관리자 로그인 (Nuxt API 프록시 사용)
   */
  const login = async (credentials: AdminLoginCredentials): Promise<AdminAuthResponse> => {
    // Nuxt server API 호출 (쿠키는 서버에서 자동 설정됨)
    const response = await $fetch<AdminAuthResponse>('/api/admin/auth/login', {
      method: 'POST',
      body: credentials,
    })

    adminAccessToken.value = response.accessToken
    adminUser.value = response.admin

    return response
  }

  /**
   * 관리자 로그아웃 (Nuxt API 프록시 사용)
   */
  const logout = async () => {
    try {
      // Nuxt API를 통해 로그아웃 (httpOnly 쿠키 삭제)
      await $fetch('/api/admin/auth/logout', { method: 'POST' })
    } catch (error) {
      console.error('Admin logout error:', error)
    } finally {
      adminAccessToken.value = null
      adminUser.value = null
      navigateTo('/admin/login')
    }
  }

  /**
   * 토큰 갱신 (Nuxt API 프록시 사용)
   */
  const refreshAccessToken = async (): Promise<boolean> => {
    try {
      // Nuxt API를 통해 토큰 재발급 (httpOnly 쿠키 자동 전송)
      const response = await $fetch<{ accessToken: string }>('/api/admin/auth/refresh', {
        method: 'POST',
      })

      adminAccessToken.value = response.accessToken
      return true
    } catch (error) {
      console.error('Admin token refresh failed:', error)
      adminAccessToken.value = null
      adminUser.value = null
      return false
    }
  }

  /**
   * 관리자 프로필 조회 (useAdminApi 사용)
   */
  const fetchAdminProfile = async () => {
    if (!adminAccessToken.value) return null

    try {
      const profile = await useAdminApi<AdminUser>('/admin/auth/profile')
      adminUser.value = profile
      return profile
    } catch (error) {
      console.error('Failed to fetch admin profile:', error)
      // 토큰 갱신 시도
      const refreshed = await refreshAccessToken()
      if (refreshed) {
        return fetchAdminProfile()
      }
      return null
    }
  }

  /**
   * 특정 역할 보유 확인
   */
  const hasRole = (requiredRoles: AdminRole[]): boolean => {
    if (!adminUser.value) return false
    return requiredRoles.includes(adminUser.value.role)
  }

  /**
   * 최소 역할 등급 확인 (계층적)
   */
  const hasMinRole = (minRole: AdminRole): boolean => {
    if (!adminUser.value) return false

    const roleHierarchy: Record<AdminRole, number> = {
      SUPER_ADMIN: 4,
      ADMIN: 3,
      SUPPORT: 2,
      VIEWER: 1,
    }

    return roleHierarchy[adminUser.value.role] >= roleHierarchy[minRole]
  }

  return {
    adminUser,
    adminAccessToken,
    isAdminAuthenticated,
    login,
    logout,
    refreshAccessToken,
    fetchAdminProfile,
    hasRole,
    hasMinRole,
  }
}
