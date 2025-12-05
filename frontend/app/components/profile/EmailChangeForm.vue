<script lang="ts" setup>
const emit = defineEmits<{ close: [boolean] }>();

const toast = useToast();

const emailForm = reactive({
  newEmail: '',
  verificationCode: '',
});

const isEmailSending = ref(false);
const isEmailVerifying = ref(false);
const isCodeSent = ref(false);
const countdown = ref(0);
let countdownTimer: ReturnType<typeof setInterval> | null = null;

// 컴포넌트 언마운트 시 타이머 정리
onUnmounted(() => {
  if (countdownTimer) {
    clearInterval(countdownTimer);
  }
});

const handleSendEmailCode = async () => {
  if (!emailForm.newEmail) {
    toast.add({
      title: '입력 오류',
      description: '이메일을 입력해주세요.',
      color: 'error',
    });
    return;
  }

  isEmailSending.value = true;
  try {
    await useApi('/user/request-email-change', {
      method: 'POST',
      body: { newEmail: emailForm.newEmail },
    });

    // 인증 코드 전송 API
    await useApi('/auth/send-verification-code', {
      method: 'POST',
      body: { email: emailForm.newEmail },
    });

    toast.add({
      title: '인증 코드 전송',
      description: '새 이메일로 인증 코드가 전송되었습니다.',
      color: 'success',
    });

    isCodeSent.value = true;
    countdown.value = 180; // 3분

    // 카운트다운 시작
    if (countdownTimer) clearInterval(countdownTimer);
    countdownTimer = setInterval(() => {
      countdown.value--;
      if (countdown.value <= 0) {
        clearInterval(countdownTimer!);
        countdownTimer = null;
      }
    }, 1000);
  } catch (error: any) {
    toast.add({
      title: '전송 실패',
      description: error?.data?.message || '인증 코드 전송에 실패했습니다.',
      color: 'error',
    });
  } finally {
    isEmailSending.value = false;
  }
};

const handleVerifyEmailChange = async () => {
  if (!emailForm.verificationCode) {
    toast.add({
      title: '입력 오류',
      description: '인증 코드를 입력해주세요.',
      color: 'error',
    });
    return;
  }

  isEmailVerifying.value = true;
  try {
    await useApi('/user/verify-email-change', {
      method: 'POST',
      body: {
        email: emailForm.newEmail,
        code: emailForm.verificationCode,
      },
    });

    toast.add({
      title: '이메일 변경 완료',
      description: '이메일이 성공적으로 변경되었습니다.',
      color: 'success',
    });

    // 모달 닫기
    if (countdownTimer) clearInterval(countdownTimer);
    emit('close', true);
  } catch (error: any) {
    toast.add({
      title: '인증 실패',
      description: error?.data?.message || '이메일 변경에 실패했습니다.',
      color: 'error',
    });
  } finally {
    isEmailVerifying.value = false;
  }
};

const formattedCountdown = computed(() => {
  const minutes = Math.floor(countdown.value / 60);
  const seconds = countdown.value % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
});
</script>

<template>
  <UModal :close="{ onClick: () => emit('close', false) }">
    <template #header>
      <div class="flex items-center gap-3">
        <div
          class="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10"
        >
          <UIcon name="i-heroicons-envelope" class="text-primary" :size="20" />
        </div>
        <div>
          <h3 class="text-lg font-semibold">이메일 변경</h3>
          <p class="text-sm text-neutral-500 dark:text-neutral-400">
            새 이메일 주소로 인증 코드를 전송하여 변경합니다.
          </p>
        </div>
      </div>
    </template>

    <template #body>
      <div class="space-y-4">
        <UFormField label="새 이메일" name="newEmail" required>
          <div class="flex gap-2">
            <UInput
              v-model="emailForm.newEmail"
              type="email"
              placeholder="새 이메일을 입력하세요"
              icon="i-heroicons-envelope"
              size="lg"
              class="flex-1"
              :disabled="isCodeSent"
            />
            <UButton
              color="primary"
              size="lg"
              :loading="isEmailSending"
              :disabled="isCodeSent || isEmailSending"
              @click="handleSendEmailCode"
            >
              {{ isCodeSent ? '전송됨' : '인증코드 전송' }}
            </UButton>
          </div>
        </UFormField>

        <UFormField
          v-if="isCodeSent"
          label="인증 코드"
          name="verificationCode"
          required
        >
          <UInput
            v-model="emailForm.verificationCode"
            placeholder="6자리 인증 코드를 입력하세요"
            icon="i-heroicons-key"
            size="lg"
            maxlength="6"
          />
          <template #hint>
            <span v-if="countdown > 0" class="text-sm text-primary">
              남은 시간: {{ formattedCountdown }}
            </span>
            <span v-else class="text-sm text-error">
              인증 코드가 만료되었습니다. 다시 전송해주세요.
            </span>
          </template>
        </UFormField>

        <div class="flex justify-end gap-3 pt-4">
          <UButton
            variant="outline"
            color="neutral"
            size="md"
            @click="emit('close', false)"
          >
            취소
          </UButton>
          <UButton
            v-if="isCodeSent"
            color="primary"
            size="md"
            icon="i-heroicons-check"
            :loading="isEmailVerifying"
            :disabled="isEmailVerifying || countdown <= 0"
            @click="handleVerifyEmailChange"
          >
            이메일 변경
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>
