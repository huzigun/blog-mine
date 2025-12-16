<script lang="ts" setup>
interface Props {
  amount: number;
  description: string;
  itemName?: string;
  cardInfo?: string;
  // BloC 크레딧 정보
  currentCredits?: number;
  creditsToAdd?: number;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  close: [confirmed: boolean];
}>();

const formatNumber = (num: number) => {
  return new Intl.NumberFormat('ko-KR').format(num);
};

// 충전 후 예상 BloC
const creditsAfterCharge = computed(() => {
  if (props.currentCredits === undefined || props.creditsToAdd === undefined) {
    return undefined;
  }
  return props.currentCredits + props.creditsToAdd;
});

// BloC 정보가 있는지 여부
const hasCreditsInfo = computed(() => {
  return props.currentCredits !== undefined && props.creditsToAdd !== undefined;
});

const confirm = () => {
  emit('close', true);
};

const cancel = () => {
  emit('close', false);
};
</script>

<template>
  <UModal>
    <template #header>
      <div class="flex items-center gap-2">
        <UIcon name="i-heroicons-credit-card" class="text-primary" :size="24" />
        <h2 class="text-xl font-semibold">결제 확인</h2>
      </div>
    </template>

    <template #body>
      <div class="space-y-4">
        <!-- 경고 아이콘 및 메시지 -->
        <div
          class="flex items-center gap-3 p-4 bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800 rounded-lg"
        >
          <UIcon
            name="i-heroicons-exclamation-triangle"
            class="text-warning shrink-0"
            :size="24"
          />
          <p class="text-sm text-warning-800 dark:text-warning-200">
            결제를 진행하시겠습니까? 결제 후에는 취소가 어려울 수 있습니다.
          </p>
        </div>

        <!-- 결제 상세 정보 -->
        <div class="p-4 bg-neutral-50 dark:bg-neutral-900 rounded-lg space-y-3">
          <div class="flex justify-between items-center">
            <span class="text-neutral-600 dark:text-neutral-400">
              결제 항목
            </span>
            <span class="font-medium text-neutral-900 dark:text-white">
              {{ props.itemName || props.description }}
            </span>
          </div>

          <div v-if="props.cardInfo" class="flex justify-between items-center">
            <span class="text-neutral-600 dark:text-neutral-400">
              결제 수단
            </span>
            <span class="font-medium text-neutral-900 dark:text-white">
              {{ props.cardInfo }}
            </span>
          </div>

          <div
            class="flex justify-between items-center pt-3 border-t border-neutral-200 dark:border-neutral-700"
          >
            <span
              class="text-base font-semibold text-neutral-900 dark:text-white"
            >
              결제 금액
            </span>
            <span class="text-lg font-bold text-primary">
              {{ formatNumber(props.amount) }}원
            </span>
          </div>
        </div>

        <!-- BloC 크레딧 정보 -->
        <div
          v-if="hasCreditsInfo"
          class="p-4 bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-lg space-y-3"
        >
          <div class="flex items-center gap-2 mb-2">
            <UIcon name="i-heroicons-wallet" class="text-primary" :size="20" />
            <span class="font-semibold text-neutral-900 dark:text-white">
              BloC 변동 내역
            </span>
          </div>

          <div class="flex justify-between items-center">
            <span class="text-neutral-600 dark:text-neutral-400">
              현재 보유
            </span>
            <span class="font-medium text-neutral-900 dark:text-white">
              {{ formatNumber(props.currentCredits!) }} BloC
            </span>
          </div>

          <div class="flex justify-between items-center">
            <span class="text-neutral-600 dark:text-neutral-400">
              충전 예정
            </span>
            <span class="font-medium text-success">
              +{{ formatNumber(props.creditsToAdd!) }} BloC
            </span>
          </div>

          <div
            class="flex justify-between items-center pt-3 border-t border-primary/20"
          >
            <span
              class="text-base font-semibold text-neutral-900 dark:text-white"
            >
              충전 후 예상
            </span>
            <span class="text-lg font-bold text-primary">
              {{ formatNumber(creditsAfterCharge!) }} BloC
            </span>
          </div>
        </div>

        <!-- 안내 문구 -->
        <p class="text-xs text-neutral-500 dark:text-neutral-400 text-center">
          결제 버튼을 클릭하면 위 금액이 즉시 결제됩니다.
        </p>
      </div>
    </template>

    <template #footer>
      <div class="flex gap-3 justify-end w-full">
        <UButton color="neutral" variant="outline" @click="cancel">
          취소
        </UButton>
        <UButton color="primary" @click="confirm">결제하기</UButton>
      </div>
    </template>
  </UModal>
</template>
