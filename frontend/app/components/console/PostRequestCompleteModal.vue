<script lang="ts" setup>
/**
 * 원고 요청 완료 모달
 * useOverlay 패턴으로 사용
 */

defineOptions({
  inheritAttrs: false,
});

const props = withDefaults(
  defineProps<{
    open?: boolean; // useOverlay에서 주입되는 prop
    count: number; // 요청한 원고 수
  }>(),
  {
    open: false,
  },
);

const emit = defineEmits<{
  'update:open': [value: boolean];
  close: [action: 'continue' | 'navigate'];
}>();

// 예상 소요시간 계산 (원고 1개당 2분)
const estimatedMinutes = computed(() => props.count * 2);

// 시간 포맷팅 (30분 이상이면 시간:분 형식)
const formattedTime = computed(() => {
  const minutes = estimatedMinutes.value;
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0
      ? `약 ${hours}시간 ${remainingMinutes}분`
      : `약 ${hours}시간`;
  }
  return `약 ${minutes}분`;
});

const handleContinue = () => {
  emit('close', 'continue');
};

const handleNavigate = () => {
  emit('close', 'navigate');
};
</script>

<template>
  <UModal :open="open" @update:open="emit('update:open', $event)">
    <template #header>
      <div class="flex items-center gap-3">
        <div
          class="w-10 h-10 rounded-full bg-success-100 dark:bg-success-900/30 flex items-center justify-center"
        >
          <UIcon
            name="i-heroicons-check-circle"
            class="w-6 h-6 text-success-600"
          />
        </div>
        <div>
          <h3 class="text-lg font-bold text-neutral-900 dark:text-white">
            원고 생성 요청 완료
          </h3>
        </div>
      </div>
    </template>

    <template #body>
      <div class="space-y-5">
        <!-- 요청 정보 카드 -->
        <div
          class="p-4 rounded-xl bg-primary-50 dark:bg-primary-950/20 border border-primary-200 dark:border-primary-800"
        >
          <div class="flex items-center justify-between mb-3">
            <span class="text-sm text-primary-700 dark:text-primary-400">
              요청한 원고 수
            </span>
            <span class="text-lg font-bold text-primary-600">
              {{ count }}개
            </span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm text-primary-700 dark:text-primary-400">
              예상 소요시간
            </span>
            <span class="text-lg font-bold text-primary-600">
              {{ formattedTime }}
            </span>
          </div>
        </div>

        <!-- 안내 메시지 -->
        <div class="space-y-3">
          <div class="flex items-start gap-3">
            <UIcon
              name="i-heroicons-clock"
              class="w-5 h-5 text-neutral-500 mt-0.5 shrink-0"
            />
            <p class="text-sm text-neutral-600 dark:text-neutral-400">
              AI가 원고를 생성하고 있습니다. 완료되면 알림으로 안내드립니다.
            </p>
          </div>
          <div class="flex items-start gap-3">
            <UIcon
              name="i-heroicons-folder-open"
              class="w-5 h-5 text-neutral-500 mt-0.5 shrink-0"
            />
            <p class="text-sm text-neutral-600 dark:text-neutral-400">
              진행 상황과 완료된 원고는
              <span class="font-semibold text-primary-600">원고 보관함</span>
              에서 확인하실 수 있습니다.
            </p>
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex gap-3 w-full">
        <UButton
          color="neutral"
          variant="outline"
          size="lg"
          @click="handleContinue"
          block
        >
          계속 작성하기
        </UButton>
        <UButton
          color="primary"
          size="lg"
          @click="handleNavigate"
          block
          icon="i-heroicons-folder-open"
        >
          원고 보관함 가기
        </UButton>
      </div>
    </template>
  </UModal>
</template>
