<script setup lang="ts">
import type { FormSubmitEvent } from '#ui/types';
import { z } from 'zod';

definePageMeta({
  layout: 'auth',
  middleware: ['guest'],
});

const toast = useToast();

// Step management
type Step = 'email' | 'verify' | 'reset' | 'success';
const currentStep = ref<Step>('email');

// Email form schema
const emailSchema = z.object({
  email: z.string().email('올바른 이메일 형식이 아닙니다.'),
});

// Verify form schema
const verifySchema = z.object({
  code: z.string().length(6, '인증 코드는 6자리입니다.'),
});

// Reset password form schema
const resetSchema = z
  .object({
    newPassword: z
      .string()
      .min(8, '비밀번호는 8자 이상이어야 합니다.')
      .regex(
        /^(?=.*[a-zA-Z])(?=.*[0-9])(?=.*[!@#$%^&*])/,
        '비밀번호는 영문, 숫자, 특수문자를 포함해야 합니다.',
      ),
    confirmPassword: z.string().min(1, '비밀번호 확인을 입력해주세요.'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: '비밀번호가 일치하지 않습니다.',
    path: ['confirmPassword'],
  });

type EmailSchema = z.infer<typeof emailSchema>;
type VerifySchema = z.infer<typeof verifySchema>;
type ResetSchema = z.infer<typeof resetSchema>;

const emailState = reactive<EmailSchema>({
  email: '',
});

const verifyState = reactive<VerifySchema>({
  code: '',
});

const resetState = reactive<ResetSchema>({
  newPassword: '',
  confirmPassword: '',
});

// Store email and code for final request
const savedEmail = ref('');
const savedCode = ref('');

const [isPending, startTransition] = useTransition();

// Step 1: Send verification code
async function onEmailSubmit(event: FormSubmitEvent<EmailSchema>) {
  await startTransition(
    async () => {
      const { email } = event.data;
      await useApi('/auth/send-password-reset-code', {
        method: 'POST',
        body: { email },
      });
      savedEmail.value = email;
      currentStep.value = 'verify';
    },
    {
      onSuccess: () => {
        toast.add({
          title: '인증 코드 발송',
          description: '이메일로 인증 코드가 발송되었습니다.',
          color: 'success',
        });
      },
      onError: (err) => {
        const errorMessage =
          (err as any)?.response?._data.message ||
          '인증 코드 발송에 실패했습니다.';
        toast.add({
          title: '발송 실패',
          description: errorMessage,
          color: 'error',
        });
      },
      minDuration: 300,
    },
  );
}

// Step 2: Verify code
async function onVerifySubmit(event: FormSubmitEvent<VerifySchema>) {
  await startTransition(
    async () => {
      const { code } = event.data;
      await useApi('/auth/verify-password-reset-code', {
        method: 'POST',
        body: { email: savedEmail.value, code },
      });
      savedCode.value = code;
      currentStep.value = 'reset';
    },
    {
      onSuccess: () => {
        toast.add({
          title: '인증 완료',
          description: '새 비밀번호를 설정해주세요.',
          color: 'success',
        });
      },
      onError: (err) => {
        const errorMessage =
          (err as any)?.response?._data.message || '인증에 실패했습니다.';
        toast.add({
          title: '인증 실패',
          description: errorMessage,
          color: 'error',
        });
      },
      minDuration: 300,
    },
  );
}

// Step 3: Reset password
async function onResetSubmit(event: FormSubmitEvent<ResetSchema>) {
  await startTransition(
    async () => {
      const { newPassword, confirmPassword } = event.data;
      await useApi('/auth/reset-password', {
        method: 'POST',
        body: {
          email: savedEmail.value,
          code: savedCode.value,
          newPassword,
          confirmPassword,
        },
      });
      currentStep.value = 'success';
    },
    {
      onSuccess: () => {
        toast.add({
          title: '비밀번호 변경 완료',
          description: '새 비밀번호로 로그인해주세요.',
          color: 'success',
        });
      },
      onError: (err) => {
        const errorMessage =
          (err as any)?.response?._data.message ||
          '비밀번호 변경에 실패했습니다.';
        toast.add({
          title: '변경 실패',
          description: errorMessage,
          color: 'error',
        });
      },
      minDuration: 300,
    },
  );
}

// Resend verification code
async function resendCode() {
  await startTransition(
    async () => {
      await $fetch('/api/auth/send-password-reset-code', {
        method: 'POST',
        body: { email: savedEmail.value },
      });
    },
    {
      onSuccess: () => {
        verifyState.code = '';
        toast.add({
          title: '재발송 완료',
          description: '인증 코드가 다시 발송되었습니다.',
          color: 'success',
        });
      },
      onError: (err) => {
        const errorMessage =
          (err as any)?.response?._data.message || '재발송에 실패했습니다.';
        toast.add({
          title: '재발송 실패',
          description: errorMessage,
          color: 'error',
        });
      },
      minDuration: 300,
    },
  );
}

// Go back to previous step
function goBack() {
  if (currentStep.value === 'verify') {
    currentStep.value = 'email';
    verifyState.code = '';
  } else if (currentStep.value === 'reset') {
    currentStep.value = 'verify';
    resetState.newPassword = '';
    resetState.confirmPassword = '';
  }
}

// Reset all
function resetAll() {
  currentStep.value = 'email';
  emailState.email = '';
  verifyState.code = '';
  resetState.newPassword = '';
  resetState.confirmPassword = '';
  savedEmail.value = '';
  savedCode.value = '';
}

// Step indicator
const steps = [
  { key: 'email', label: '이메일 입력' },
  { key: 'verify', label: '인증 코드 확인' },
  { key: 'reset', label: '비밀번호 변경' },
];

const currentStepIndex = computed(() => {
  if (currentStep.value === 'success') return 3;
  return steps.findIndex((s) => s.key === currentStep.value);
});
</script>

<template>
  <!-- Logo -->
  <AuthLogo class="mb-8" />

  <!-- Reset Password Card -->
  <div
    class="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm"
  >
    <h1
      class="text-2xl font-bold text-gray-900 dark:text-white mb-2 text-center"
    >
      비밀번호 재설정
    </h1>

    <!-- Step Indicator -->
    <div
      v-if="currentStep !== 'success'"
      class="flex items-center justify-center gap-2 mb-6"
    >
      <template v-for="(step, index) in steps" :key="step.key">
        <div
          class="flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium"
          :class="
            index <= currentStepIndex
              ? 'bg-purple-600 text-white'
              : 'bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400'
          "
        >
          {{ index + 1 }}
        </div>
        <div
          v-if="index < steps.length - 1"
          class="w-8 h-0.5"
          :class="
            index < currentStepIndex
              ? 'bg-purple-600'
              : 'bg-gray-200 dark:bg-gray-600'
          "
        />
      </template>
    </div>

    <!-- Step 1: Email Input -->
    <template v-if="currentStep === 'email'">
      <p class="text-sm text-gray-600 dark:text-gray-400 mb-6 text-center">
        가입하신 이메일 주소를 입력해주세요.
      </p>

      <UForm
        :state="emailState"
        :schema="emailSchema"
        @submit="onEmailSubmit"
        class="flex flex-col gap-4"
      >
        <UFormField label="이메일" name="email" required>
          <UInput
            v-model.trim="emailState.email"
            type="email"
            placeholder="이메일 주소를 입력해주세요"
            size="xl"
            :disabled="isPending"
            class="w-full"
            variant="soft"
          />
        </UFormField>

        <div class="mt-4">
          <UButton
            type="submit"
            size="xl"
            block
            :loading="isPending"
            :disabled="isPending"
            class="bg-linear-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 font-bold"
          >
            인증 코드 받기
          </UButton>
        </div>
      </UForm>
    </template>

    <!-- Step 2: Verify Code -->
    <template v-else-if="currentStep === 'verify'">
      <p class="text-sm text-gray-600 dark:text-gray-400 mb-6 text-center">
        <span class="font-medium text-gray-900 dark:text-white">
          {{ savedEmail }}
        </span>
        <br />
        으로 발송된 인증 코드를 입력해주세요.
      </p>

      <UForm
        :state="verifyState"
        :schema="verifySchema"
        @submit="onVerifySubmit"
        class="flex flex-col gap-4"
      >
        <UFormField label="인증 코드" name="code" required>
          <UInput
            v-model.trim="verifyState.code"
            type="text"
            placeholder="6자리 인증 코드"
            size="xl"
            :disabled="isPending"
            class="w-full text-center text-2xl tracking-widest"
            variant="soft"
            maxlength="6"
          />
        </UFormField>

        <div class="flex items-center justify-center gap-2 text-sm">
          <span class="text-gray-500 dark:text-gray-400">
            코드를 받지 못하셨나요?
          </span>
          <button
            type="button"
            class="text-purple-600 hover:underline font-medium"
            :disabled="isPending"
            @click="resendCode"
          >
            재발송
          </button>
        </div>

        <div class="flex gap-2 mt-4">
          <div class="w-1/2">
            <UButton
              type="button"
              size="xl"
              block
              variant="soft"
              :disabled="isPending"
              @click="goBack"
            >
              뒤로
            </UButton>
          </div>
          <div class="w-1/2">
            <UButton
              type="submit"
              size="xl"
              block
              :loading="isPending"
              :disabled="isPending"
              class="bg-linear-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 font-bold"
            >
              확인
            </UButton>
          </div>
        </div>
      </UForm>
    </template>

    <!-- Step 3: Reset Password -->
    <template v-else-if="currentStep === 'reset'">
      <p class="text-sm text-gray-600 dark:text-gray-400 mb-6 text-center">
        새로운 비밀번호를 설정해주세요.
      </p>

      <UForm
        :state="resetState"
        :schema="resetSchema"
        @submit="onResetSubmit"
        class="flex flex-col gap-4"
      >
        <UFormField label="새 비밀번호" name="newPassword" required>
          <UInput
            v-model.trim="resetState.newPassword"
            type="password"
            placeholder="새 비밀번호를 입력해주세요"
            size="xl"
            :disabled="isPending"
            class="w-full"
            variant="soft"
          />
        </UFormField>

        <UFormField label="비밀번호 확인" name="confirmPassword" required>
          <UInput
            v-model.trim="resetState.confirmPassword"
            type="password"
            placeholder="비밀번호를 다시 입력해주세요"
            size="xl"
            :disabled="isPending"
            class="w-full"
            variant="soft"
          />
        </UFormField>

        <p class="text-xs text-gray-500 dark:text-gray-400">
          * 8자 이상, 영문, 숫자, 특수문자(!@#$%^&*) 포함
        </p>

        <div class="flex gap-2 mt-4">
          <div class="w-1/2">
            <UButton
              type="button"
              size="xl"
              variant="soft"
              block
              :disabled="isPending"
              @click="goBack"
            >
              뒤로
            </UButton>
          </div>
          <div class="w-1/2">
            <UButton
              type="submit"
              size="xl"
              block
              :loading="isPending"
              :disabled="isPending"
              class="bg-linear-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 font-bold"
            >
              비밀번호 변경
            </UButton>
          </div>
        </div>
      </UForm>
    </template>

    <!-- Success -->
    <template v-else-if="currentStep === 'success'">
      <div class="text-center py-8">
        <div
          class="w-16 h-16 mx-auto mb-4 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center"
        >
          <UIcon
            name="i-heroicons-check"
            class="w-8 h-8 text-green-600 dark:text-green-400"
          />
        </div>
        <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-2">
          비밀번호 변경 완료
        </h2>
        <p class="text-gray-600 dark:text-gray-400 mb-6">
          새로운 비밀번호로 로그인해주세요.
        </p>
        <NuxtLink to="/auth/login" class="w-full block">
          <UButton
            type="button"
            size="xl"
            block
            class="bg-linear-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 font-bold"
          >
            로그인하러 가기
          </UButton>
        </NuxtLink>
      </div>
    </template>
  </div>

  <!-- Footer Links -->
  <div
    class="mt-6 flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400"
  >
    <NuxtLink
      to="/auth/login"
      class="hover:text-gray-900 dark:hover:text-white transition-colors"
    >
      로그인
    </NuxtLink>
    <span class="text-gray-300 dark:text-gray-700">|</span>
    <NuxtLink
      to="/auth/find-email"
      class="hover:text-gray-900 dark:hover:text-white transition-colors"
    >
      아이디 찾기
    </NuxtLink>
  </div>
</template>
