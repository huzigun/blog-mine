<script setup lang="ts">
interface Props {
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  confirmColor?: 'primary' | 'error' | 'warning' | 'success';
  icon?: string;
}

const props = withDefaults(defineProps<Props>(), {
  title: '확인',
  description: '이 작업을 수행하시겠습니까?',
  confirmText: '확인',
  cancelText: '취소',
  confirmColor: 'primary',
  icon: 'i-heroicons-question-mark-circle',
});

const customTheme = {
  content: 'bg-default divide-none flex flex-col focus:outline-none',
  body: 'flex-1 p-3 sm:p-4 sm:py:2.5',
  footer: 'flex items-center gap-1.5 p-3 sm:px-4 sm:py-2.5',
};

const emit = defineEmits<{
  close: [confirmed: boolean];
}>();

const handleConfirm = () => {
  emit('close', true);
};

const handleCancel = () => {
  emit('close', false);
};
</script>

<template>
  <UModal
    :title="title"
    :description="description"
    :ui="customTheme"
    class="max-w-md"
  >
    <template #content>
      <div class="p-4">
        <div class="flex flex-col items-center gap-2.5 mb-6 pt-3">
          <UIcon :name="icon" class="size-6 text-neutral-400" />
          <h3 class="text-lg font-semibold">
            {{ title }}
          </h3>
          <p class="text-sm text-neutral-500">{{ description }}</p>
        </div>
        <div class="flex justify-end gap-2 w-full">
          <UButton :color="'neutral'" variant="outline" @click="handleCancel">
            {{ cancelText }}
          </UButton>
          <UButton :color="confirmColor" @click="handleConfirm">
            {{ confirmText }}
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>
