<script setup lang="ts">
import { useAdminApiFetch, useAdminApi } from '~/composables/useAdminApi';
import {
  AdminSubscriptionStatusChangeModal,
  AdminSubscriptionExtendModal,
} from '#components';

// 구독 목록 API 타입
interface SubscriptionListItem {
  id: number;
  status: string;
  startedAt: string;
  expiresAt: string;
  canceledAt: string | null;
  autoRenewal: boolean;
  lastPaymentDate: string | null;
  lastPaymentAmount: number | null;
  createdAt: string;
  user: {
    id: number;
    email: string;
    name: string | null;
  };
  plan: {
    id: number;
    name: string;
    displayName: string;
    price: number;
  };
}

interface SubscriptionsResponse {
  data: SubscriptionListItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// 통계 API
interface SubscriptionStats {
  totalSubscriptions: number;
  activeSubscriptions: number;
  trialSubscriptions: number;
  expiredSubscriptions: number;
  canceledSubscriptions: number;
  pastDueSubscriptions: number;
  planStats: Array<{
    planId: number;
    planName: string;
    count: number;
  }>;
}

// 요금제 목록 API
interface Plan {
  id: number;
  name: string;
  displayName: string;
  price: number;
  monthlyCredits: number;
}

definePageMeta({
  layout: 'admin',
  middleware: ['admin'],
});

const { hasMinRole } = useAdminAuth();
const route = useRoute();
const overlay = useOverlay();

// 권한 체크
if (!hasMinRole('ADMIN')) {
  throw createError({
    statusCode: 403,
    statusMessage: '접근 권한이 없습니다.',
  });
}

// Overlay 모달 인스턴스
const statusChangeModal = overlay.create(AdminSubscriptionStatusChangeModal);
const extendModal = overlay.create(AdminSubscriptionExtendModal);

// 필터 상태 (URL 쿼리에서 초기화)
const searchInput = ref(route.query.search?.toString() || '');
const currentPage = ref(Number(route.query.page?.toString() || '1'));
const limit = ref(20);
const statusFilter = ref(route.query.status?.toString() || 'all');
const planFilter = ref(route.query.planId?.toString() || 'all');

// URL 쿼리 업데이트
const updateUrlQuery = (query: Record<string, string | number | undefined>) => {
  return navigateTo({
    path: route.path,
    query: {
      ...route.query,
      ...query,
      page: query.page || 1,
    },
  });
};

// API 쿼리 파라미터
const queryParams = computed(() => ({
  page: route.query.page || 1,
  limit: route.query.limit || 20,
  search: route.query.search || undefined,
  status: route.query.status || undefined,
  planId: route.query.planId || undefined,
  sortBy: route.query.sortBy || undefined,
  sortOrder: route.query.sortOrder || undefined,
}));

const [
  { data: subscriptionsData, status, refresh: refreshSubscriptions },
  { data: statsData },
  { data: plansData },
] = await Promise.all([
  useAdminApiFetch<SubscriptionsResponse>('/admin/subscriptions', {
    query: queryParams,
    watch: [queryParams],
  }),
  useAdminApiFetch<SubscriptionStats>('/admin/subscriptions/stats', {
    key: 'admin-subscriptions-stats',
  }),
  useAdminApiFetch<Plan[]>('/admin/subscriptions/plans', {
    key: 'admin-subscriptions-plans',
  }),
]);

const subscriptions = computed(() => subscriptionsData.value?.data ?? []);
const meta = computed(
  () =>
    subscriptionsData.value?.meta ?? {
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 1,
    },
);
const isLoading = computed(() => status.value === 'pending');

// 요금제 필터 옵션
const planOptions = computed(() => {
  const options = [{ label: '전체', value: 'all' }];
  if (plansData.value) {
    plansData.value.forEach((plan) => {
      options.push({
        label: plan.displayName || plan.name,
        value: String(plan.id),
      });
    });
  }
  return options;
});

// 검색 핸들러
const handleSearch = () => {
  updateUrlQuery({
    search: searchInput.value || undefined,
  });
};

// 날짜 포맷
const formatDate = (dateString: string | null) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

// 금액 포맷
const formatPrice = (price: number) => {
  return new Intl.NumberFormat('ko-KR').format(price) + '원';
};

// 구독 상태 뱃지 색상
const getStatusColor = (status: string) => {
  switch (status) {
    case 'ACTIVE':
      return 'success';
    case 'TRIAL':
      return 'info';
    case 'EXPIRED':
      return 'error';
    case 'CANCELED':
      return 'warning';
    case 'PAST_DUE':
      return 'error';
    default:
      return 'neutral';
  }
};

// 구독 상태 라벨
const getStatusLabel = (status: string) => {
  switch (status) {
    case 'ACTIVE':
      return '구독중';
    case 'TRIAL':
      return '체험중';
    case 'EXPIRED':
      return '만료됨';
    case 'CANCELED':
      return '취소됨';
    case 'PAST_DUE':
      return '결제지연';
    default:
      return status;
  }
};

// 테이블 컬럼
const columns = [
  { accessorKey: 'id', header: 'ID' },
  { accessorKey: 'user', header: '사용자' },
  { accessorKey: 'plan', header: '요금제' },
  { accessorKey: 'status', header: '상태' },
  { accessorKey: 'period', header: '구독 기간' },
  { accessorKey: 'autoRenewal', header: '자동갱신' },
  { accessorKey: 'actions', header: '' },
];

// 상태 필터 옵션
const statusOptions = [
  { label: '전체', value: 'all' },
  { label: '구독중', value: 'ACTIVE' },
  { label: '체험중', value: 'TRIAL' },
  { label: '결제지연', value: 'PAST_DUE' },
  { label: '취소됨', value: 'CANCELED' },
  { label: '만료됨', value: 'EXPIRED' },
];

// 상태 변경 모달 열기
const openStatusModal = async (subscription: SubscriptionListItem) => {
  const instance = statusChangeModal.open({
    subscription,
  });

  const result = (await instance.result) as boolean;

  if (result) {
    await refreshSubscriptions();
  }
};

// 기간 연장 모달 열기
const openExtendModal = async (subscription: SubscriptionListItem) => {
  const instance = extendModal.open({
    subscription,
  });

  const result = (await instance.result) as boolean;

  if (result) {
    await refreshSubscriptions();
  }
};
</script>

<template>
  <div class="space-y-6">
    <!-- 페이지 헤더 -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-neutral-900 dark:text-white">
          구독 관리
        </h1>
        <p class="mt-1 text-sm text-neutral-500">
          사용자 구독을 관리하고 상태를 변경합니다.
        </p>
      </div>
    </div>

    <!-- 통계 카드 -->
    <div
      v-if="statsData"
      class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4"
    >
      <UCard>
        <div class="text-center">
          <p class="text-2xl font-bold text-neutral-900 dark:text-white">
            {{ statsData.totalSubscriptions.toLocaleString() }}
          </p>
          <p class="text-sm text-neutral-500">전체 구독</p>
        </div>
      </UCard>
      <UCard>
        <div class="text-center">
          <p class="text-2xl font-bold text-success-600">
            {{ statsData.activeSubscriptions.toLocaleString() }}
          </p>
          <p class="text-sm text-neutral-500">구독중</p>
        </div>
      </UCard>
      <UCard>
        <div class="text-center">
          <p class="text-2xl font-bold text-info-600">
            {{ statsData.trialSubscriptions.toLocaleString() }}
          </p>
          <p class="text-sm text-neutral-500">체험중</p>
        </div>
      </UCard>
      <UCard>
        <div class="text-center">
          <p class="text-2xl font-bold text-error-600">
            {{ statsData.expiredSubscriptions.toLocaleString() }}
          </p>
          <p class="text-sm text-neutral-500">만료됨</p>
        </div>
      </UCard>
      <UCard>
        <div class="text-center">
          <p class="text-2xl font-bold text-warning-600">
            {{ statsData.canceledSubscriptions.toLocaleString() }}
          </p>
          <p class="text-sm text-neutral-500">취소됨</p>
        </div>
      </UCard>
      <UCard>
        <div class="text-center">
          <p class="text-2xl font-bold text-error-600">
            {{ statsData.pastDueSubscriptions.toLocaleString() }}
          </p>
          <p class="text-sm text-neutral-500">결제지연</p>
        </div>
      </UCard>
    </div>

    <!-- 검색 및 필터 -->
    <UCard>
      <div class="flex flex-col sm:flex-row gap-4">
        <USelect
          v-model="statusFilter"
          :items="statusOptions"
          value-key="value"
          label-key="label"
          placeholder="상태"
          class="w-32"
          @update:model-value="
            (value: string) => {
              updateUrlQuery({
                status: value === 'all' ? undefined : value,
              });
            }
          "
        />
        <USelect
          v-model="planFilter"
          :items="planOptions"
          value-key="value"
          label-key="label"
          placeholder="요금제"
          class="w-40"
          @update:model-value="
            (value: string) => {
              updateUrlQuery({
                planId: value === 'all' ? undefined : value,
              });
            }
          "
        />
        <UInput
          v-model="searchInput"
          placeholder="사용자 이메일 또는 이름으로 검색..."
          icon="i-heroicons-magnifying-glass"
          class="w-96"
          @keyup.enter="handleSearch"
        />
        <UButton color="primary" @click="handleSearch">검색</UButton>
      </div>
    </UCard>

    <!-- 구독 테이블 -->
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <span class="text-sm text-neutral-500">
            총 {{ meta.total.toLocaleString() }}건의 구독
          </span>
        </div>
      </template>

      <UTable :columns="columns" :data="subscriptions" :loading="isLoading">
        <template #user-cell="{ row }">
          <div class="flex flex-col">
            <NuxtLink
              :to="`/admin/users/${row.original.user.id}`"
              class="text-primary-600 hover:underline"
            >
              {{ row.original.user.email }}
            </NuxtLink>
            <span class="text-sm text-neutral-500">
              {{ row.original.user.name || '-' }}
            </span>
          </div>
        </template>

        <template #plan-cell="{ row }">
          <div class="flex flex-col">
            <span class="font-medium">
              {{ row.original.plan.displayName || row.original.plan.name }}
            </span>
            <span class="text-sm text-neutral-500">
              {{ formatPrice(row.original.plan.price) }}/월
            </span>
          </div>
        </template>

        <template #status-cell="{ row }">
          <UBadge :color="getStatusColor(row.original.status)">
            {{ getStatusLabel(row.original.status) }}
          </UBadge>
        </template>

        <template #period-cell="{ row }">
          <div class="flex flex-col text-sm">
            <span>시작: {{ formatDate(row.original.startedAt) }}</span>
            <span>만료: {{ formatDate(row.original.expiresAt) }}</span>
          </div>
        </template>

        <template #autoRenewal-cell="{ row }">
          <UBadge :color="row.original.autoRenewal ? 'success' : 'neutral'">
            {{ row.original.autoRenewal ? 'ON' : 'OFF' }}
          </UBadge>
        </template>

        <template #actions-cell="{ row }">
          <div class="flex items-center gap-2">
            <UButton
              color="neutral"
              variant="ghost"
              size="sm"
              icon="i-heroicons-pencil-square"
              title="상태 변경"
              @click="openStatusModal(row.original)"
            />
            <UButton
              color="neutral"
              variant="ghost"
              size="sm"
              icon="i-heroicons-calendar-days"
              title="기간 연장"
              @click="openExtendModal(row.original)"
            />
          </div>
        </template>

        <template #empty>
          <div class="flex flex-col items-center justify-center py-12">
            <UIcon
              name="i-heroicons-credit-card"
              class="w-12 h-12 text-neutral-400 mb-4"
            />
            <p class="text-neutral-500">등록된 구독이 없습니다.</p>
          </div>
        </template>
      </UTable>

      <!-- 페이지네이션 -->
      <template #footer>
        <div v-if="meta.totalPages > 1" class="flex justify-center">
          <UPagination
            v-model="currentPage"
            :total="meta.total"
            :items-per-page="limit"
            @update:page="
              (page: number) => {
                updateUrlQuery({ page: String(page) });
              }
            "
          />
        </div>
      </template>
    </UCard>
  </div>
</template>
