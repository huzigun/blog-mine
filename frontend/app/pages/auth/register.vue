<script setup lang="ts">
import type { FormSubmitEvent } from '#ui/types';
import { registerSchema, type RegisterSchema } from '~/schemas/auth';

definePageMeta({
  layout: 'auth',
  middleware: ['guest'],
});

const toast = useToast();

// 단계별 회원가입 상태
const currentStep = ref<'email' | 'verify' | 'register'>('email');
const emailVerified = ref(false);
const verificationCode = ref('');
const countdown = ref(0);
let countdownInterval: NodeJS.Timeout | null = null;

const state = reactive<RegisterSchema>({
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
});

const { register } = useAuth();
const [isPending, startTransition] = useTransition();
const [isSending, startSending] = useTransition();
const [isVerifying, startVerifying] = useTransition();

// 카운트다운 시작
function startCountdown() {
  countdown.value = 300; // 5분 = 300초
  if (countdownInterval) clearInterval(countdownInterval);

  countdownInterval = setInterval(() => {
    countdown.value--;
    if (countdown.value <= 0) {
      clearInterval(countdownInterval!);
      countdownInterval = null;
    }
  }, 1000);
}

// 카운트다운 표시 형식
const countdownText = computed(() => {
  const minutes = Math.floor(countdown.value / 60);
  const seconds = countdown.value % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
});

// 인증 코드 전송
async function sendVerificationCode() {
  if (!state.email) {
    toast.add({
      title: '이메일을 입력해주세요',
      color: 'error',
    });
    return;
  }

  await startSending(
    async () => {
      await useApi('/auth/send-verification-code', {
        method: 'POST',
        body: { email: state.email },
      });
    },
    {
      onSuccess: () => {
        currentStep.value = 'verify';
        startCountdown();
        toast.add({
          title: '인증 코드 전송 완료',
          description: '이메일을 확인하여 인증 코드를 입력해주세요.',
          color: 'success',
        });
      },
      onError: (err) => {
        const errorMessage =
          (err as any)?.response?._data.message ||
          '인증 코드 전송에 실패했습니다.';
        toast.add({
          title: '전송 실패',
          description: errorMessage,
          color: 'error',
        });
      },
    },
  );
}

// 인증 코드 재전송
async function resendCode() {
  verificationCode.value = '';
  await sendVerificationCode();
}

// 인증 코드 확인
async function verifyCode() {
  if (!verificationCode.value || verificationCode.value.length !== 6) {
    toast.add({
      title: '인증 코드를 입력해주세요',
      description: '6자리 숫자를 입력해야 합니다.',
      color: 'error',
    });
    return;
  }

  await startVerifying(
    async () => {
      await useApi('/auth/verify-code', {
        method: 'POST',
        body: {
          email: state.email,
          code: verificationCode.value,
        },
      });
    },
    {
      onSuccess: () => {
        emailVerified.value = true;
        currentStep.value = 'register';
        if (countdownInterval) {
          clearInterval(countdownInterval);
          countdownInterval = null;
        }
        toast.add({
          title: '이메일 인증 완료',
          description: '회원가입을 계속 진행해주세요.',
          color: 'success',
        });
      },
      onError: (err) => {
        const errorMessage =
          (err as any)?.response?._data.message ||
          '인증 코드가 올바르지 않습니다.';
        toast.add({
          title: '인증 실패',
          description: errorMessage,
          color: 'error',
        });
      },
    },
  );
}

// 이메일 변경
function changeEmail() {
  currentStep.value = 'email';
  emailVerified.value = false;
  verificationCode.value = '';
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
  countdown.value = 0;
}

// 회원가입
async function onSubmit(event: FormSubmitEvent<RegisterSchema>) {
  await startTransition(
    async () => {
      const { name, email, password } = event.data;
      await register({
        name,
        email,
        password,
        emailVerified: emailVerified.value,
      });
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
        });
      },
      minDuration: 300,
    },
  );
}

// 컴포넌트 언마운트 시 정리
onUnmounted(() => {
  if (countdownInterval) {
    clearInterval(countdownInterval);
  }
});
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

    <!-- 단계 표시 -->
    <div class="flex items-center justify-center gap-2 mb-6">
      <div
        class="flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold"
        :class="
          currentStep === 'email'
            ? 'bg-primary text-white'
            : emailVerified
              ? 'bg-success text-white'
              : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-600'
        "
      >
        1
      </div>
      <div
        class="w-12 h-0.5"
        :class="
          currentStep !== 'email'
            ? 'bg-primary'
            : 'bg-neutral-200 dark:bg-neutral-700'
        "
      />
      <div
        class="flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold"
        :class="
          currentStep === 'verify'
            ? 'bg-primary text-white'
            : emailVerified
              ? 'bg-success text-white'
              : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-600'
        "
      >
        2
      </div>
      <div
        class="w-12 h-0.5"
        :class="
          currentStep === 'register'
            ? 'bg-primary'
            : 'bg-neutral-200 dark:bg-neutral-700'
        "
      />
      <div
        class="flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold"
        :class="
          currentStep === 'register'
            ? 'bg-primary text-white'
            : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-600'
        "
      >
        3
      </div>
    </div>

    <!-- 1단계: 이메일 입력 -->
    <div v-if="currentStep === 'email'" class="flex flex-col gap-4">
      <p class="text-sm text-center text-neutral-600 dark:text-neutral-400 mb-2">
        이메일 주소를 입력하고 인증을 진행해주세요
      </p>

      <UFormField label="이메일" name="email" required>
        <UInput
          v-model.trim="state.email"
          type="email"
          placeholder="이메일을 입력해주세요"
          size="xl"
          :disabled="isSending"
          class="w-full"
          variant="soft"
        />
      </UFormField>

      <UButton
        size="xl"
        block
        :loading="isSending"
        :disabled="isSending || !state.email"
        @click="sendVerificationCode"
      >
        인증 코드 받기
      </UButton>

      <div class="flex items-center justify-center gap-2 text-[13px] mt-2">
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
    </div>

    <!-- 2단계: 인증 코드 입력 -->
    <div v-else-if="currentStep === 'verify'" class="flex flex-col gap-4">
      <div class="bg-neutral-50 dark:bg-neutral-900 rounded-lg p-4 mb-2">
        <p class="text-sm text-neutral-700 dark:text-neutral-300 mb-2">
          <strong>{{ state.email }}</strong>으로 인증 코드를 전송했습니다.
        </p>
        <p class="text-xs text-neutral-500">
          이메일을 확인하여 6자리 인증 코드를 입력해주세요.
        </p>
      </div>

      <UFormField label="인증 코드" name="code" required>
        <UInput
          v-model="verificationCode"
          type="text"
          placeholder="000000"
          size="xl"
          maxlength="6"
          :disabled="isVerifying || countdown <= 0"
          class="w-full text-center text-2xl font-mono tracking-widest"
          variant="soft"
        />
      </UFormField>

      <div
        v-if="countdown > 0"
        class="flex items-center justify-center gap-2 text-sm"
      >
        <div class="i-heroicons-clock text-warning" />
        <span class="text-warning font-semibold">{{ countdownText }}</span>
        <span class="text-neutral-600 dark:text-neutral-400">남음</span>
      </div>

      <div class="flex gap-2">
        <UButton
          size="xl"
          block
          :loading="isVerifying"
          :disabled="
            isVerifying ||
            !verificationCode ||
            verificationCode.length !== 6 ||
            countdown <= 0
          "
          @click="verifyCode"
        >
          인증 확인
        </UButton>
        <UButton
          size="xl"
          color="neutral"
          variant="outline"
          :disabled="isSending || countdown > 240"
          @click="resendCode"
        >
          재전송
        </UButton>
      </div>

      <UButton
        size="sm"
        color="neutral"
        variant="ghost"
        @click="changeEmail"
      >
        이메일 변경
      </UButton>
    </div>

    <!-- 3단계: 회원가입 정보 입력 -->
    <div v-else-if="currentStep === 'register'">
      <div
        class="bg-success/10 border border-success/20 rounded-lg p-3 mb-4 flex items-center gap-2"
      >
        <div class="i-heroicons-check-circle-solid text-success text-xl" />
        <p class="text-sm text-success">이메일 인증이 완료되었습니다</p>
      </div>

      <UForm
        :state="state"
        :schema="registerSchema"
        @submit="onSubmit"
        class="flex flex-col gap-4"
      >
        <!-- Email (readonly) -->
        <UFormField label="이메일" name="email">
          <UInput
            v-model="state.email"
            type="email"
            size="xl"
            readonly
            class="w-full"
            variant="soft"
          />
        </UFormField>

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

        <!-- Register Button -->
        <div class="mt-4">
          <UButton
            type="submit"
            size="xl"
            block
            :loading="isPending"
            :disabled="isPending"
            class="bg-linear-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 font-bold"
          >
            회원가입 완료
          </UButton>
        </div>
      </UForm>
    </div>
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
