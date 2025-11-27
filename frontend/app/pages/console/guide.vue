<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth'],
});
</script>

<template>
  <ComingSoon
    title="이용 가이드 준비중"
    description="사용자 가이드와 튜토리얼을 준비하고 있습니다. 더 나은 사용 경험을 위한 상세한 가이드를 제공할 예정입니다."
    icon="i-heroicons-book-open"
    :show-contact-button="true"
  >
    <template #features>
      <div
        class="p-4 border border-neutral-200 dark:border-neutral-800 rounded-lg text-center"
      >
        <div
          class="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center mx-auto mb-3"
        >
          <UIcon
            name="i-heroicons-academic-cap"
            class="w-6 h-6 text-blue-600"
          />
        </div>
        <h3 class="font-medium text-sm text-neutral-900 dark:text-white mb-1">
          튜토리얼
        </h3>
        <p class="text-xs text-neutral-600 dark:text-neutral-400">
          단계별 사용 가이드
        </p>
      </div>

      <div
        class="p-4 border border-neutral-200 dark:border-neutral-800 rounded-lg text-center"
      >
        <div
          class="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center mx-auto mb-3"
        >
          <UIcon
            name="i-heroicons-light-bulb"
            class="w-6 h-6 text-green-600"
          />
        </div>
        <h3 class="font-medium text-sm text-neutral-900 dark:text-white mb-1">
          활용 팁
        </h3>
        <p class="text-xs text-neutral-600 dark:text-neutral-400">
          효과적인 사용 방법
        </p>
      </div>

      <div
        class="p-4 border border-neutral-200 dark:border-neutral-800 rounded-lg text-center"
      >
        <div
          class="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center mx-auto mb-3"
        >
          <UIcon
            name="i-heroicons-question-mark-circle"
            class="w-6 h-6 text-purple-600"
          />
        </div>
        <h3 class="font-medium text-sm text-neutral-900 dark:text-white mb-1">
          FAQ
        </h3>
        <p class="text-xs text-neutral-600 dark:text-neutral-400">
          자주 묻는 질문
        </p>
      </div>
    </template>

    <template #default>
      <div
        class="mt-6 p-4 bg-primary/5 border border-primary/20 rounded-lg text-left"
      >
        <h3
          class="text-sm font-semibold text-neutral-900 dark:text-white mb-2"
        >
          📚 예정 가이드
        </h3>
        <ul class="text-sm text-neutral-600 dark:text-neutral-400 space-y-1">
          <li>• 빠른 시작 가이드</li>
          <li>• AI 블로그 작성 튜토리얼</li>
          <li>• 페르소나 설정 가이드</li>
          <li>• 키워드 추적 활용법</li>
          <li>• 효과적인 블로그 최적화 팁</li>
        </ul>
      </div>
    </template>
  </ComingSoon>
</template>
