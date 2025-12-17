<script setup lang="ts">
import type { FormSubmitEvent } from '#ui/types';
import { loginSchema, type LoginSchema } from '~/schemas/auth';

definePageMeta({
  layout: 'auth',
  middleware: ['guest'],
});

const toast = useToast();
const config = useRuntimeConfig();

const state = reactive<LoginSchema>({
  email: '',
  password: '',
});

const auth = useAuth();
const [isPending, startTransition] = useTransition();

async function onSubmit(event: FormSubmitEvent<LoginSchema>) {
  await startTransition(
    async () => {
      const { email, password } = event.data;
      await useWait(1000);
      await auth.login({ email, password });
    },
    {
      onSuccess: () => {
        toast.add({
          title: '로그인 성공',
          description: '환영합니다!',
          color: 'success',
        });
        return navigateTo('/console/dashboard');
      },
      onError: (err) => {
        const errorMessage =
          (err as any)?.response?._data.message ||
          '로그인에 실패했습니다. 잠시 후 다시 시도해주세요.';
        toast.add({
          title: '로그인 실패',
          description: errorMessage,
          color: 'error',
          icon: 'mdi-alert-circle',
        });
      },
      minDuration: 300, // Prevent flash of loading state for fast responses
    },
  );
}

// Kakao OAuth login
const KAKAO_AUTH_URL = 'https://kauth.kakao.com/oauth/authorize';
const [isKakaoLoading, startKakaoLogin] = useTransition();

const handleKakaoLogin = async () => {
  if (isKakaoLoading.value || isPending.value) return;

  await startKakaoLogin(
    async () => {
      const clientId = config.public.kakaoClientId;
      if (!clientId) {
        throw new Error('카카오 클라이언트 ID가 설정되지 않았습니다.');
      }

      // 프론트엔드 콜백 URL로 리다이렉트
      const frontendUrl = window.location.origin;
      const redirectUri = `${frontendUrl}/auth/kakao-callback`;

      const url = new URL(KAKAO_AUTH_URL);
      url.searchParams.set('client_id', clientId);
      url.searchParams.set('redirect_uri', redirectUri);
      url.searchParams.set('response_type', 'code');
      url.searchParams.set('scope', 'account_email,profile_nickname,profile_image');

      // 카카오 로그인 페이지로 리다이렉트
      window.location.href = url.toString();
    },
    {
      onError: (err) => {
        toast.add({
          title: '카카오 로그인 실패',
          description: err.message || '카카오 로그인에 실패했습니다.',
          color: 'error',
        });
      },
      minDuration: 300,
    }
  );
};
</script>

<template>
  <!-- Logo -->
  <AuthLogo class="mb-8" />

  <!-- Page Title -->

  <!-- Login Card -->
  <div
    class="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm"
  >
    <h1
      class="text-2xl font-bold text-gray-900 dark:text-white mb-4 text-center"
    >
      로그인
    </h1>
    <UForm
      :state="state"
      :schema="loginSchema"
      @submit="onSubmit"
      class="flex flex-col gap-4"
    >
      <!-- Email Field -->
      <UFormField label="아이디" name="email" required>
        <UInput
          v-model.trim="state.email"
          type="email"
          placeholder="아이디를 입력해주세요"
          size="xl"
          :disabled="isPending"
          class="w-full"
          variant="soft"
        />
      </UFormField>

      <!-- Password Field -->
      <UFormField label="비밀번호" name="password" required>
        <UInput
          v-model.trim="state.password"
          type="password"
          placeholder="비밀번호를 입력해주세요"
          size="xl"
          :disabled="isPending"
          class="w-full"
          variant="soft"
        />
      </UFormField>

      <!-- Signup Link -->
      <div class="flex items-center justify-end gap-2 text-[13px]">
        <span class="text-gray-600 dark:text-gray-400">
          블로그 마인이 처음이신가요?
        </span>
        <NuxtLink
          to="/auth/register"
          class="text-primary dark:text-primary-400 font-medium hover:underline"
        >
          회원가입
        </NuxtLink>
      </div>

      <!-- Login Button -->
      <div class="mt-4 flex flex-col gap-y-1.5">
        <UButton
          type="submit"
          size="xl"
          block
          :loading="isPending"
          :disabled="isPending"
          class="bg-linear-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 font-bold"
        >
          로그인
        </UButton>

        <div class="flex items-center gap-x-5">
          <hr class="border-gray-200 dark:border-gray-600 flex-1 border-0.5" />
          <div class="text-center text-sm text-gray-500 dark:text-gray-400">
            또는
          </div>
          <hr class="border-gray-200 dark:border-gray-600 flex-1" />
        </div>

        <UButton
          type="button"
          size="xl"
          block
          :disabled="isPending || isKakaoLoading"
          :loading="isKakaoLoading"
          color="warning"
          @click="handleKakaoLogin"
        >
          카카오로 시작하기
        </UButton>
      </div>
    </UForm>
  </div>

  <!-- Footer Links -->
  <div
    class="mt-6 flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400"
  >
    <NuxtLink
      to="/auth/find-email"
      class="hover:text-gray-900 dark:hover:text-white transition-colors"
    >
      아이디 찾기
    </NuxtLink>
    <span class="text-gray-300 dark:text-gray-700">|</span>
    <NuxtLink
      to="/auth/reset-password"
      class="hover:text-gray-900 dark:hover:text-white transition-colors"
    >
      비밀번호 재설정
    </NuxtLink>
  </div>
</template>
