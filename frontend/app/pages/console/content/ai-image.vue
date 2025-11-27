<script lang="ts" setup>
definePageMeta({
  layout: 'default',
  middleware: ['auth'],
});
</script>

<template>
  <div>
    <ComingSoon
      title="AI 이미지 생성 서비스 준비중"
      description="고품질 AI 이미지 생성 기능을 준비하고 있습니다. 블로그 포스팅에 완벽한 이미지를 자동으로 생성해드릴 예정입니다."
      icon="i-heroicons-photo"
      :show-contact-button="true"
    >
      <template #features>
        <div class="text-center p-4 bg-neutral-50 dark:bg-neutral-900 rounded-lg">
          <UIcon
            name="i-heroicons-sparkles"
            class="w-8 h-8 text-primary mx-auto mb-2"
          />
          <p class="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            AI 생성
          </p>
          <p class="text-xs text-neutral-500 mt-1">
            프롬프트 기반 이미지
          </p>
        </div>

        <div class="text-center p-4 bg-neutral-50 dark:bg-neutral-900 rounded-lg">
          <UIcon
            name="i-heroicons-adjustments-horizontal"
            class="w-8 h-8 text-primary mx-auto mb-2"
          />
          <p class="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            커스터마이징
          </p>
          <p class="text-xs text-neutral-500 mt-1">
            스타일 및 크기 조절
          </p>
        </div>

        <div class="text-center p-4 bg-neutral-50 dark:bg-neutral-900 rounded-lg">
          <UIcon
            name="i-heroicons-arrow-down-tray"
            class="w-8 h-8 text-primary mx-auto mb-2"
          />
          <p class="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            다운로드
          </p>
          <p class="text-xs text-neutral-500 mt-1">
            고해상도 저장
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
            📢 예정 기능
          </h3>
          <ul class="text-sm text-neutral-600 dark:text-neutral-400 space-y-1">
            <li>• DALL-E 3 기반 고품질 이미지 생성</li>
            <li>• 다양한 스타일 프리셋 제공</li>
            <li>• 블로그 콘텐츠와 자동 연동</li>
            <li>• 무제한 생성 및 다운로드</li>
          </ul>
        </div>
      </template>
    </ComingSoon>
  </div>
</template>
