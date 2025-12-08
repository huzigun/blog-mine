<script setup lang="ts">
const route = useRoute();

// 현재 활성 탭 결정
const currentTab = computed(() => {
  const path = route.path;
  if (path.includes('/transactions')) return 'transactions';
  return 'charge';
});

// 탭 메뉴 정의
const tabs = [
  {
    label: 'BloC 충전',
    icon: 'i-heroicons-wallet',
    to: '/mypage/credits',
    value: 'charge',
  },
  {
    label: 'BloC 거래 내역',
    icon: 'i-heroicons-clipboard-document-list',
    to: '/mypage/credits/transactions',
    value: 'transactions',
  },
];

// BloC 잔액 조회
const {
  data: creditBalance,
  pending: balancePending,
  refresh: refreshBalance,
} = await useApiFetch<{
  totalCredits: number;
  subscriptionCredits: number;
  purchasedCredits: number;
  bonusCredits: number;
}>('/credits/balance');

// 숫자 포맷팅
const formatNumber = (num: number) => {
  return new Intl.NumberFormat('ko-KR').format(num);
};
</script>

<template>
  <div class="container mx-auto px-4 py-8 max-w-6xl">
    <!-- 헤더 -->
    <div class="mb-6">
      <h1 class="text-3xl font-bold text-neutral-900 dark:text-white mb-2">
        BloC 관리
      </h1>
      <p class="text-neutral-600 dark:text-neutral-400">
        BloC(크레딧) 충전 및 거래 내역을 확인하세요
      </p>
    </div>

    <!-- BloC 보유 현황 -->
    <div class="mb-8">
      <UCard v-if="balancePending" class="overflow-hidden">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div v-for="i in 4" :key="i" class="text-center">
            <USkeleton class="h-4 w-20 mx-auto mb-2" />
            <USkeleton class="h-8 w-32 mx-auto" />
          </div>
        </div>
      </UCard>

      <UCard v-else-if="creditBalance" class="overflow-hidden bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-950 dark:to-primary-900">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
          <!-- 총 보유 BloC -->
          <div class="text-center">
            <div class="flex items-center justify-center gap-2 mb-2">
              <UIcon name="i-heroicons-wallet" class="text-primary" :size="20" />
              <p class="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                총 보유 BloC
              </p>
            </div>
            <p class="text-3xl font-bold text-primary">
              {{ formatNumber(creditBalance.totalCredits) }}
            </p>
          </div>

          <!-- 구독 BloC -->
          <div class="text-center border-l border-neutral-200 dark:border-neutral-700">
            <div class="flex items-center justify-center gap-2 mb-2">
              <UIcon name="i-heroicons-calendar" class="text-info" :size="18" />
              <p class="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                구독 BloC
              </p>
            </div>
            <p class="text-2xl font-semibold text-neutral-900 dark:text-white">
              {{ formatNumber(creditBalance.subscriptionCredits) }}
            </p>
          </div>

          <!-- 구매 BloC -->
          <div class="text-center border-l border-neutral-200 dark:border-neutral-700">
            <div class="flex items-center justify-center gap-2 mb-2">
              <UIcon name="i-heroicons-shopping-cart" class="text-success" :size="18" />
              <p class="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                구매 BloC
              </p>
            </div>
            <p class="text-2xl font-semibold text-neutral-900 dark:text-white">
              {{ formatNumber(creditBalance.purchasedCredits) }}
            </p>
          </div>

          <!-- 보너스 BloC -->
          <div class="text-center border-l border-neutral-200 dark:border-neutral-700">
            <div class="flex items-center justify-center gap-2 mb-2">
              <UIcon name="i-heroicons-gift" class="text-warning" :size="18" />
              <p class="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                보너스 BloC
              </p>
            </div>
            <p class="text-2xl font-semibold text-neutral-900 dark:text-white">
              {{ formatNumber(creditBalance.bonusCredits) }}
            </p>
          </div>
        </div>
      </UCard>
    </div>

    <!-- 탭 네비게이션 -->
    <div class="mb-6">
      <div
        class="border-b border-neutral-200 dark:border-neutral-800"
        role="tablist"
      >
        <nav class="flex space-x-1" aria-label="BloC 관리 탭">
          <NuxtLink
            v-for="tab in tabs"
            :key="tab.value"
            :to="tab.to"
            class="group relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors"
            :class="[
              currentTab === tab.value
                ? 'text-primary border-b-2 border-primary'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white border-b-2 border-transparent hover:border-neutral-300 dark:hover:border-neutral-700',
            ]"
            :aria-current="currentTab === tab.value ? 'page' : undefined"
            role="tab"
          >
            <UIcon :name="tab.icon" :size="20" />
            <span>{{ tab.label }}</span>

            <!-- 활성 탭 인디케이터 -->
            <span
              v-if="currentTab === tab.value"
              class="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
              aria-hidden="true"
            />
          </NuxtLink>
        </nav>
      </div>
    </div>

    <!-- 페이지 콘텐츠 슬롯 -->
    <div role="tabpanel">
      <slot />
    </div>
  </div>
</template>

<style scoped>
/* 부드러운 전환 효과 */
.group {
  transition: all 0.2s ease-in-out;
}

/* 호버 시 아이콘 애니메이션 */
.group:hover :deep(.i-heroicons-wallet),
.group:hover :deep(.i-heroicons-clipboard-document-list) {
  transform: scale(1.1);
  transition: transform 0.2s ease-in-out;
}
</style>
