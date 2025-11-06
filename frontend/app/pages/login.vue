<script setup lang="ts">
import type { FormSubmitEvent } from '#ui/types'
import { loginSchema, type LoginSchema } from '~/schemas/auth'

definePageMeta({
  layout: 'auth',
})

const router = useRouter()
const toast = useToast()

const state = reactive<LoginSchema>({
  email: '',
  password: '',
})

const loading = ref(false)

const { login } = useAuth()

async function onSubmit(event: FormSubmitEvent<LoginSchema>) {
  loading.value = true

  try {
    const data = await login(event.data)

    toast.add({
      title: '로그인 성공',
      description: `${data.user.name || data.user.email}님 환영합니다`,
      color: 'success',
    })

    // Redirect to home or intended page
    await router.push('/')
  } catch (err: any) {
    console.error('Login error:', err)

    const errorMessage = err?.data?.message || err?.message || '로그인에 실패했습니다'

    toast.add({
      title: '로그인 실패',
      description: errorMessage,
      color: 'error',
    })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 py-12">
    <UCard class="w-full max-w-md">
      <template #header>
        <div class="text-center">
          <h2 class="text-2xl font-bold text-gray-900 dark:text-white">
            로그인
          </h2>
          <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
            계정에 로그인하여 계속하세요
          </p>
        </div>
      </template>

      <UForm
        :state="state"
        :schema="loginSchema"
        @submit="onSubmit"
        class="space-y-4"
      >
        <UFormGroup
          label="이메일"
          name="email"
          required
        >
          <UInput
            v-model="state.email"
            type="email"
            placeholder="your@email.com"
            icon="i-heroicons-envelope"
            size="lg"
            :disabled="loading"
          />
        </UFormGroup>

        <UFormGroup
          label="비밀번호"
          name="password"
          required
        >
          <UInput
            v-model="state.password"
            type="password"
            placeholder="••••••••"
            icon="i-heroicons-lock-closed"
            size="lg"
            :disabled="loading"
          />
        </UFormGroup>

        <div class="flex items-center justify-between">
          <UCheckbox
            label="로그인 상태 유지"
            :disabled="loading"
          />

          <UButton
            variant="link"
            color="neutral"
            size="sm"
            :disabled="loading"
          >
            비밀번호 찾기
          </UButton>
        </div>

        <UButton
          type="submit"
          color="primary"
          size="lg"
          block
          :loading="loading"
        >
          로그인
        </UButton>
      </UForm>

      <template #footer>
        <div class="text-center text-sm text-gray-600 dark:text-gray-400">
          계정이 없으신가요?
          <UButton
            variant="link"
            size="sm"
            to="/register"
            :disabled="loading"
          >
            회원가입
          </UButton>
        </div>
      </template>
    </UCard>
  </div>
</template>
