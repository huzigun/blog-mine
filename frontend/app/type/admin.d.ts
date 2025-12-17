export type AdminRole = 'SUPER_ADMIN' | 'ADMIN' | 'SUPPORT' | 'VIEWER'

export interface Admin {
  id: number
  email: string
  name: string
  role: AdminRole
  isActive: boolean
  lastLoginAt?: string
  createdAt: string
}

export interface AdminAuthResponse {
  accessToken: string
  refreshToken: string
  admin: {
    id: number
    email: string
    name: string
    role: AdminRole
  }
}

export interface AdminLoginDto {
  email: string
  password: string
}

export interface AdminProfile {
  id: number
  email: string
  name: string
  role: AdminRole
  isActive: boolean
  lastLoginAt?: string
  createdAt: string
}
