<script setup lang="ts">
import { useAdminApi } from '~/composables/useAdminApi';

interface Payment {
  id: number;
  amount: number;
  currency: string;
  status: string;
  refundAmount: number | null;
  user: {
    id: number;
    email: string;
    name: string | null;
  };
}

const props = defineProps<{
  payment: Payment;
}>();

const emit = defineEmits<{
  close: [result: boolean];
}>();

const toast = useToast();

const refundType = ref<'full' | 'partial'>('full');
const partialAmount = ref(0);
const reason = ref('');
const isLoading = ref(false);

// 환불 가능 금액
const refundableAmount = computed(() => {
  return props.payment.amount - (props.payment.refundAmount || 0);
});

// 환불 금액
const refundAmount = computed(() => {
  return refundType.value === 'full' ? refundableAmount.value : partialAmount.value;
});

// 금액 포맷
const formatPrice = (price: number) => {
  return new Intl.NumberFormat('ko-KR').format(price) + '원';
};

const handleSubmit = async () => {
  if (!reason.value.trim()) {
    toast.add({
      title: '환불 사유 필요',
      description: '환불 사유를 입력해주세요.',
      color: 'warning',
    });
    return;
  }

  if (refundType.value === 'partial') {
    if (partialAmount.value <= 0) {
      toast.add({
        title: '금액 오류',
        description: '환불 금액을 입력해주세요.',
        color: 'warning',
      });
      return;
    }
    if (partialAmount.value > refundableAmount.value) {
      toast.add({
        title: '금액 초과',
        description: `환불 가능 금액(${formatPrice(refundableAmount.value)})을 초과했습니다.`,
        color: 'warning',
      });
      return;
    }
  }

  isLoading.value = true;
  try {
    await useAdminApi(`/admin/payments/${props.payment.id}/refund`, {
      method: 'POST',
      body: {
        amount: refundType.value === 'partial' ? partialAmount.value : undefined,
        reason: reason.value,
      },
    });

    toast.add({
      title: '환불 처리 완료',
      description: `${formatPrice(refundAmount.value)}가 환불 처리되었습니다.`,
      color: 'success',
    });

    emit('close', true);
  } catch (error: any) {
    toast.add({
      title: '환불 처리 실패',
      description: error.data?.message || '환불 처리에 실패했습니다.',
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
            <h3 class="text-lg font-semibold">결제 환불</h3>
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
            <p class="text-sm text-neutral-500">결제 정보</p>
            <p class="font-medium">{{ payment.user.email }}</p>
            <div class="mt-2 flex justify-between text-sm">
              <span class="text-neutral-500">결제 금액</span>
              <span class="font-medium">{{ formatPrice(payment.amount) }}</span>
            </div>
            <div v-if="payment.refundAmount" class="flex justify-between text-sm">
              <span class="text-neutral-500">기존 환불액</span>
              <span class="text-error-500">{{ formatPrice(payment.refundAmount) }}</span>
            </div>
            <div class="flex justify-between text-sm border-t border-neutral-200 dark:border-neutral-700 mt-2 pt-2">
              <span class="text-neutral-500">환불 가능 금액</span>
              <span class="font-bold text-primary-600">{{ formatPrice(refundableAmount) }}</span>
            </div>
          </div>

          <UFormField label="환불 유형">
            <div class="flex gap-4">
              <URadio
                v-model="refundType"
                value="full"
                label="전액 환불"
              />
              <URadio
                v-model="refundType"
                value="partial"
                label="부분 환불"
              />
            </div>
          </UFormField>

          <UFormField v-if="refundType === 'partial'" label="환불 금액">
            <UInput
              v-model.number="partialAmount"
              type="number"
              min="1"
              :max="refundableAmount"
              placeholder="환불할 금액을 입력하세요"
            />
            <template #hint>
              최대 {{ formatPrice(refundableAmount) }}까지 환불 가능
            </template>
          </UFormField>

          <UFormField label="환불 사유" required>
            <UTextarea
              v-model="reason"
              placeholder="환불 사유를 입력하세요..."
              :rows="3"
            />
          </UFormField>

          <div class="bg-warning-50 dark:bg-warning-900/20 rounded-lg p-4">
            <div class="flex items-start gap-3">
              <UIcon
                name="i-heroicons-exclamation-triangle"
                class="w-5 h-5 text-warning-500 mt-0.5"
              />
              <div>
                <p class="font-medium text-warning-700 dark:text-warning-400">
                  환불 확인
                </p>
                <p class="text-sm text-warning-600 dark:text-warning-500">
                  {{ formatPrice(refundAmount) }}가 환불 처리됩니다.
                  이 작업은 되돌릴 수 없습니다.
                </p>
              </div>
            </div>
          </div>
        </div>

        <template #footer>
          <div class="flex justify-end gap-3">
            <UButton color="neutral" variant="outline" @click="handleCancel">
              취소
            </UButton>
            <UButton
              color="error"
              :loading="isLoading"
              :disabled="!reason.trim()"
              @click="handleSubmit"
            >
              환불 처리
            </UButton>
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>
