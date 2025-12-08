<script setup lang="ts">
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

const searchParams = reactive<CreditTransactionSearchParams>({
  page: 1,
  limit: 10,
  type: undefined,
  startDate: lastWeek.startDate,
  endDate: lastWeek.endDate,
});

// 거래 타입 옵션
const transactionTypes = [
  { label: '전체', value: undefined },
  { label: '충전 (구독)', value: 'SUBSCRIPTION_GRANT' },
  { label: '충전 (구매)', value: 'PURCHASE' },
  { label: '보너스', value: 'BONUS' },
  { label: '프로모션', value: 'PROMO' },
  { label: '사용', value: 'USAGE' },
  { label: '환불', value: 'REFUND' },
  { label: '만료', value: 'EXPIRE' },
  { label: '관리자 조정', value: 'ADMIN_ADJUSTMENT' },
];

// 쿼리 파라미터 정리 (빈 문자열 제거)
const queryParams = computed(() => {
  const params: Record<string, any> = {
    page: searchParams.page,
    limit: searchParams.limit,
  };

  if (searchParams.type) {
    params.type = searchParams.type;
  }

  if (searchParams.startDate) {
    params.startDate = searchParams.startDate;
  }

  if (searchParams.endDate) {
    params.endDate = searchParams.endDate;
  }

  return params;
});

// 거래 내역 조회
const {
  data: transactionData,
  pending,
  refresh,
} = await useApiFetch<{
  data: CreditTransaction[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}>('/credits/transactions', {
  query: queryParams,
  immediate: true, // 초기 로드
});

// 검색 실행
const handleSearch = () => {
  searchParams.page = 1;
  refresh();
};

// 검색 초기화
const resetSearch = () => {
  const defaultDates = getLastWeekDates();
  searchParams.type = undefined;
  searchParams.startDate = defaultDates.startDate;
  searchParams.endDate = defaultDates.endDate;
  searchParams.page = 1;
  refresh();
};

// 페이지 변경
const handlePageChange = (page: number) => {
  searchParams.page = page;
};

// 거래 타입별 라벨 및 스타일
const getTransactionTypeInfo = (type: CreditTransactionType) => {
  const typeInfo: Record<
    CreditTransactionType,
    { label: string; color: string; icon: string }
  > = {
    SUBSCRIPTION_GRANT: {
      label: '구독 충전',
      color: 'text-info',
      icon: 'i-heroicons-calendar',
    },
    PURCHASE: {
      label: '크레딧 구매',
      color: 'text-success',
      icon: 'i-heroicons-shopping-cart',
    },
    BONUS: { label: '보너스', color: 'text-success', icon: 'i-heroicons-gift' },
    PROMO: {
      label: '프로모션',
      color: 'text-success',
      icon: 'i-heroicons-sparkles',
    },
    USAGE: {
      label: '사용',
      color: 'text-error',
      icon: 'i-heroicons-arrow-up-circle',
    },
    REFUND: {
      label: '환불',
      color: 'text-warning',
      icon: 'i-heroicons-arrow-uturn-left',
    },
    EXPIRE: {
      label: '만료',
      color: 'text-neutral-500',
      icon: 'i-heroicons-clock',
    },
    ADMIN_ADJUSTMENT: {
      label: '관리자 조정',
      color: 'text-neutral-600',
      icon: 'i-heroicons-wrench-screwdriver',
    },
  };

  return (
    typeInfo[type] || {
      label: type,
      color: 'text-neutral-600',
      icon: 'i-heroicons-question-mark-circle',
    }
  );
};

// 참조 타입별 라벨
const getReferenceLabel = (transaction: CreditTransaction) => {
  if (!transaction.referenceType) return '-';

  const typeLabels: Record<string, string> = {
    blog_post: '블로그 포스트 생성',
    keyword_tracking: '키워드 트래킹',
    persona: '페르소나 생성',
    api_call: 'API 호출',
    subscription: '구독',
    payment: '결제',
  };

  return typeLabels[transaction.referenceType] || transaction.referenceType;
};

// 날짜 포맷팅
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// 숫자 포맷팅
const formatNumber = (num: number) => {
  return new Intl.NumberFormat('ko-KR').format(Math.abs(num));
};

// 금액 표시 (+ 또는 -)
const formatAmount = (amount: number) => {
  const sign = amount >= 0 ? '+' : '-';
  return `${sign}${formatNumber(amount)}`;
};
</script>

<template>
  <div class="space-y-6">
    <!-- 검색 및 필터 -->
    <div class="flex gap-x-2 items-center">
      <USelect
        v-model="searchParams.type"
        :items="transactionTypes"
        value-key="value"
        placeholder="전체"
        class="w-24"
      />

      <!-- 기간 선택 (DatePicker) -->
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
      <UButton
        color="primary"
        @click="handleSearch"
        :disabled="pending"
        icon="i-heroicons-magnifying-glass"
      >
        검색
      </UButton>
      <UButton
        color="neutral"
        variant="outline"
        @click="resetSearch"
        :disabled="pending"
        icon="i-heroicons-arrow-path"
      >
        초기화
      </UButton>
    </div>

    <!-- 거래 내역 테이블 -->
    <div class="flex items-center justify-between">
      <h2 class="text-xl font-semibold">BloC 거래 내역</h2>
      <span
        v-if="transactionData?.meta"
        class="text-sm text-neutral-600 dark:text-neutral-400"
      >
        전체 {{ transactionData.meta.total }}건
      </span>
    </div>
    <!-- 로딩 상태 -->
    <div v-if="pending" class="space-y-3">
      <div
        v-for="i in 5"
        :key="i"
        class="grid grid-cols-6 gap-4 py-3 border-b border-neutral-100 dark:border-neutral-900"
      >
        <USkeleton class="h-4 w-32" />
        <USkeleton class="h-4 w-24" />
        <USkeleton class="h-4 w-20" />
        <USkeleton class="h-4 w-24" />
        <USkeleton class="h-4 w-20" />
        <USkeleton class="h-4 w-20" />
      </div>
    </div>

    <!-- 데이터 -->
    <div v-else-if="transactionData?.data && transactionData.data.length > 0">
      <!-- 테이블 헤더 -->
      <div
        class="grid grid-cols-6 gap-4 pb-3 mb-3 border-b border-neutral-200 dark:border-neutral-800 text-sm font-medium text-neutral-600 dark:text-neutral-400"
      >
        <div>거래 일시</div>
        <div>거래 타입</div>
        <div>상세 정보</div>
        <div class="text-right">금액</div>
        <div class="text-right">잔액 변화</div>
        <div class="text-right">거래 후 잔액</div>
      </div>

      <!-- 테이블 본문 -->
      <div class="space-y-0">
        <div
          v-for="transaction in transactionData.data"
          :key="transaction.id"
          class="grid grid-cols-6 gap-4 py-3 border-b border-neutral-100 dark:border-neutral-900 last:border-0 hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition-colors"
        >
          <!-- 거래 일시 -->
          <div class="text-sm text-neutral-900 dark:text-white">
            {{ formatDate(transaction.createdAt) }}
          </div>

          <!-- 거래 타입 -->
          <div class="flex items-center gap-2">
            <UIcon
              :name="getTransactionTypeInfo(transaction.type).icon"
              :class="getTransactionTypeInfo(transaction.type).color"
              :size="18"
            />
            <span
              class="text-sm font-medium"
              :class="getTransactionTypeInfo(transaction.type).color"
            >
              {{ getTransactionTypeInfo(transaction.type).label }}
            </span>
          </div>

          <!-- 상세 정보 -->
          <div class="text-sm text-neutral-700 dark:text-neutral-300">
            {{ getReferenceLabel(transaction) }}
            <span
              v-if="transaction.referenceId"
              class="text-xs text-neutral-500 ml-1"
            >
              #{{ transaction.referenceId }}
            </span>
          </div>

          <!-- 금액 -->
          <div
            class="text-sm text-right font-semibold"
            :class="transaction.amount >= 0 ? 'text-success' : 'text-error'"
          >
            {{ formatAmount(transaction.amount) }} BloC
          </div>

          <!-- 잔액 변화 -->
          <div
            class="text-sm text-right text-neutral-600 dark:text-neutral-400"
          >
            {{ formatNumber(transaction.balanceBefore) }} →
            {{ formatNumber(transaction.balanceAfter) }}
          </div>

          <!-- 거래 후 잔액 -->
          <div
            class="text-sm text-right font-medium text-neutral-900 dark:text-white"
          >
            {{ formatNumber(transaction.balanceAfter) }} BloC
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
      <p class="text-lg font-medium mb-1">거래 내역이 없습니다</p>
      <p class="text-sm">BloC 거래가 발생하면 여기에 내역이 표시됩니다.</p>
    </div>
    <div
      class="flex items-center justify-between"
      v-if="transactionData?.meta && transactionData.meta.totalPages > 1"
    >
      <div class="text-sm text-neutral-600 dark:text-neutral-400">
        {{
          (transactionData.meta.page - 1) * transactionData.meta.limit + 1
        }}-{{
          Math.min(
            transactionData.meta.page * transactionData.meta.limit,
            transactionData.meta.total,
          )
        }}
        /
        {{ transactionData.meta.total }}
      </div>

      <div class="flex gap-2">
        <UButton
          color="neutral"
          variant="outline"
          size="sm"
          :disabled="!transactionData.meta.hasPreviousPage || pending"
          @click="handlePageChange(transactionData.meta.page - 1)"
          icon="i-heroicons-chevron-left"
        >
          이전
        </UButton>

        <div class="flex items-center gap-1">
          <UButton
            v-for="page in Math.min(transactionData.meta.totalPages, 5)"
            :key="page"
            :color="page === transactionData.meta.page ? 'primary' : 'neutral'"
            :variant="page === transactionData.meta.page ? 'solid' : 'outline'"
            size="sm"
            @click="handlePageChange(page)"
            :disabled="pending"
          >
            {{ page }}
          </UButton>
        </div>

        <UButton
          color="neutral"
          variant="outline"
          size="sm"
          :disabled="!transactionData.meta.hasNextPage || pending"
          @click="handlePageChange(transactionData.meta.page + 1)"
          icon="i-heroicons-chevron-right"
          trailing
        >
          다음
        </UButton>
      </div>
    </div>
  </div>
</template>
