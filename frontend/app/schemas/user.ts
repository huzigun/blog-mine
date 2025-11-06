import { z } from 'zod'

/**
 * 사용자 프로필 업데이트 스키마
 */
export const updateProfileSchema = z.object({
  name: z
    .string({ required_error: '이름을 입력해주세요' })
    .min(2, '이름은 최소 2자 이상이어야 합니다')
    .max(50, '이름은 최대 50자까지 입력 가능합니다')
    .optional(),
  bio: z
    .string()
    .max(500, '자기소개는 최대 500자까지 입력 가능합니다')
    .optional(),
  avatar: z
    .string()
    .url('올바른 URL 형식이 아닙니다')
    .optional(),
  website: z
    .string()
    .url('올바른 URL 형식이 아닙니다')
    .optional(),
})

export type UpdateProfileSchema = z.infer<typeof updateProfileSchema>

/**
 * 비밀번호 변경 스키마
 */
export const changePasswordSchema = z.object({
  currentPassword: z
    .string({ required_error: '현재 비밀번호를 입력해주세요' })
    .min(1, '현재 비밀번호를 입력해주세요'),
  newPassword: z
    .string({ required_error: '새 비밀번호를 입력해주세요' })
    .min(8, '비밀번호는 최소 8자 이상이어야 합니다')
    .max(100, '비밀번호는 최대 100자까지 입력 가능합니다')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      '비밀번호는 대문자, 소문자, 숫자, 특수문자를 포함해야 합니다'
    ),
  confirmPassword: z
    .string({ required_error: '비밀번호 확인을 입력해주세요' }),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: '비밀번호가 일치하지 않습니다',
  path: ['confirmPassword'],
}).refine((data) => data.currentPassword !== data.newPassword, {
  message: '새 비밀번호는 현재 비밀번호와 달라야 합니다',
  path: ['newPassword'],
})

export type ChangePasswordSchema = z.infer<typeof changePasswordSchema>

/**
 * 이메일 변경 스키마
 */
export const changeEmailSchema = z.object({
  newEmail: z
    .string({ required_error: '새 이메일을 입력해주세요' })
    .email('올바른 이메일 형식이 아닙니다')
    .min(1, '새 이메일을 입력해주세요'),
  password: z
    .string({ required_error: '비밀번호를 입력해주세요' })
    .min(1, '비밀번호를 입력해주세요'),
})

export type ChangeEmailSchema = z.infer<typeof changeEmailSchema>
