<script setup lang="ts">
import { useAdminApi } from '~/composables/useAdminApi';

interface Subscription {
  id: number;
  status: string;
  user: {
    id: number;
    email: string;
    name: string | null;
  };
  plan: {
    id: number;
    name: string;
    displayName: string;
    price: number;
  };
}

const props = defineProps<{
  subscription: Subscription;
}>();

const emit = defineEmits<{
  close: [result: boolean];
}>();

const toast = useToast();

const newStatus = ref(props.subscription.status);
const reason = ref('');
const isLoading = ref(false);

const statusOptions = [
  { label: '구독중', value: 'ACTIVE' },
  { label: '체험중', value: 'TRIAL' },
  { label: '만료됨', value: 'EXPIRED' },
  { label: '취소됨', value: 'CANCELED' },
];

const handleSubmit = async () => {
  if (!newStatus.value) return;

  isLoading.value = true;
  try {
    await useAdminApi(`/admin/subscriptions/${props.subscription.id}/status`, {
      method: 'PATCH',
      body: {
        status: newStatus.value,
        reason: reason.value || undefined,
      },
    });

    toast.add({
      title: '상태 변경 완료',
      description: '구독 상태가 변경되었습니다.',
      color: 'success',
    });

    emit('close', true);
  } catch (error: any) {
    toast.add({
      title: '상태 변경 실패',
      description: error.data?.message || '상태 변경에 실패했습니다.',
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
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold">구독 상태 변경</h3>
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-heroicons-x-mark"
              @click="handleCancel"
            />
          </div>
        </template>

        <div class="space-y-4">
          <div class="bg-neutral-100 dark:bg-neutral-800 rounded-lg p-4">
            <p class="text-sm text-neutral-500">대상 구독</p>
            <p class="font-medium">{{ subscription.user.email }}</p>
            <p class="text-sm text-neutral-500">
              {{ subscription.plan.displayName }} (ID: {{ subscription.id }})
            </p>
          </div>

          <UFormField label="변경할 상태">
            <USelect
              v-model="newStatus"
              :items="statusOptions"
              value-key="value"
              label-key="label"
            />
          </UFormField>

          <UFormField label="사유 (선택)">
            <UTextarea
              v-model="reason"
              placeholder="상태 변경 사유를 입력하세요..."
              :rows="3"
            />
          </UFormField>
        </div>

        <template #footer>
          <div class="flex justify-end gap-3">
            <UButton color="neutral" variant="outline" @click="handleCancel">
              취소
            </UButton>
            <UButton color="primary" :loading="isLoading" @click="handleSubmit">
              변경
            </UButton>
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>
