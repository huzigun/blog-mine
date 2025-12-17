<script setup lang="ts">
const { balance, isLoading, formattedBalance, isLow, isEmpty, fetchBalance } =
  useCredits();

// 초기 로드
onMounted(async () => {
  if (!balance.value) {
    await fetchBalance();
  }
});

// 크레딧 상태에 따른 색상
const balanceColor = computed(() => {
  if (isEmpty.value) return 'error';
  if (isLow.value) return 'warning';
  return 'primary';
});

// 크레딧 상태에 따른 아이콘
const balanceIcon = computed(() => {
  if (isEmpty.value) return 'i-heroicons-exclamation-triangle';
  if (isLow.value) return 'i-heroicons-exclamation-circle';
  return 'i-heroicons-bolt';
});
</script>

<template>
  <NuxtLink
    to="/mypage/credits"
    class="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all hover:bg-neutral-100 dark:hover:bg-neutral-800 group"
    :class="{
      'animate-pulse': isLoading,
    }"
  >
    <!-- 아이콘 -->
    <div
      class="flex items-center justify-center w-7 h-7 rounded-full transition-colors"
      :class="{
        'bg-primary-100 dark:bg-primary-900/30': balanceColor === 'primary',
        'bg-warning-100 dark:bg-warning-900/30': balanceColor === 'warning',
        'bg-error-100 dark:bg-error-900/30': balanceColor === 'error',
      }"
    >
      <UIcon
        :name="balanceIcon"
        class="w-4 h-4"
        :class="{
          'text-primary-600 dark:text-primary-400': balanceColor === 'primary',
          'text-warning-600 dark:text-warning-400': balanceColor === 'warning',
          'text-error-600 dark:text-error-400': balanceColor === 'error',
        }"
      />
    </div>

    <!-- 잔액 표시 -->
    <div class="flex flex-col">
      <span class="text-[10px] text-neutral-500 dark:text-neutral-400 leading-tight">
        잔여 BloC
      </span>
      <div class="flex items-center gap-1">
        <span
          class="text-sm font-bold leading-tight"
          :class="{
            'text-primary-600 dark:text-primary-400': balanceColor === 'primary',
            'text-warning-600 dark:text-warning-400': balanceColor === 'warning',
            'text-error-600 dark:text-error-400': balanceColor === 'error',
          }"
        >
          {{ isLoading ? '...' : formattedBalance }}
        </span>
        <!-- 부족 경고 뱃지 -->
        <UBadge
          v-if="isLow && !isEmpty"
          color="warning"
          variant="soft"
          size="xs"
          class="text-[9px] px-1"
        >
          부족
        </UBadge>
        <UBadge
          v-else-if="isEmpty"
          color="error"
          variant="soft"
          size="xs"
          class="text-[9px] px-1"
        >
          충전필요
        </UBadge>
      </div>
    </div>

    <!-- 충전 화살표 (호버 시 표시) -->
    <UIcon
      name="i-heroicons-chevron-right"
      class="w-3 h-3 text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity ml-1"
    />
  </NuxtLink>
</template>
