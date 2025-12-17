<script setup lang="ts">
import { useAdminApiFetch } from '~/composables/useAdminApi';
import { AdminPaymentRefundModal } from '#components';

// 결제 목록 API 타입
interface PaymentListItem {
  id: number;
  amount: number;
  currency: string;
  status: string;
  paymentMethod: string | null;
  transactionId: string | null;
  receiptUrl: string | null;
  refundedAt: string | null;
  refundAmount: number | null;
  refundReason: string | null;
  metadata: Record<string, any> | null;
  createdAt: string;
  user: {
    id: number;
    email: string;
    name: string | null;
  };
}

interface PaymentsResponse {
  data: PaymentListItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// 통계 API
interface PaymentStats {
  totalPayments: number;
  completedPayments: number;
  pendingPayments: number;
  failedPayments: number;
  refundedPayments: number;
  todayPayments: number;
  monthlyPayments: number;
  totalRevenue: number;
  monthlyRevenue: number;
  totalRefunded: number;
}

definePageMeta({
  layout: 'admin',
  middleware: ['admin'],
});

const { hasMinRole } = useAdminAuth();
const route = useRoute();
const overlay = useOverlay();

// 권한 체크
if (!hasMinRole('SUPPORT')) {
  throw createError({
    statusCode: 403,
    statusMessage: '접근 권한이 없습니다.',
  });
}

// Overlay 모달 인스턴스
const refundModal = overlay.create(AdminPaymentRefundModal);

// 필터 상태 (URL 쿼리에서 초기화)
const searchInput = ref(route.query.search?.toString() || '');
const currentPage = ref(Number(route.query.page?.toString() || '1'));
const limit = ref(20);
const statusFilter = ref(route.query.status?.toString() || 'all');

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
  sortBy: route.query.sortBy || undefined,
  sortOrder: route.query.sortOrder || undefined,
}));

const [
  { data: paymentsData, status, refresh: refreshPayments },
  { data: statsData },
] = await Promise.all([
  useAdminApiFetch<PaymentsResponse>('/admin/payments', {
    query: queryParams,
    watch: [queryParams],
  }),
  useAdminApiFetch<PaymentStats>('/admin/payments/stats', {
    key: 'admin-payments-stats',
  }),
]);

const payments = computed(() => paymentsData.value?.data ?? []);
const meta = computed(
  () =>
    paymentsData.value?.meta ?? {
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 1,
    },
);
const isLoading = computed(() => status.value === 'pending');

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
    hour: '2-digit',
    minute: '2-digit',
  });
};

// 금액 포맷
const formatPrice = (price: number) => {
  return new Intl.NumberFormat('ko-KR').format(price) + '원';
};

// 결제 상태 뱃지 색상
const getStatusColor = (status: string) => {
  switch (status) {
    case 'COMPLETED':
      return 'success';
    case 'PENDING':
      return 'warning';
    case 'FAILED':
      return 'error';
    case 'REFUNDED':
      return 'info';
    default:
      return 'neutral';
  }
};

// 결제 상태 라벨
const getStatusLabel = (status: string) => {
  switch (status) {
    case 'COMPLETED':
      return '완료';
    case 'PENDING':
      return '대기중';
    case 'FAILED':
      return '실패';
    case 'REFUNDED':
      return '환불됨';
    default:
      return status;
  }
};

// 테이블 컬럼
const columns = [
  { accessorKey: 'id', header: 'ID' },
  { accessorKey: 'user', header: '사용자' },
  { accessorKey: 'amount', header: '결제금액' },
  { accessorKey: 'status', header: '상태' },
  { accessorKey: 'paymentMethod', header: '결제수단' },
  { accessorKey: 'transactionId', header: '거래ID' },
  { accessorKey: 'createdAt', header: '결제일시' },
  { accessorKey: 'actions', header: '' },
];

// 상태 필터 옵션
const statusOptions = [
  { label: '전체', value: 'all' },
  { label: '완료', value: 'COMPLETED' },
  { label: '대기중', value: 'PENDING' },
  { label: '실패', value: 'FAILED' },
  { label: '환불됨', value: 'REFUNDED' },
];

// 환불 모달 열기
const openRefundModal = async (payment: PaymentListItem) => {
  const instance = refundModal.open({
    payment,
  });

  const result = (await instance.result) as boolean;

  if (result) {
    await refreshPayments();
  }
};

// 환불 가능 여부
const canRefund = (payment: PaymentListItem) => {
  return payment.status === 'COMPLETED' && hasMinRole('ADMIN');
};
</script>

<template>
  <div class="space-y-6">
    <!-- 페이지 헤더 -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-neutral-900 dark:text-white">
          결제 관리
        </h1>
        <p class="mt-1 text-sm text-neutral-500">
          결제 내역을 조회하고 환불을 처리합니다.
        </p>
      </div>
    </div>

    <!-- 통계 카드 -->
    <div v-if="statsData" class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <UCard>
        <div class="text-center">
          <p class="text-2xl font-bold text-neutral-900 dark:text-white">
            {{ formatPrice(statsData.totalRevenue) }}
          </p>
          <p class="text-sm text-neutral-500">총 매출</p>
        </div>
      </UCard>
      <UCard>
        <div class="text-center">
          <p class="text-2xl font-bold text-primary-600">
            {{ formatPrice(statsData.monthlyRevenue) }}
          </p>
          <p class="text-sm text-neutral-500">이번달 매출</p>
        </div>
      </UCard>
      <UCard>
        <div class="text-center">
          <p class="text-2xl font-bold text-success-600">
            {{ statsData.completedPayments.toLocaleString() }}
          </p>
          <p class="text-sm text-neutral-500">완료된 결제</p>
        </div>
      </UCard>
      <UCard>
        <div class="text-center">
          <p class="text-2xl font-bold text-error-600">
            {{ formatPrice(statsData.totalRefunded) }}
          </p>
          <p class="text-sm text-neutral-500">총 환불액</p>
        </div>
      </UCard>
    </div>

    <!-- 추가 통계 -->
    <div v-if="statsData" class="grid grid-cols-2 md:grid-cols-5 gap-4">
      <UCard>
        <div class="text-center">
          <p class="text-xl font-bold text-neutral-900 dark:text-white">
            {{ statsData.totalPayments.toLocaleString() }}
          </p>
          <p class="text-xs text-neutral-500">전체 결제</p>
        </div>
      </UCard>
      <UCard>
        <div class="text-center">
          <p class="text-xl font-bold text-info-600">
            {{ statsData.todayPayments.toLocaleString() }}
          </p>
          <p class="text-xs text-neutral-500">오늘 결제</p>
        </div>
      </UCard>
      <UCard>
        <div class="text-center">
          <p class="text-xl font-bold text-warning-600">
            {{ statsData.pendingPayments.toLocaleString() }}
          </p>
          <p class="text-xs text-neutral-500">대기중</p>
        </div>
      </UCard>
      <UCard>
        <div class="text-center">
          <p class="text-xl font-bold text-error-600">
            {{ statsData.failedPayments.toLocaleString() }}
          </p>
          <p class="text-xs text-neutral-500">실패</p>
        </div>
      </UCard>
      <UCard>
        <div class="text-center">
          <p class="text-xl font-bold text-neutral-600">
            {{ statsData.refundedPayments.toLocaleString() }}
          </p>
          <p class="text-xs text-neutral-500">환불</p>
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
        <UInput
          v-model="searchInput"
          placeholder="이메일, 이름 또는 거래ID로 검색..."
          icon="i-heroicons-magnifying-glass"
          class="w-96"
          @keyup.enter="handleSearch"
        />
        <UButton color="primary" @click="handleSearch">검색</UButton>
      </div>
    </UCard>

    <!-- 결제 테이블 -->
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <span class="text-sm text-neutral-500">
            총 {{ meta.total.toLocaleString() }}건의 결제
          </span>
        </div>
      </template>

      <UTable :columns="columns" :data="payments" :loading="isLoading">
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

        <template #amount-cell="{ row }">
          <div class="flex flex-col">
            <span class="font-medium">
              {{ formatPrice(row.original.amount) }}
            </span>
            <span
              v-if="row.original.refundAmount"
              class="text-sm text-error-500"
            >
              환불: {{ formatPrice(row.original.refundAmount) }}
            </span>
          </div>
        </template>

        <template #status-cell="{ row }">
          <UBadge :color="getStatusColor(row.original.status)">
            {{ getStatusLabel(row.original.status) }}
          </UBadge>
        </template>

        <template #paymentMethod-cell="{ row }">
          {{ row.original.paymentMethod || '-' }}
        </template>

        <template #transactionId-cell="{ row }">
          <span class="text-xs font-mono">
            {{ row.original.transactionId || '-' }}
          </span>
        </template>

        <template #createdAt-cell="{ row }">
          <span class="text-sm">
            {{ formatDate(row.original.createdAt) }}
          </span>
        </template>

        <template #actions-cell="{ row }">
          <div class="flex items-center gap-2">
            <UButton
              v-if="row.original.receiptUrl"
              color="neutral"
              variant="ghost"
              size="sm"
              icon="i-heroicons-document-text"
              title="영수증"
              :to="row.original.receiptUrl"
              target="_blank"
            />
            <UButton
              v-if="canRefund(row.original)"
              color="error"
              variant="ghost"
              size="sm"
              icon="i-heroicons-arrow-uturn-left"
              title="환불"
              @click="openRefundModal(row.original)"
            />
          </div>
        </template>

        <template #empty>
          <div class="flex flex-col items-center justify-center py-12">
            <UIcon
              name="i-heroicons-banknotes"
              class="w-12 h-12 text-neutral-400 mb-4"
            />
            <p class="text-neutral-500">결제 내역이 없습니다.</p>
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
