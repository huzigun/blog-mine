import { z } from 'zod'

/**
 * 로그인 폼 스키마
 */
export const loginSchema = z.object({
  email: z
    .string({ required_error: '이메일을 입력해주세요' })
    .email('올바른 이메일 형식이 아닙니다')
    .min(1, '이메일을 입력해주세요'),
  password: z
    .string({ required_error: '비밀번호를 입력해주세요' })
    .min(6, '비밀번호는 최소 6자 이상이어야 합니다')
    .max(100, '비밀번호는 최대 100자까지 입력 가능합니다'),
})

export type LoginSchema = z.infer<typeof loginSchema>

/**
 * 회원가입 폼 스키마
 */
export const registerSchema = z.object({
  name: z
    .string({ required_error: '이름을 입력해주세요' })
    .min(2, '이름은 최소 2자 이상이어야 합니다')
    .max(50, '이름은 최대 50자까지 입력 가능합니다'),
  email: z
    .string({ required_error: '이메일을 입력해주세요' })
    .email('올바른 이메일 형식이 아닙니다')
    .min(1, '이메일을 입력해주세요'),
  password: z
    .string({ required_error: '비밀번호를 입력해주세요' })
    .min(8, '비밀번호는 최소 8자 이상이어야 합니다')
    .max(100, '비밀번호는 최대 100자까지 입력 가능합니다')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      '비밀번호는 대문자, 소문자, 숫자, 특수문자를 포함해야 합니다'
    ),
  confirmPassword: z
    .string({ required_error: '비밀번호 확인을 입력해주세요' }),
}).refine((data) => data.password === data.confirmPassword, {
  message: '비밀번호가 일치하지 않습니다',
  path: ['confirmPassword'],
})

export type RegisterSchema = z.infer<typeof registerSchema>

/**
 * 비밀번호 재설정 요청 스키마
 */
export const forgotPasswordSchema = z.object({
  email: z
    .string({ required_error: '이메일을 입력해주세요' })
    .email('올바른 이메일 형식이 아닙니다')
    .min(1, '이메일을 입력해주세요'),
})

export type ForgotPasswordSchema = z.infer<typeof forgotPasswordSchema>

/**
 * 비밀번호 재설정 스키마
 */
export const resetPasswordSchema = z.object({
  password: z
    .string({ required_error: '새 비밀번호를 입력해주세요' })
    .min(8, '비밀번호는 최소 8자 이상이어야 합니다')
    .max(100, '비밀번호는 최대 100자까지 입력 가능합니다')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      '비밀번호는 대문자, 소문자, 숫자, 특수문자를 포함해야 합니다'
    ),
  confirmPassword: z
    .string({ required_error: '비밀번호 확인을 입력해주세요' }),
}).refine((data) => data.password === data.confirmPassword, {
  message: '비밀번호가 일치하지 않습니다',
  path: ['confirmPassword'],
})

export type ResetPasswordSchema = z.infer<typeof resetPasswordSchema>
