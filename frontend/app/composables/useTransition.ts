/**
 * useTransition - React의 useTransition과 유사한 Vue/Nuxt composable
 *
 * 비동기 상태 전환을 로딩 상태와 함께 관리하여, 업데이트를 긴급하지 않은 것으로
 * 표시하고 전환 중에 로딩 표시기를 표시할 수 있습니다.
 *
 * @example
 * ```vue
 * <script setup>
 * const [isPending, startTransition] = useTransition()
 *
 * async function handleSubmit() {
 *   await startTransition(async () => {
 *     await someAsyncOperation()
 *   })
 * }
 * </script>
 *
 * <template>
 *   <button :disabled="isPending">
 *     {{ isPending ? 'Loading...' : 'Submit' }}
 *   </button>
 * </template>
 * ```
 */

export interface TransitionOptions {
  /**
   * 전환이 시작될 때 실행할 선택적 콜백
   */
  onStart?: () => void

  /**
   * 전환이 성공했을 때 실행할 선택적 콜백
   */
  onSuccess?: () => void

  /**
   * 전환이 실패했을 때 실행할 선택적 콜백
   * @param error - 발생한 오류
   */
  onError?: (error: Error) => void

  /**
   * 전환이 완료되었을 때(성공 또는 실패) 실행할 선택적 콜백
   */
  onComplete?: () => void

  /**
   * 로딩 상태를 표시할 최소 지속 시간(밀리초)
   * 빠른 작업에 대한 로딩 상태의 깜빡임을 방지합니다
   * @default 0
   */
  minDuration?: number
}

export type TransitionCallback<T = void> = () => T | Promise<T>

export type StartTransition = <T = void>(
  callback: TransitionCallback<T>,
  options?: TransitionOptions,
) => Promise<T>

/**
 * 비동기 작업을 처리하기 위한 전환 상태 관리자를 생성합니다
 *
 * @returns [isPending, startTransition] 튜플을 반환합니다:
 *   - isPending: Ref<boolean> - 반응형 로딩 상태
 *   - startTransition: Function - 비동기 작업을 로딩 상태와 함께 래핑합니다
 *
 * @example
 * ```ts
 * const [isPending, startTransition] = useTransition()
 *
 * await startTransition(async () => {
 *   await api.updateUser(data)
 * }, {
 *   onSuccess: () => toast.success('Updated!'),
 *   onError: (error) => toast.error(error.message)
 * })
 * ```
 */
export function useTransition(): [Ref<boolean>, StartTransition] {
  const isPending = ref(false)

  const startTransition: StartTransition = async <T = void>(
    callback: TransitionCallback<T>,
    options: TransitionOptions = {},
  ): Promise<T> => {
    const {
      onStart,
      onSuccess,
      onError,
      onComplete,
      minDuration = 0,
    } = options

    // minDuration을 위한 시작 시간 추적
    const startTime = Date.now()

    // 대기 상태 설정
    isPending.value = true
    onStart?.()

    try {
      // 콜백 실행
      const result = await callback()

      // 지정된 경우 최소 지속 시간 보장
      if (minDuration > 0) {
        const elapsed = Date.now() - startTime
        const remaining = minDuration - elapsed
        if (remaining > 0) {
          await new Promise((resolve) => setTimeout(resolve, remaining))
        }
      }

      // 성공 콜백 호출
      onSuccess?.()

      return result
    } catch (error) {
      // 오류 콜백 호출
      onError?.(error as Error)
      throw error
    } finally {
      // 대기 상태 초기화 및 완료 콜백 호출
      isPending.value = false
      onComplete?.()
    }
  }

  return [isPending, startTransition]
}

/**
 * 튜플 대신 객체를 반환하는 Hook 변형
 * 배열 구조 분해보다 명명된 속성을 선호할 때 유용합니다
 *
 * @example
 * ```ts
 * const transition = useAsyncTransition()
 *
 * await transition.start(async () => {
 *   await api.call()
 * })
 *
 * if (transition.isPending.value) {
 *   // 로딩 표시
 * }
 * ```
 */
export function useAsyncTransition() {
  const [isPending, startTransition] = useTransition()

  return {
    isPending,
    start: startTransition,
  }
}

/**
 * 내장 오류 처리 기능이 있는 고급 Hook
 *
 * @param defaultOptions - 모든 전환에 대한 기본 옵션
 * @returns 전환 상태 및 메서드를 포함하는 객체
 *
 * @example
 * ```ts
 * const { isPending, startTransition, error, reset } = useTransitionWithError({
 *   onError: (error) => console.error(error)
 * })
 *
 * await startTransition(async () => {
 *   await riskyOperation()
 * })
 *
 * if (error.value) {
 *   // 오류 처리
 * }
 * ```
 */
export function useTransitionWithError(defaultOptions: TransitionOptions = {}) {
  const [isPending, startTransition] = useTransition()
  const error = ref<Error | null>(null)

  const wrappedStartTransition: StartTransition = async (callback, options = {}) => {
    // 오류 상태 초기화
    error.value = null

    // 옵션 병합
    const mergedOptions: TransitionOptions = {
      ...defaultOptions,
      ...options,
      onError: (err) => {
        error.value = err
        defaultOptions.onError?.(err)
        options.onError?.(err)
      },
    }

    return startTransition(callback, mergedOptions)
  }

  const reset = () => {
    error.value = null
  }

  return {
    isPending,
    error,
    startTransition: wrappedStartTransition,
    reset,
  }
}

/**
 * 여러 개의 동시 전환을 처리하는 Hook
 * 여러 비동기 작업을 동시에 관리할 때 유용합니다
 *
 * @example
 * ```ts
 * const transitions = useTransitions()
 *
 * // 명명된 전환 생성
 * await transitions.start('save', async () => {
 *   await saveData()
 * })
 *
 * await transitions.start('delete', async () => {
 *   await deleteData()
 * })
 *
 * // 개별 상태 확인
 * if (transitions.isPending('save').value) {
 *   // 저장 중
 * }
 *
 * // 어떤 전환이라도 진행 중인지 확인
 * if (transitions.isAnyPending.value) {
 *   // 최소 하나의 전환이 진행 중
 * }
 * ```
 */
export function useTransitions() {
  const transitions = reactive<Record<string, boolean>>({})

  const isPending = (key: string) => computed(() => transitions[key] ?? false)

  const isAnyPending = computed(() =>
    Object.values(transitions).some((pending) => pending),
  )

  const start = async <T = void>(
    key: string,
    callback: TransitionCallback<T>,
    options: TransitionOptions = {},
  ): Promise<T> => {
    transitions[key] = true
    options.onStart?.()

    try {
      const result = await callback()
      options.onSuccess?.()
      return result
    } catch (error) {
      options.onError?.(error as Error)
      throw error
    } finally {
      transitions[key] = false
      options.onComplete?.()
    }
  }

  const reset = (key?: string) => {
    if (key) {
      delete transitions[key]
    } else {
      Object.keys(transitions).forEach((k) => delete transitions[k])
    }
  }

  return {
    isPending,
    isAnyPending,
    start,
    reset,
    transitions: readonly(transitions),
  }
}
