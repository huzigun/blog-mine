<script setup lang="ts">
import { useAdminApi } from '~/composables/useAdminApi';

interface Subscription {
  id: number;
  status: string;
  expiresAt: string;
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

const days = ref(30);
const reason = ref('');
const isLoading = ref(false);

const formatDate = (dateString: string | null) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

const handleSubmit = async () => {
  if (days.value <= 0) return;

  isLoading.value = true;
  try {
    await useAdminApi(`/admin/subscriptions/${props.subscription.id}/extend`, {
      method: 'POST',
      body: {
        days: days.value,
        reason: reason.value || undefined,
      },
    });

    toast.add({
      title: '기간 연장 완료',
      description: `구독 기간이 ${days.value}일 연장되었습니다.`,
      color: 'success',
    });

    emit('close', true);
  } catch (error: any) {
    toast.add({
      title: '기간 연장 실패',
      description: error.data?.message || '기간 연장에 실패했습니다.',
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
            <h3 class="text-lg font-semibold">구독 기간 연장</h3>
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
              현재 만료일: {{ formatDate(subscription.expiresAt) }}
            </p>
          </div>

          <UFormField label="연장 기간 (일)">
            <UInput v-model.number="days" type="number" min="1" />
          </UFormField>

          <UFormField label="사유 (선택)">
            <UTextarea
              v-model="reason"
              placeholder="기간 연장 사유를 입력하세요..."
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
              연장
            </UButton>
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>
