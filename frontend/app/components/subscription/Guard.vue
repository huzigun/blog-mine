<script setup lang="ts">
/**
 * 구독 가드 컴포넌트
 * 자식 컴포넌트를 감싸서 구독 상태에 따라 블러 처리 및 모달 표시
 */
const {
  isModalOpen,
  hasActiveSubscription,
  checkSubscription,
  closeModal,
  goToSubscription,
} = useSubscriptionGuard();
const uiStroe = useUiStore();

// 컴포넌트 마운트 시 구독 상태 확인
onMounted(() => {
  checkSubscription();
});
</script>

<template>
  <div class="min-h-[calc(100vh-4rem)]">
    <!-- 실제 콘텐츠 -->
    <div
      :class="{
        'blur-sm pointer-events-none select-none': !hasActiveSubscription,
      }"
    >
      <slot />
    </div>

    <!-- 구독 필요 오버레이 (뷰포트 중앙 고정) -->
    <div
      v-if="!hasActiveSubscription"
      class="fixed inset-0 bg-neutral-900/20 dark:bg-neutral-950/40 backdrop-blur-[2px] flex items-center justify-center z-10"
    >
      <div class="text-center space-y-4">
        <!-- 구독 만료 안내 -->
        <div
          class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-6 shadow-xl w-md mx-4 transition-all"
          :style="{
            marginLeft: uiStroe.isSidebarOpen ? '256px' : '64px',
          }"
        >
          <div class="space-y-4 mb-4">
            <!-- Icon -->
            <div
              class="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center"
            >
              <UIcon
                name="i-heroicons-lock-closed"
                class="w-8 h-8 text-primary"
              />
            </div>

            <!-- Message -->
            <div class="text-center">
              <p class="text-neutral-600 dark:text-neutral-400 mb-4">
                이 기능을 사용하려면 유료 구독이 필요합니다.
                <br />
                지금 구독하고 모든 기능을 이용해보세요.
              </p>
            </div>

            <!-- Features List -->
            <div
              class="bg-neutral-50 dark:bg-neutral-900 rounded-lg p-4 space-y-2"
            >
              <div class="flex items-center gap-2 text-sm">
                <UIcon
                  name="i-heroicons-check-circle"
                  class="w-5 h-5 text-success shrink-0"
                />
                <span class="text-neutral-700 dark:text-neutral-300">
                  AI 블로그 무제한 생성
                </span>
              </div>
              <div class="flex items-center gap-2 text-sm">
                <UIcon
                  name="i-heroicons-check-circle"
                  class="w-5 h-5 text-success shrink-0"
                />
                <span class="text-neutral-700 dark:text-neutral-300">
                  키워드 추적 및 순위 분석
                </span>
              </div>
              <div class="flex items-center gap-2 text-sm">
                <UIcon
                  name="i-heroicons-check-circle"
                  class="w-5 h-5 text-success shrink-0"
                />
                <span class="text-neutral-700 dark:text-neutral-300">
                  우선 처리 및 고급 기능
                </span>
              </div>
            </div>
          </div>
          <UButton to="/pricing" color="primary" block size="lg">
            구독 플랜 보기
          </UButton>
        </div>
      </div>
    </div>
  </div>
</template>
