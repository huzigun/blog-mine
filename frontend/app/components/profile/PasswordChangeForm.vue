<script lang="ts" setup>
import type { FormSubmitEvent } from '#ui/types';

interface PasswordChangeFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const props = defineProps<{
  hasPassword: boolean;
}>();

const emit = defineEmits<{ close: [boolean] }>();

const toast = useToast();
const [isPending, startTransition] = useTransition();

const state = reactive<PasswordChangeFormData>({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
});

const onSubmit = async (event: FormSubmitEvent<PasswordChangeFormData>) => {
  if (event.data.newPassword !== event.data.confirmPassword) {
    toast.add({
      title: '오류',
      description: '새 비밀번호가 일치하지 않습니다.',
      color: 'error',
    });
    return;
  }

  startTransition(
    async () => {
      await useApi('/user/set-password', {
        method: 'POST',
        body: {
          currentPassword: event.data.currentPassword || undefined,
          newPassword: event.data.newPassword,
        },
      });
    },
    {
      onSuccess: () => {
        const isSettingPassword = !event.data.currentPassword;
        toast.add({
          title: '성공',
          description: isSettingPassword
            ? '비밀번호가 설정되었습니다.'
            : '비밀번호가 변경되었습니다.',
          color: 'success',
        });
        emit('close', true);
      },
      onError: (error: any) => {
        const errorMessage =
          error?.data?.message || '비밀번호 변경에 실패했습니다.';
        toast.add({
          title: '오류',
          description: errorMessage,
          color: 'error',
        });
      },
    },
  );
};
</script>

<template>
  <UModal :close="{ onClick: () => emit('close', false) }">
    <template #header>
      <div class="flex items-center gap-3">
        <div
          class="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10"
        >
          <UIcon name="i-heroicons-key" class="text-primary" :size="20" />
        </div>
        <div>
          <h3 class="text-lg font-semibold">
            {{ hasPassword ? '비밀번호 변경' : '비밀번호 설정' }}
          </h3>
          <p class="text-sm text-neutral-500 dark:text-neutral-400">
            {{
              hasPassword
                ? '보안을 위해 현재 비밀번호를 먼저 입력해주세요.'
                : '이메일/비밀번호 로그인을 위한 비밀번호를 설정하세요.'
            }}
          </p>
        </div>
      </div>
    </template>

    <template #body>
      <UForm :state="state" @submit="onSubmit" class="space-y-4">
        <!-- 카카오 전용 사용자 안내 -->
        <div
          v-if="!hasPassword"
          class="p-3 rounded-lg bg-info/10 border border-info/20"
        >
          <div class="flex items-start gap-2">
            <UIcon
              name="i-heroicons-information-circle"
              class="w-5 h-5 text-info flex-shrink-0 mt-0.5"
            />
            <div class="text-sm text-neutral-700 dark:text-neutral-300">
              <p>
                현재 카카오 계정으로만 로그인할 수 있습니다. 비밀번호를 설정하면
                이메일/비밀번호 로그인도 이용할 수 있습니다.
              </p>
            </div>
          </div>
        </div>

        <!-- 현재 비밀번호 (일반 사용자만) -->
        <UFormField
          v-if="hasPassword"
          label="현재 비밀번호"
          name="currentPassword"
          required
        >
          <UInput
            v-model="state.currentPassword"
            type="password"
            placeholder="현재 비밀번호를 입력하세요"
            icon="i-heroicons-lock-closed"
            size="lg"
            class="w-full"
          />
        </UFormField>

        <UFormField label="새 비밀번호" name="newPassword" required>
          <UInput
            v-model="state.newPassword"
            type="password"
            placeholder="새 비밀번호를 입력하세요 (최소 8자)"
            icon="i-heroicons-key"
            size="lg"
            class="w-full"
          />
        </UFormField>

        <UFormField label="새 비밀번호 확인" name="confirmPassword" required>
          <UInput
            v-model="state.confirmPassword"
            type="password"
            placeholder="새 비밀번호를 다시 입력하세요"
            icon="i-heroicons-key"
            size="lg"
            class="w-full"
          />
        </UFormField>

        <div class="flex justify-end gap-3 pt-4">
          <UButton
            variant="outline"
            color="neutral"
            size="md"
            @click="emit('close', false)"
            :disabled="isPending"
          >
            취소
          </UButton>
          <UButton
            type="submit"
            color="primary"
            size="md"
            :icon="hasPassword ? 'i-heroicons-arrow-path' : 'i-heroicons-check'"
            :loading="isPending"
          >
            {{ hasPassword ? '변경' : '설정' }}
          </UButton>
        </div>
      </UForm>
    </template>
  </UModal>
</template>
