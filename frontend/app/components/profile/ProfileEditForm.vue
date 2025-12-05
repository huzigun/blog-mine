<script lang="ts" setup>
import type { FormSubmitEvent } from '#ui/types';

interface ProfileEditFormData {
  name: string;
}

const props = defineProps<{
  currentName: string;
}>();

const emit = defineEmits<{ close: [boolean] }>();

const toast = useToast();
const [isPending, startTransition] = useTransition();

const state = reactive<ProfileEditFormData>({
  name: props.currentName,
});

const onSubmit = async (event: FormSubmitEvent<ProfileEditFormData>) => {
  startTransition(
    async () => {
      // TODO: API 호출로 변경 필요
      await new Promise((resolve) => setTimeout(resolve, 1000));
    },
    {
      onSuccess: () => {
        toast.add({
          title: '프로필 업데이트 완료',
          description: '이름이 성공적으로 변경되었습니다.',
          color: 'success',
        });
        emit('close', true);
      },
      onError: (error: any) => {
        toast.add({
          title: '프로필 업데이트 실패',
          description:
            error?.message || '프로필 업데이트 중 오류가 발생했습니다.',
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
          <UIcon name="i-heroicons-user" class="text-primary" :size="20" />
        </div>
        <div>
          <h3 class="text-lg font-semibold">이름 수정</h3>
          <p class="text-sm text-neutral-500 dark:text-neutral-400">
            사용자 이름을 수정할 수 있습니다.
          </p>
        </div>
      </div>
    </template>

    <template #body>
      <UForm :state="state" @submit="onSubmit" class="space-y-4">
        <UFormField label="이름" name="name" required>
          <UInput
            v-model="state.name"
            placeholder="이름을 입력하세요"
            icon="i-heroicons-user"
            size="lg"
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
            icon="i-heroicons-check"
            :loading="isPending"
          >
            저장
          </UButton>
        </div>
      </UForm>
    </template>
  </UModal>
</template>
