<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '#ui/types'

definePageMeta({
  layout: 'auth',
})

const toast = useToast()
const { login, isAdminAuthenticated } = useAdminAuth()

// 이미 로그인된 경우 대시보드로 리다이렉트
watch(
  isAdminAuthenticated,
  (isAuth) => {
    if (isAuth) {
      navigateTo('/admin')
    }
  },
  { immediate: true }
)

const loginSchema = z.object({
  email: z.string().email('올바른 이메일 형식이 아닙니다'),
  password: z.string().min(8, '비밀번호는 8자 이상이어야 합니다'),
})

type LoginSchema = z.output<typeof loginSchema>

const state = reactive({
  email: '',
  password: '',
})

const isLoading = ref(false)

const onSubmit = async (event: FormSubmitEvent<LoginSchema>) => {
  isLoading.value = true

  try {
    await login(event.data)

    toast.add({
      title: '로그인 성공',
      description: '관리자 페이지에 오신 것을 환영합니다.',
      color: 'success',
    })

    navigateTo('/admin')
  } catch (error: any) {
    const message = error?.data?.message || error?.message || '로그인에 실패했습니다.'

    toast.add({
      title: '로그인 실패',
      description: message,
      color: 'error',
    })
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-900 px-4">
    <div class="w-full max-w-md">
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold text-primary-600">BloC Admin</h1>
        <p class="mt-2 text-neutral-600 dark:text-neutral-400">관리자 로그인</p>
      </div>

      <UCard>
        <UForm :schema="loginSchema" :state="state" class="space-y-4" @submit="onSubmit">
          <UFormField label="이메일" name="email">
            <UInput
              v-model="state.email"
              type="email"
              placeholder="admin@example.com"
              icon="i-heroicons-envelope"
              size="lg"
            />
          </UFormField>

          <UFormField label="비밀번호" name="password">
            <UInput
              v-model="state.password"
              type="password"
              placeholder="비밀번호를 입력하세요"
              icon="i-heroicons-lock-closed"
              size="lg"
            />
          </UFormField>

          <UButton type="submit" block size="lg" :loading="isLoading">
            로그인
          </UButton>
        </UForm>
      </UCard>

      <p class="mt-6 text-center text-sm text-neutral-500">
        <NuxtLink to="/" class="text-primary-600 hover:underline">
          사용자 페이지로 이동
        </NuxtLink>
      </p>
    </div>
  </div>
</template>
