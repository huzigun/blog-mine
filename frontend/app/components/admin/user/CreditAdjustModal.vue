<script setup lang="ts">
import { useAdminApi } from '~/composables/useAdminApi';

interface Props {
  userId: number;
  userName: string;
  currentCredits: {
    subscriptionCredits: number;
    purchasedCredits: number;
    bonusCredits: number;
    totalCredits: number;
  } | null;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  close: [result: boolean];
}>();

const toast = useToast();

const form = ref({
  amount: 0,
  creditType: 'BONUS' as 'SUBSCRIPTION' | 'PURCHASED' | 'BONUS',
  reason: '',
});

const isLoading = ref(false);
const isAdding = ref(true); // true: 추가, false: 차감

// 크레딧 타입 옵션
const creditTypeOptions = [
  { label: '보너스 크레딧', value: 'BONUS' },
  { label: '구독 크레딧', value: 'SUBSCRIPTION' },
  { label: '구매 크레딧', value: 'PURCHASED' },
];

// 현재 선택된 크레딧 타입의 잔액
const currentTypeBalance = computed(() => {
  if (!props.currentCredits) return 0;
  switch (form.value.creditType) {
    case 'SUBSCRIPTION':
      return props.currentCredits.subscriptionCredits;
    case 'PURCHASED':
      return props.currentCredits.purchasedCredits;
    case 'BONUS':
      return props.currentCredits.bonusCredits;
    default:
      return 0;
  }
});

// 최종 조정 금액 (부호 포함)
const adjustedAmount = computed(() => {
  return isAdding.value ? Math.abs(form.value.amount) : -Math.abs(form.value.amount);
});

// 차감 시 잔액 초과 체크
const isExceedingBalance = computed(() => {
  if (isAdding.value) return false;
  return Math.abs(form.value.amount) > currentTypeBalance.value;
});

const handleSubmit = async () => {
  if (form.value.amount <= 0) {
    toast.add({
      title: '입력 오류',
      description: '조정할 크레딧 금액을 입력해주세요.',
      color: 'warning',
    });
    return;
  }

  if (!form.value.reason.trim()) {
    toast.add({
      title: '입력 오류',
      description: '조정 사유를 입력해주세요.',
      color: 'warning',
    });
    return;
  }

  if (isExceedingBalance.value) {
    toast.add({
      title: '입력 오류',
      description: '차감 금액이 잔액을 초과합니다.',
      color: 'warning',
    });
    return;
  }

  isLoading.value = true;
  try {
    await useAdminApi(`/admin/users/${props.userId}/credits/adjust`, {
      method: 'POST',
      body: {
        amount: adjustedAmount.value,
        creditType: form.value.creditType,
        reason: form.value.reason,
      },
    });

    toast.add({
      title: '조정 완료',
      description: `${Math.abs(form.value.amount)} 크레딧이 ${isAdding.value ? '추가' : '차감'}되었습니다.`,
      color: 'success',
    });

    emit('close', true);
  } catch (error: any) {
    toast.add({
      title: '조정 실패',
      description: error.data?.message || '크레딧 조정에 실패했습니다.',
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
            <h3 class="text-lg font-semibold">크레딧 조정</h3>
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-heroicons-x-mark"
              @click="handleCancel"
            />
          </div>
        </template>

        <div class="space-y-4">
          <!-- 사용자 정보 -->
          <div class="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
            <p class="text-sm text-neutral-500">대상 사용자</p>
            <p class="font-medium">{{ userName }}</p>
            <p class="text-sm text-neutral-500 mt-2">
              현재 총 크레딧:
              <span class="font-semibold text-primary-600">
                {{ currentCredits?.totalCredits?.toLocaleString() || 0 }} BloC
              </span>
            </p>
          </div>

          <!-- 추가/차감 선택 -->
          <UFormField label="조정 유형" required>
            <div class="flex gap-2">
              <UButton
                :color="isAdding ? 'primary' : 'neutral'"
                :variant="isAdding ? 'solid' : 'outline'"
                class="flex-1"
                @click="isAdding = true"
              >
                추가
              </UButton>
              <UButton
                :color="!isAdding ? 'error' : 'neutral'"
                :variant="!isAdding ? 'solid' : 'outline'"
                class="flex-1"
                @click="isAdding = false"
              >
                차감
              </UButton>
            </div>
          </UFormField>

          <!-- 크레딧 타입 -->
          <UFormField label="크레딧 타입" required>
            <USelect v-model="form.creditType" :items="creditTypeOptions" />
            <p class="text-xs text-neutral-500 mt-1">
              현재 {{ creditTypeOptions.find(o => o.value === form.creditType)?.label }} 잔액:
              {{ currentTypeBalance.toLocaleString() }} BloC
            </p>
          </UFormField>

          <!-- 조정 금액 -->
          <UFormField label="조정 금액 (BloC)" required>
            <UInput
              v-model.number="form.amount"
              type="number"
              :min="1"
              placeholder="조정할 크레딧 금액"
            />
            <p
              v-if="isExceedingBalance"
              class="text-xs text-error-500 mt-1"
            >
              차감 금액이 잔액을 초과합니다.
            </p>
          </UFormField>

          <!-- 조정 사유 -->
          <UFormField label="조정 사유" required>
            <UTextarea
              v-model="form.reason"
              placeholder="크레딧 조정 사유를 입력해주세요"
              :rows="3"
            />
          </UFormField>

          <!-- 미리보기 -->
          <div class="p-3 border rounded-lg" :class="isAdding ? 'border-success-200 bg-success-50' : 'border-error-200 bg-error-50'">
            <p class="text-sm font-medium" :class="isAdding ? 'text-success-700' : 'text-error-700'">
              {{ isAdding ? '+' : '-' }}{{ Math.abs(form.amount).toLocaleString() }} BloC
              {{ isAdding ? '추가' : '차감' }} 예정
            </p>
          </div>
        </div>

        <template #footer>
          <div class="flex justify-end gap-3">
            <UButton color="neutral" variant="outline" @click="handleCancel">
              취소
            </UButton>
            <UButton
              :color="isAdding ? 'primary' : 'error'"
              :loading="isLoading"
              :disabled="form.amount <= 0 || !form.reason.trim() || isExceedingBalance"
              @click="handleSubmit"
            >
              {{ isAdding ? '크레딧 추가' : '크레딧 차감' }}
            </UButton>
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>
