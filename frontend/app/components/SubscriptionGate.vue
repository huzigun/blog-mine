<script setup lang="ts">
interface Props {
  /**
   * 필요한 구독 상태 (기본값: ACTIVE)
   * TRIAL 포함 여부를 제어할 수 있음
   */
  requiredStatus?: ('ACTIVE' | 'TRIAL' | 'PAST_DUE')[];

  /**
   * 블러 강도
   * sm: 약간 흐림 (4px)
   * md: 중간 흐림 (8px)
   * lg: 강한 흐림 (12px)
   */
  blurIntensity?: 'sm' | 'md' | 'lg';

  /**
   * 미리보기 허용 여부
   * true: 블러 처리하여 내용 힌트 제공
   * false: 완전히 가림
   */
  showPreview?: boolean;

  /**
   * 커스텀 업그레이드 메시지
   */
  upgradeMessage?: string;

  /**
   * 업그레이드 버튼 텍스트
   */
  upgradeButtonText?: string;
}

const props = withDefaults(defineProps<Props>(), {
  requiredStatus: () => ['ACTIVE', 'TRIAL'],
  blurIntensity: 'md',
  showPreview: true,
  upgradeMessage: '이 기능을 사용하려면 구독이 필요합니다.',
  upgradeButtonText: '플랜 업그레이드',
});

const auth = useAuth();

// 구독 상태 확인
const hasRequiredSubscription = computed(() => {
  if (!auth.subscription) return false;
  return props.requiredStatus.includes(auth.subscription.status);
});

// 블러 클래스 계산
const blurClass = computed(() => {
  const intensityMap = {
    sm: 'blur-sm', // 4px
    md: 'blur-md', // 8px
    lg: 'blur-lg', // 12px
  };
  return intensityMap[props.blurIntensity];
});
</script>

<template>
  <div class="relative">
    <!-- 콘텐츠 -->
    <div
      :class="[
        'transition-all duration-300',
        !hasRequiredSubscription && showPreview ? blurClass : '',
        !hasRequiredSubscription && !showPreview ? 'opacity-0' : '',
      ]"
    >
      <slot />
    </div>

    <!-- 구독 필요 오버레이 -->
    <div
      v-if="!hasRequiredSubscription"
      class="absolute inset-0 flex items-center justify-center bg-neutral-900/50 backdrop-blur-sm"
    >
      <UCard class="max-w-md w-full mx-4">
        <template #header>
          <div class="flex items-center gap-3">
            <div
              class="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10"
            >
              <div class="i-heroicons-lock-closed text-primary text-2xl" />
            </div>
            <div>
              <h3 class="text-lg font-semibold">프리미엄 기능</h3>
              <p class="text-sm text-neutral-600 dark:text-neutral-400">
                구독이 필요합니다
              </p>
            </div>
          </div>
        </template>

        <!-- 커스텀 메시지 또는 기본 메시지 -->
        <div class="space-y-4">
          <slot name="locked">
            <p class="text-neutral-700 dark:text-neutral-300">
              {{ upgradeMessage }}
            </p>

            <!-- 현재 구독 상태 표시 -->
            <div
              v-if="auth.subscription"
              class="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-900"
            >
              <div class="flex items-center justify-between text-sm">
                <span class="text-neutral-600 dark:text-neutral-400"
                  >현재 플랜</span
                >
                <UBadge variant="soft" color="neutral">
                  {{ auth.subscription.plan.displayName }}
                </UBadge>
              </div>
              <div
                v-if="auth.subscription.status === 'EXPIRED'"
                class="mt-2 text-xs text-error"
              >
                구독이 만료되었습니다
              </div>
              <div
                v-else-if="auth.isCanceledSubscription"
                class="mt-2 text-xs text-warning"
              >
                구독 취소 예약됨
              </div>
            </div>

            <!-- 혜택 목록 -->
            <div class="space-y-2">
              <p class="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                프리미엄 플랜 혜택:
              </p>
              <ul class="space-y-1.5 text-sm text-neutral-600 dark:text-neutral-400">
                <li class="flex items-center gap-2">
                  <div class="i-heroicons-check-circle-solid text-success text-base" />
                  무제한 원고 생성
                </li>
                <li class="flex items-center gap-2">
                  <div class="i-heroicons-check-circle-solid text-success text-base" />
                  고급 분석 기능
                </li>
                <li class="flex items-center gap-2">
                  <div class="i-heroicons-check-circle-solid text-success text-base" />
                  우선 처리 큐
                </li>
                <li class="flex items-center gap-2">
                  <div class="i-heroicons-check-circle-solid text-success text-base" />
                  API 액세스
                </li>
              </ul>
            </div>
          </slot>
        </div>

        <template #footer>
          <div class="flex gap-2">
            <UButton
              color="primary"
              block
              icon="i-heroicons-arrow-up-circle"
              to="/pricing"
            >
              {{ upgradeButtonText }}
            </UButton>
          </div>
        </template>
      </UCard>
    </div>
  </div>
</template>
