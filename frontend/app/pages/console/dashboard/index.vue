<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth'],
});

const auth = useAuth();

// 준비중인 기능 목록
const upcomingFeatures = [
  {
    icon: 'i-heroicons-chart-bar',
    title: '통계 대시보드',
    description: '블로그 성과 분석 및 인사이트',
    status: '개발 예정',
    color: 'bg-blue-500/10 text-blue-600',
  },
  {
    icon: 'i-heroicons-bell-alert',
    title: '실시간 알림',
    description: '중요 이벤트 즉시 알림',
    status: '개발 예정',
    color: 'bg-amber-500/10 text-amber-600',
  },
  {
    icon: 'i-heroicons-users',
    title: '팀 협업',
    description: '팀원 초대 및 권한 관리',
    status: '개발 예정',
    color: 'bg-green-500/10 text-green-600',
  },
  {
    icon: 'i-heroicons-calendar',
    title: '콘텐츠 스케줄러',
    description: '예약 발행 및 캘린더 관리',
    status: '개발 예정',
    color: 'bg-purple-500/10 text-purple-600',
  },
];

// 빠른 작업 메뉴
const quickActions = [
  {
    label: 'AI 블로그 작성',
    icon: 'i-heroicons-pencil-square',
    to: '/console/ai-post',
    color: 'primary' as const,
  },
  {
    label: '블로그 관리',
    icon: 'i-heroicons-document-text',
    to: '/console/blogs',
    color: 'neutral' as const,
  },
  {
    label: '페르소나 관리',
    icon: 'i-heroicons-user-group',
    to: '/console/personas/manage',
    color: 'neutral' as const,
  },
];
</script>

<template>
  <div class="space-y-6">
    <!-- Welcome Section -->
    <div>
      <h1
        class="text-2xl font-bold text-neutral-900 dark:text-white sm:text-3xl"
      >
        대시보드
      </h1>
      <p class="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
        환영합니다, {{ auth.user?.name }}님! 블로그 관리 시스템입니다.
      </p>
    </div>

    <!-- Quick Actions -->
    <UCard>
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-heroicons-bolt" class="w-5 h-5 text-primary" />
          <h2 class="text-lg font-semibold">빠른 작업</h2>
        </div>
      </template>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <UButton
          v-for="action in quickActions"
          :key="action.to"
          :to="action.to"
          :color="action.color"
          variant="outline"
          size="lg"
          block
        >
          <template #leading>
            <UIcon :name="action.icon" class="w-5 h-5" />
          </template>
          {{ action.label }}
        </UButton>
      </div>
    </UCard>

    <!-- Coming Soon Features -->
    <UCard>
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon
            name="i-heroicons-wrench-screwdriver"
            class="w-5 h-5 text-primary"
          />
          <h2 class="text-lg font-semibold">준비중인 기능</h2>
        </div>
        <p class="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
          곧 만나보실 수 있는 새로운 기능들입니다
        </p>
      </template>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div
          v-for="feature in upcomingFeatures"
          :key="feature.title"
          class="p-4 border border-neutral-200 dark:border-neutral-800 rounded-lg hover:border-primary/50 transition-colors"
        >
          <div class="flex items-start gap-3">
            <div :class="['p-2 rounded-lg', feature.color]">
              <UIcon :name="feature.icon" class="w-6 h-6" />
            </div>
            <div class="flex-1">
              <div class="flex items-center justify-between mb-1">
                <h3
                  class="font-medium text-neutral-900 dark:text-white text-sm"
                >
                  {{ feature.title }}
                </h3>
                <UBadge color="neutral" variant="soft" size="xs">
                  {{ feature.status }}
                </UBadge>
              </div>
              <p class="text-xs text-neutral-600 dark:text-neutral-400">
                {{ feature.description }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="flex items-center justify-between">
          <p class="text-sm text-neutral-600 dark:text-neutral-400">
            더 많은 기능이 추가될 예정입니다
          </p>
          <UButton
            color="primary"
            variant="ghost"
            size="sm"
            to="/support"
            trailing-icon="i-heroicons-arrow-right"
          >
            기능 제안하기
          </UButton>
        </div>
      </template>
    </UCard>
  </div>
</template>
