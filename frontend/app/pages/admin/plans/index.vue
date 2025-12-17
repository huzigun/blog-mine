<script setup lang="ts">
import { useAdminApiFetch } from '~/composables/useAdminApi';

interface Plan {
  id: number;
  name: string;
  displayName: string;
  description: string | null;
  price: number;
  yearlyPrice: number | null;
  monthlyCredits: number;
  maxKeywordTrackings: number | null;
  isActive: boolean;
  sortOrder: number;
  subscribersCount: number;
  createdAt: string;
  updatedAt: string;
}

interface PlanStats {
  totalPlans: number;
  activePlans: number;
  inactivePlans: number;
  totalSubscribers: number;
}

definePageMeta({
  layout: 'admin',
  middleware: ['admin'],
});

const { hasMinRole } = useAdminAuth();

// SUPER_ADMIN 권한 체크
if (!hasMinRole('SUPER_ADMIN')) {
  throw createError({
    statusCode: 403,
    statusMessage: '최고 관리자만 접근할 수 있습니다.',
  });
}

// 플랜 목록 데이터
const { data: plans, status } = await useAdminApiFetch<Plan[]>('/admin/plans');

// 통계 데이터
const { data: stats } = await useAdminApiFetch<PlanStats>('/admin/plans/stats');

const isLoading = computed(() => status.value === 'pending');

// 테이블 컬럼
const columns = [
  { accessorKey: 'sortOrder', header: '순서' },
  { accessorKey: 'displayName', header: '플랜명' },
  { accessorKey: 'price', header: '월 가격' },
  { accessorKey: 'yearlyPrice', header: '연 가격' },
  { accessorKey: 'monthlyCredits', header: '월 크레딧' },
  { accessorKey: 'subscribersCount', header: '구독자' },
  { accessorKey: 'isActive', header: '상태' },
  { accessorKey: 'actions', header: '' },
];

// 금액 포맷
const formatPrice = (price: number | null) => {
  if (price === null || price === 0) return '-';
  return new Intl.NumberFormat('ko-KR').format(price) + '원';
};
</script>

<template>
  <div class="space-y-6">
    <!-- 페이지 헤더 -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-neutral-900 dark:text-white">
          플랜 관리
        </h1>
        <p class="mt-1 text-sm text-neutral-500">
          구독 플랜을 관리합니다. (최고 관리자 전용)
        </p>
      </div>
    </div>

    <!-- 통계 카드 -->
    <div v-if="stats" class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <UCard>
        <div class="text-center">
          <p class="text-2xl font-bold text-neutral-900 dark:text-white">
            {{ stats.totalPlans }}
          </p>
          <p class="text-sm text-neutral-500">전체 플랜</p>
        </div>
      </UCard>
      <UCard>
        <div class="text-center">
          <p class="text-2xl font-bold text-success-600">
            {{ stats.activePlans }}
          </p>
          <p class="text-sm text-neutral-500">활성 플랜</p>
        </div>
      </UCard>
      <UCard>
        <div class="text-center">
          <p class="text-2xl font-bold text-neutral-600">
            {{ stats.inactivePlans }}
          </p>
          <p class="text-sm text-neutral-500">비활성 플랜</p>
        </div>
      </UCard>
      <UCard>
        <div class="text-center">
          <p class="text-2xl font-bold text-primary-600">
            {{ stats.totalSubscribers.toLocaleString() }}
          </p>
          <p class="text-sm text-neutral-500">총 구독자</p>
        </div>
      </UCard>
    </div>

    <!-- 플랜 목록 -->
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <h3 class="font-semibold">플랜 목록</h3>
          <UBadge color="warning" variant="subtle">
            수정만 가능 (등록/삭제 불가)
          </UBadge>
        </div>
      </template>

      <UTable :columns="columns" :data="plans || []" :loading="isLoading">
        <template #sortOrder-cell="{ row }">
          <span class="text-sm font-mono text-neutral-500">
            {{ (row.original as Plan).sortOrder }}
          </span>
        </template>

        <template #displayName-cell="{ row }">
          <div class="flex flex-col">
            <span class="font-medium">{{ (row.original as Plan).displayName }}</span>
            <span class="text-xs text-neutral-500">{{ (row.original as Plan).name }}</span>
          </div>
        </template>

        <template #price-cell="{ row }">
          <span class="font-medium">
            {{ formatPrice((row.original as Plan).price) }}
          </span>
        </template>

        <template #yearlyPrice-cell="{ row }">
          <span class="text-neutral-600">
            {{ formatPrice((row.original as Plan).yearlyPrice) }}
          </span>
        </template>

        <template #monthlyCredits-cell="{ row }">
          <span class="font-mono">
            {{ (row.original as Plan).monthlyCredits.toLocaleString() }}
          </span>
        </template>

        <template #subscribersCount-cell="{ row }">
          <UBadge color="neutral" variant="subtle">
            {{ (row.original as Plan).subscribersCount.toLocaleString() }}명
          </UBadge>
        </template>

        <template #isActive-cell="{ row }">
          <UBadge :color="(row.original as Plan).isActive ? 'success' : 'neutral'">
            {{ (row.original as Plan).isActive ? '활성' : '비활성' }}
          </UBadge>
        </template>

        <template #actions-cell="{ row }">
          <UButton
            color="neutral"
            variant="ghost"
            size="sm"
            icon="i-heroicons-pencil-square"
            :to="`/admin/plans/${(row.original as Plan).id}`"
          />
        </template>

        <template #empty-state>
          <div class="flex flex-col items-center justify-center py-12">
            <UIcon
              name="i-heroicons-credit-card"
              class="w-12 h-12 text-neutral-400 mb-4"
            />
            <p class="text-neutral-500">플랜이 없습니다.</p>
          </div>
        </template>
      </UTable>
    </UCard>
  </div>
</template>
