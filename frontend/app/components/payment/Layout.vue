<script setup lang="ts">
const route = useRoute();

// 현재 활성 탭 결정
const currentTab = computed(() => {
  const path = route.path;
  if (path.includes('/history')) return 'history';
  return 'cards';
});

// 탭 메뉴 정의
const tabs = [
  {
    label: '카드 관리',
    icon: 'i-heroicons-credit-card',
    to: '/mypage/payment',
    value: 'cards',
  },
  {
    label: '결제 내역',
    icon: 'i-heroicons-document-text',
    to: '/mypage/payment/history',
    value: 'history',
  },
];
</script>

<template>
  <div class="container mx-auto px-4 py-8 max-w-6xl">
    <!-- 헤더 -->
    <div class="mb-6">
      <h1 class="text-3xl font-bold text-neutral-900 dark:text-white mb-2">
        결제 관리
      </h1>
      <p class="text-neutral-600 dark:text-neutral-400">
        카드 등록 및 관리, 결제 내역을 확인하세요
      </p>
    </div>

    <!-- 탭 네비게이션 -->
    <div class="mb-6">
      <div
        class="border-b border-neutral-200 dark:border-neutral-800"
        role="tablist"
      >
        <nav class="flex space-x-1" aria-label="결제 관리 탭">
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
.group:hover :deep(.i-heroicons-credit-card),
.group:hover :deep(.i-heroicons-document-text) {
  transform: scale(1.1);
  transition: transform 0.2s ease-in-out;
}
</style>
