<script lang="ts" setup>
const toast = useToast();

// 최근 일주일 날짜 계산
function getLastWeekDates() {
  const today = new Date();
  const lastWeek = new Date();
  lastWeek.setDate(today.getDate() - 7);

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  return {
    startDate: formatDate(lastWeek),
    endDate: formatDate(today),
  };
}

const lastWeek = getLastWeekDates();

// 검색 및 필터 상태
const searchParams = reactive<PaymentSearchParams>({
  page: 1,
  limit: 10,
  status: undefined,
  startDate: lastWeek.startDate,
  endDate: lastWeek.endDate,
  search: undefined,
});

// 검색어
const searchQuery = ref('');

// 결제 내역 조회
const {
  data: paymentsData,
  refresh: refreshPayments,
  pending: paymentsLoading,
} = await useAsyncData(
  'payment-history',
  () =>
    useApi<PaginatedResponse<Payment>>('/payments', {
      params: {
        ...searchParams,
        search: searchQuery.value || undefined,
      },
    }),
  {
    immediate: true, // 초기 로드
  },
);

// 결제 내역 및 페이지네이션 정보
const payments = computed(() => paymentsData.value?.data || []);
const meta = computed(() => paymentsData.value?.meta);

// 상태 필터 옵션
const statusOptions = [
  { label: '전체', value: undefined },
  { label: '완료', value: 'COMPLETED' },
  { label: '대기중', value: 'PENDING' },
  { label: '실패', value: 'FAILED' },
  { label: '환불', value: 'REFUNDED' },
];

// 검색 실행
const handleSearch = async () => {
  searchParams.page = 1;
  await refreshPayments();
};

// 검색 초기화
const resetFilters = async () => {
  const defaultDates = getLastWeekDates();
  searchQuery.value = '';
  searchParams.status = undefined;
  searchParams.startDate = defaultDates.startDate;
  searchParams.endDate = defaultDates.endDate;
  searchParams.page = 1;
  await refreshPayments();
};

// 페이지 변경
const handlePageChange = async (page: number) => {
  searchParams.page = page;
  await refreshPayments();
};

// 결제 상태 뱃지 색상
const getStatusColor = (status: PaymentStatus) => {
  switch (status) {
    case 'COMPLETED':
      return 'success';
    case 'PENDING':
      return 'warning';
    case 'FAILED':
      return 'error';
    case 'REFUNDED':
      return 'neutral';
    default:
      return 'neutral';
  }
};

// 결제 상태 텍스트
const getStatusText = (status: PaymentStatus) => {
  switch (status) {
    case 'COMPLETED':
      return '완료';
    case 'PENDING':
      return '대기중';
    case 'FAILED':
      return '실패';
    case 'REFUNDED':
      return '환불';
    default:
      return status;
  }
};

// 포맷팅 함수
const formatNumber = (num: number) => {
  return new Intl.NumberFormat('ko-KR').format(num);
};

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// 영수증 보기
const viewReceipt = (receiptUrl: string) => {
  window.open(receiptUrl, '_blank');
};
</script>

<template>
  <div class="space-y-6">
    <!-- 검색 및 필터 -->
    <div class="flex flex-wrap gap-2 items-center">
      <!-- 거래번호 검색 -->
      <UInput
        v-model="searchQuery"
        type="search"
        placeholder="거래번호 검색"
        icon="i-heroicons-magnifying-glass"
        class="w-48"
        @keyup.enter="handleSearch"
      />

      <!-- 상태 필터 -->
      <USelect
        v-model="searchParams.status"
        :items="statusOptions"
        value-key="value"
        placeholder="전체"
        class="w-24"
      />

      <!-- 기간 선택 -->
      <div class="flex gap-2">
        <UInput
          v-model="searchParams.startDate"
          type="date"
          placeholder="시작일"
          class="w-40"
        />
        <UInput
          v-model="searchParams.endDate"
          type="date"
          placeholder="종료일"
          class="w-40"
        />
      </div>

      <!-- 검색 버튼 -->
      <UButton
        color="primary"
        @click="handleSearch"
        :disabled="paymentsLoading"
        icon="i-heroicons-magnifying-glass"
      >
        검색
      </UButton>
      <UButton
        color="neutral"
        variant="outline"
        @click="resetFilters"
        :disabled="paymentsLoading"
        icon="i-heroicons-arrow-path"
      >
        초기화
      </UButton>
    </div>

    <!-- 결제 내역 목록 -->
    <div class="flex items-center justify-between">
      <h2 class="text-xl font-semibold">결제 내역</h2>
      <span
        v-if="meta"
        class="text-sm text-neutral-600 dark:text-neutral-400"
      >
        전체 {{ formatNumber(meta.total) }}건
      </span>
    </div>

    <!-- 로딩 상태 -->
    <div v-if="paymentsLoading" class="space-y-3">
      <div
        v-for="i in 5"
        :key="i"
        class="grid grid-cols-5 gap-4 py-3 border-b border-neutral-100 dark:border-neutral-900"
      >
        <USkeleton class="h-4 w-32" />
        <USkeleton class="h-4 w-24" />
        <USkeleton class="h-4 w-20" />
        <USkeleton class="h-4 w-24" />
        <USkeleton class="h-4 w-20" />
      </div>
    </div>

    <!-- 데이터 -->
    <div v-else-if="payments && payments.length > 0">
      <!-- 테이블 헤더 -->
      <div
        class="grid grid-cols-5 gap-4 pb-3 mb-3 border-b border-neutral-200 dark:border-neutral-800 text-sm font-medium text-neutral-600 dark:text-neutral-400"
      >
        <div>결제일시</div>
        <div>거래번호</div>
        <div>결제수단</div>
        <div class="text-right">금액</div>
        <div class="text-center">상태</div>
      </div>

      <!-- 테이블 본문 -->
      <div class="space-y-0">
        <div
          v-for="payment in payments"
          :key="payment.id"
          class="grid grid-cols-5 gap-4 py-3 border-b border-neutral-100 dark:border-neutral-900 last:border-0 hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition-colors"
        >
          <!-- 결제일시 -->
          <div class="text-sm text-neutral-900 dark:text-white">
            {{ formatDate(payment.createdAt) }}
          </div>

          <!-- 거래번호 -->
          <div class="text-sm text-neutral-700 dark:text-neutral-300">
            {{ payment.transactionId || '-' }}
          </div>

          <!-- 결제수단 -->
          <div class="text-sm text-neutral-700 dark:text-neutral-300">
            {{ payment.paymentMethod || '카드' }}
          </div>

          <!-- 금액 -->
          <div class="text-sm text-right font-semibold text-neutral-900 dark:text-white">
            {{ formatNumber(payment.amount) }}원
          </div>

          <!-- 상태 -->
          <div class="flex items-center justify-center gap-2">
            <UBadge :color="getStatusColor(payment.status)" size="sm">
              {{ getStatusText(payment.status) }}
            </UBadge>
            <UButton
              v-if="payment.receiptUrl"
              color="neutral"
              variant="ghost"
              size="xs"
              icon="i-heroicons-document-text"
              @click="viewReceipt(payment.receiptUrl)"
              square
            />
          </div>
        </div>
      </div>
    </div>

    <!-- 데이터 없음 -->
    <div
      v-else
      class="text-center py-12 text-neutral-500 dark:text-neutral-400"
    >
      <UIcon
        name="i-heroicons-inbox"
        class="mx-auto mb-4 text-neutral-400 dark:text-neutral-600"
        :size="48"
      />
      <p class="text-lg font-medium mb-1">결제 내역이 없습니다</p>
      <p class="text-sm">결제가 발생하면 여기에 내역이 표시됩니다.</p>
    </div>

    <!-- 페이지네이션 -->
    <div
      class="flex items-center justify-between"
      v-if="meta && meta.totalPages > 1"
    >
      <div class="text-sm text-neutral-600 dark:text-neutral-400">
        {{
          (meta.page - 1) * meta.limit + 1
        }}-{{
          Math.min(
            meta.page * meta.limit,
            meta.total,
          )
        }}
        /
        {{ meta.total }}
      </div>

      <div class="flex gap-2">
        <UButton
          color="neutral"
          variant="outline"
          size="sm"
          :disabled="!meta.hasPreviousPage || paymentsLoading"
          @click="handlePageChange(searchParams.page! - 1)"
          icon="i-heroicons-chevron-left"
        >
          이전
        </UButton>

        <div class="flex items-center gap-1">
          <UButton
            v-for="page in Math.min(meta.totalPages, 5)"
            :key="page"
            :color="page === meta.page ? 'primary' : 'neutral'"
            :variant="page === meta.page ? 'solid' : 'outline'"
            size="sm"
            @click="handlePageChange(page)"
            :disabled="paymentsLoading"
          >
            {{ page }}
          </UButton>
        </div>

        <UButton
          color="neutral"
          variant="outline"
          size="sm"
          :disabled="!meta.hasNextPage || paymentsLoading"
          @click="handlePageChange(searchParams.page! + 1)"
          icon="i-heroicons-chevron-right"
          trailing
        >
          다음
        </UButton>
      </div>
    </div>
  </div>
</template>
