<script setup lang="ts">
import type { FormSubmitEvent } from '#ui/types';
import { registerSchema, type RegisterSchema } from '~/schemas/auth';

definePageMeta({
  layout: 'auth',
  middleware: ['guest'],
});

const router = useRouter();
const toast = useToast();

const state = reactive<RegisterSchema>({
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
});

const { register } = useAuth();
const [isPending, startTransition] = useTransition();

async function onSubmit(event: FormSubmitEvent<RegisterSchema>) {
  await startTransition(
    async () => {
      const { name, email, password } = event.data;
      await useWait(1000);
      await register({ name, email, password });
    },
    {
      onSuccess: () => {
        toast.add({
          title: '회원가입 성공',
          description: '환영합니다! 로그인되었습니다.',
          color: 'success',
        });
        return navigateTo('/console/dashboard');
      },
      onError: (err) => {
        const errorMessage =
          (err as any)?.response?._data.message ||
          '회원가입에 실패했습니다. 잠시 후 다시 시도해주세요.';
        toast.add({
          title: '회원가입 실패',
          description: errorMessage,
          color: 'error',
          icon: 'mdi-alert-circle',
        });
      },
      minDuration: 300, // Prevent flash of loading state for fast responses
    },
  );
}
</script>

<template>
  <!-- Logo -->
  <AuthLogo class="mb-8" />

  <!-- Registration Card -->
  <div
    class="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm"
  >
    <h1
      class="text-2xl font-bold text-gray-900 dark:text-white mb-4 text-center"
    >
      회원가입
    </h1>
    <UForm
      :state="state"
      :schema="registerSchema"
      @submit="onSubmit"
      class="flex flex-col gap-4"
    >
      <!-- Name Field -->
      <UFormField label="이름" name="name" required>
        <UInput
          v-model.trim="state.name"
          type="text"
          placeholder="이름을 입력해주세요"
          size="xl"
          :disabled="isPending"
          class="w-full"
          variant="soft"
        />
      </UFormField>

      <!-- Email Field -->
      <UFormField label="이메일" name="email" required>
        <UInput
          v-model.trim="state.email"
          type="email"
          placeholder="이메일을 입력해주세요"
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

      <!-- Confirm Password Field -->
      <UFormField label="비밀번호 확인" name="confirmPassword" required>
        <UInput
          v-model.trim="state.confirmPassword"
          type="password"
          placeholder="비밀번호를 다시 입력해주세요"
          size="xl"
          :disabled="isPending"
          class="w-full"
          variant="soft"
        />
      </UFormField>

      <!-- Login Link -->
      <div class="flex items-center justify-end gap-2 text-[13px]">
        <span class="text-gray-600 dark:text-gray-400">
          이미 계정이 있으신가요?
        </span>
        <NuxtLink
          to="/auth/login"
          class="text-primary dark:text-primary-400 font-medium hover:underline"
        >
          로그인
        </NuxtLink>
      </div>

      <!-- Register Button -->
      <div class="mt-4 flex flex-col gap-y-6">
        <UButton
          type="submit"
          size="xl"
          block
          :loading="isPending"
          :disabled="isPending"
          class="bg-linear-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 font-bold"
        >
          회원가입
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
          :disabled="isPending"
          color="warning"
        >
          카카오로 시작하기
        </UButton>
      </div>
    </UForm>
  </div>

  <!-- Footer Note -->
  <div
    class="mt-6 text-center text-sm text-gray-600 dark:text-gray-400 max-w-md"
  >
    회원가입 시
    <button
      type="button"
      class="text-primary dark:text-primary-400 hover:underline"
      @click="() => toast.add({ title: '준비 중입니다', color: 'info' })"
    >
      이용약관
    </button>
    및
    <button
      type="button"
      class="text-primary dark:text-primary-400 hover:underline"
      @click="() => toast.add({ title: '준비 중입니다', color: 'info' })"
    >
      개인정보처리방침
    </button>
    에 동의하게 됩니다.
  </div>
</template>
