import type { ZodSchema, ZodError } from 'zod'
import type { FormError } from '#ui/types'

/**
 * Zod 스키마를 사용한 폼 유효성 검증 composable
 */
export function useFormValidation() {
  /**
   * Zod 스키마를 사용하여 데이터를 검증하고 FormError 배열로 변환
   * @param schema - Zod 스키마
   * @param data - 검증할 데이터
   * @returns FormError 배열 (유효하면 빈 배열)
   */
  function validateWithSchema<T>(schema: ZodSchema<T>, data: unknown): FormError[] {
    const result = schema.safeParse(data)

    if (result.success) {
      return []
    }

    return zodErrorToFormErrors(result.error)
  }

  /**
   * ZodError를 Nuxt UI FormError 형식으로 변환
   * @param error - ZodError 객체
   * @returns FormError 배열
   */
  function zodErrorToFormErrors(error: ZodError): FormError[] {
    return error.errors.map((err) => ({
      path: err.path.join('.'),
      message: err.message,
    }))
  }

  /**
   * 비동기 검증 래퍼 (API 호출 등)
   * @param fn - 비동기 검증 함수
   * @returns 에러 메시지 또는 undefined
   */
  async function asyncValidate<T>(
    fn: () => Promise<T>
  ): Promise<string | undefined> {
    try {
      await fn()
      return undefined
    } catch (error: any) {
      return error?.message || '검증 중 오류가 발생했습니다'
    }
  }

  return {
    validateWithSchema,
    zodErrorToFormErrors,
    asyncValidate,
  }
}
