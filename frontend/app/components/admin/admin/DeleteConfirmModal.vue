<script setup lang="ts">
import { useAdminApi } from '~/composables/useAdminApi';

const props = defineProps<{
  adminId: number;
  adminName: string;
  adminEmail: string;
}>();

const emit = defineEmits<{
  close: [result: boolean];
}>();

const toast = useToast();
const isLoading = ref(false);

const handleDelete = async () => {
  isLoading.value = true;
  try {
    await useAdminApi(`/admin/admins/${props.adminId}`, {
      method: 'DELETE',
    });

    toast.add({
      title: '삭제 완료',
      description: '관리자가 삭제되었습니다.',
      color: 'success',
    });

    emit('close', true);
  } catch (error: any) {
    toast.add({
      title: '삭제 실패',
      description: error.data?.message || '삭제에 실패했습니다.',
      color: 'error',
    });
  } finally {
    isLoading.value = false;
  }
};

const handleCancel = () => {
  emit('close', false);
};
</script>

<template>
  <UModal :open="true" @update:open="handleCancel">
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center gap-3">
            <UIcon
              name="i-heroicons-exclamation-triangle"
              class="w-6 h-6 text-error-500"
            />
            <h3 class="text-lg font-semibold">관리자 삭제</h3>
          </div>
        </template>

        <div class="space-y-3">
          <p class="text-neutral-600 dark:text-neutral-400">
            이 관리자를 삭제하시겠습니까?
          </p>
          <div class="bg-neutral-100 dark:bg-neutral-800 rounded-lg p-3">
            <p class="font-medium">{{ adminName }}</p>
            <p class="text-sm text-neutral-500">{{ adminEmail }}</p>
          </div>
          <p class="text-sm text-error-500">
            삭제된 관리자는 더 이상 로그인할 수 없습니다.
          </p>
        </div>

        <template #footer>
          <div class="flex justify-end gap-3">
            <UButton color="neutral" variant="outline" @click="handleCancel">
              취소
            </UButton>
            <UButton color="error" :loading="isLoading" @click="handleDelete">
              삭제
            </UButton>
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>
