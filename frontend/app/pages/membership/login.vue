<script setup lang="ts">
import type { FormSubmitEvent } from '#ui/types'
import { loginSchema, type LoginSchema } from '~/schemas/auth'

definePageMeta({
  layout: 'auth',
  middleware: ['guest'],
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
  <div
    class="min-h-screen bg-white dark:bg-gray-950 flex flex-col items-center justify-center px-4 py-12"
  >
    <!-- Logo -->
    <div class="mb-8 flex items-center gap-2">
      <div
        class="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center"
      >
        <svg class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
          <path
            fill-rule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
            clip-rule="evenodd"
          />
        </svg>
      </div>
      <span class="text-2xl font-bold text-gray-900 dark:text-white"
        >sendon</span
      >
    </div>

    <!-- Page Title -->
    <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-8">
      로그인
    </h1>

    <!-- Login Card -->
    <div
      class="w-full max-w-md bg-gray-50 dark:bg-gray-900 rounded-2xl p-8 shadow-sm"
    >
      <UForm
        :state="state"
        :schema="loginSchema"
        @submit="onSubmit"
        class="space-y-5"
      >
        <!-- Email Field -->
        <UFormField label="아이디" name="email">
          <UInput
            v-model="state.email"
            type="email"
            placeholder="아이디를 입력해주세요"
            size="xl"
            :disabled="loading"
            class="w-full"
          />
        </UFormField>

        <!-- Password Field -->
        <UFormField label="비밀번호" name="password">
          <UInput
            v-model="state.password"
            type="password"
            placeholder="비밀번호를 입력해주세요"
            size="xl"
            :disabled="loading"
            class="w-full"
            variant="soft"
          />
        </UFormField>

        <!-- Signup Link -->
        <div class="flex items-center justify-end gap-2 text-sm">
          <span class="text-gray-600 dark:text-gray-400"
            >센드온이 처음이신가요?</span
          >
          <NuxtLink
            to="/membership/signup"
            class="text-purple-600 dark:text-purple-400 font-medium hover:underline"
          >
            회원가입
          </NuxtLink>
        </div>

        <!-- Login Button -->
        <UButton
          type="submit"
          size="xl"
          block
          :loading="loading"
          :disabled="loading"
          class="mt-6 rounded-xl bg-linear-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 font-semibold px-6 py-4"
        >
          로그인
        </UButton>
      </UForm>
    </div>

    <!-- Footer Links -->
    <div
      class="mt-6 flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400"
    >
      <button
        type="button"
        class="hover:text-gray-900 dark:hover:text-white transition-colors"
        @click="() => toast.add({ title: '준비 중입니다', color: 'info' })"
      >
        아이디 찾기
      </button>
      <span class="text-gray-300 dark:text-gray-700">|</span>
      <button
        type="button"
        class="hover:text-gray-900 dark:hover:text-white transition-colors"
        @click="() => toast.add({ title: '준비 중입니다', color: 'info' })"
      >
        비밀번호 재설정
      </button>
    </div>

    <!-- Customer Support Button (Fixed Position) -->
    <button
      type="button"
      class="fixed bottom-6 right-6 w-14 h-14 bg-purple-600 hover:bg-purple-700 text-white rounded-full shadow-lg flex flex-col items-center justify-center gap-0.5 transition-all hover:scale-110"
      @click="() => toast.add({ title: '고객센터', description: '준비 중입니다', color: 'info' })"
    >
      <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
        <path
          d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"
        />
      </svg>
      <span class="text-[10px] font-medium">고객센터</span>
    </button>
  </div>
</template>
