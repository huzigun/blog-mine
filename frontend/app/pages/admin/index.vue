<script setup lang="ts">
import { useAdminApiFetch } from '~/composables/useAdminApi';

definePageMeta({
  layout: 'admin',
  middleware: ['admin'],
})

const { adminUser } = useAdminAuth()

type ChangeType = 'positive' | 'negative' | 'neutral'

interface StatItem {
  label: string
  value: string
  icon: string
  change: string
  changeType: ChangeType
}

interface DashboardStatsResponse {
  stats: StatItem[]
}

interface ActivityItem {
  id: number
  action: string
  description: string
  adminName: string
  createdAt: string
}

// 대시보드 통계 데이터
const { data: statsData, status: statsStatus } = await useAdminApiFetch<DashboardStatsResponse>('/admin/dashboard/stats');

// 최근 활동 로그
const { data: activitiesData, status: activitiesStatus } = await useAdminApiFetch<ActivityItem[]>('/admin/dashboard/activities?limit=10');

// 기본 통계 데이터 (API 로딩 전)
const defaultStats: StatItem[] = [
  {
    label: '전체 사용자',
    value: '-',
    icon: 'i-heroicons-users',
    change: '',
    changeType: 'neutral',
  },
  {
    label: '활성 구독',
    value: '-',
    icon: 'i-heroicons-credit-card',
    change: '',
    changeType: 'neutral',
  },
  {
    label: '이번 달 매출',
    value: '-',
    icon: 'i-heroicons-banknotes',
    change: '',
    changeType: 'neutral',
  },
  {
    label: '생성된 포스트',
    value: '-',
    icon: 'i-heroicons-document-text',
    change: '',
    changeType: 'neutral',
  },
];

const stats = computed(() => statsData.value?.stats || defaultStats);
const recentActivities = computed(() => activitiesData.value || []);
const isLoading = computed(() => statsStatus.value === 'pending' || activitiesStatus.value === 'pending');
</script>

<template>
  <div class="space-y-6">
    <!-- 페이지 헤더 -->
    <div>
      <h1 class="text-2xl font-bold text-neutral-900 dark:text-white">대시보드</h1>
      <p class="mt-1 text-sm text-neutral-500">
        안녕하세요, {{ adminUser?.name }}님. BloC 관리자 페이지에 오신 것을 환영합니다.
      </p>
    </div>

    <!-- 통계 카드 -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <UCard v-for="stat in stats" :key="stat.label">
        <div class="flex items-center gap-4">
          <div
            class="w-12 h-12 rounded-lg bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center"
          >
            <UIcon :name="stat.icon" class="w-6 h-6 text-primary-600" />
          </div>
          <div>
            <p class="text-sm text-neutral-500">{{ stat.label }}</p>
            <p class="text-2xl font-bold text-neutral-900 dark:text-white">
              {{ stat.value }}
            </p>
            <p
              v-if="stat.change"
              :class="[
                'text-xs',
                stat.changeType === 'positive' && 'text-success-600',
                stat.changeType === 'negative' && 'text-error-600',
                stat.changeType === 'neutral' && 'text-neutral-500',
              ]"
            >
              {{ stat.change }}
            </p>
          </div>
        </div>
      </UCard>
    </div>

    <!-- 빠른 링크 -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold text-neutral-900 dark:text-white">빠른 링크</h3>
        </template>

        <div class="grid grid-cols-2 gap-3">
          <NuxtLink
            to="/admin/users"
            class="flex items-center gap-2 p-3 rounded-lg bg-neutral-50 dark:bg-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-600 transition-colors"
          >
            <UIcon name="i-heroicons-users" class="w-5 h-5 text-primary-600" />
            <span class="text-sm font-medium">사용자 관리</span>
          </NuxtLink>
          <NuxtLink
            to="/admin/subscriptions"
            class="flex items-center gap-2 p-3 rounded-lg bg-neutral-50 dark:bg-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-600 transition-colors"
          >
            <UIcon name="i-heroicons-credit-card" class="w-5 h-5 text-primary-600" />
            <span class="text-sm font-medium">구독 관리</span>
          </NuxtLink>
          <NuxtLink
            to="/admin/payments"
            class="flex items-center gap-2 p-3 rounded-lg bg-neutral-50 dark:bg-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-600 transition-colors"
          >
            <UIcon name="i-heroicons-banknotes" class="w-5 h-5 text-primary-600" />
            <span class="text-sm font-medium">결제 내역</span>
          </NuxtLink>
          <NuxtLink
            to="/admin/contacts"
            class="flex items-center gap-2 p-3 rounded-lg bg-neutral-50 dark:bg-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-600 transition-colors"
          >
            <UIcon name="i-heroicons-chat-bubble-left-right" class="w-5 h-5 text-primary-600" />
            <span class="text-sm font-medium">문의 관리</span>
          </NuxtLink>
        </div>
      </UCard>

      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold text-neutral-900 dark:text-white">최근 활동</h3>
        </template>

        <div v-if="recentActivities.length === 0" class="text-center py-8 text-neutral-500">
          <UIcon name="i-heroicons-clock" class="w-8 h-8 mx-auto mb-2" />
          <p>최근 활동이 없습니다.</p>
        </div>

        <div v-else class="space-y-3">
          <div
            v-for="activity in recentActivities"
            :key="activity.id"
            class="flex items-start gap-3 p-2 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700"
          >
            <div class="w-2 h-2 mt-2 rounded-full bg-primary-500" />
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-neutral-900 dark:text-white">
                {{ activity.action }}
              </p>
              <p class="text-xs text-neutral-500 truncate">
                {{ activity.adminName }} - {{ activity.description }}
              </p>
            </div>
            <span class="text-xs text-neutral-400 whitespace-nowrap">
              {{ activity.createdAt }}
            </span>
          </div>
        </div>
      </UCard>
    </div>

    <!-- 시스템 정보 -->
    <UCard>
      <template #header>
        <h3 class="text-lg font-semibold text-neutral-900 dark:text-white">시스템 정보</h3>
      </template>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <div>
          <span class="text-neutral-500">관리자 역할:</span>
          <span class="ml-2 font-medium">{{ adminUser?.role }}</span>
        </div>
        <div>
          <span class="text-neutral-500">마지막 로그인:</span>
          <span class="ml-2 font-medium">{{ adminUser?.lastLoginAt || '-' }}</span>
        </div>
        <div>
          <span class="text-neutral-500">시스템 버전:</span>
          <span class="ml-2 font-medium">v1.0.0</span>
        </div>
      </div>
    </UCard>
  </div>
</template>
