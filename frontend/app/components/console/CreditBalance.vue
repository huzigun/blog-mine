<script setup lang="ts">
const auth = useAuth();

// auth store에서 creditBalance 가져오기
const creditBalance = computed(() => auth.creditBalance);
const isLoading = computed(() => !auth.user);

// 포맷된 크레딧 표시
const formattedBalance = computed(() => {
  if (!creditBalance.value) return '0';
  return creditBalance.value.totalCredits.toLocaleString();
});

// 크레딧 부족 여부 (10개 미만)
const isLow = computed(() => {
  if (!creditBalance.value) return false;
  return creditBalance.value.totalCredits < 10;
});

// 크레딧 없음 여부
const isEmpty = computed(() => {
  if (!creditBalance.value) return true;
  return creditBalance.value.totalCredits <= 0;
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
  >
    <!-- 스켈레톤 UI (로딩 중) -->
    <template v-if="isLoading">
      <div class="flex items-center gap-2 animate-pulse">
        <!-- 아이콘 스켈레톤 -->
        <div class="w-7 h-7 rounded-full bg-neutral-200 dark:bg-neutral-700" />
        <!-- 텍스트 스켈레톤 -->
        <div class="flex flex-col gap-1">
          <div class="w-12 h-2 rounded bg-neutral-200 dark:bg-neutral-700" />
          <div class="w-16 h-4 rounded bg-neutral-200 dark:bg-neutral-700" />
        </div>
      </div>
    </template>

    <!-- 실제 콘텐츠 -->
    <template v-else>
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
            {{ formattedBalance }}
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
    </template>
  </NuxtLink>
</template>
