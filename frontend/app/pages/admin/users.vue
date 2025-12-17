<script setup lang="ts">
import { useAdminApiFetch } from '~/composables/useAdminApi';

definePageMeta({
  layout: 'admin',
  middleware: ['admin'],
});

const { hasMinRole } = useAdminAuth();
const route = useRoute();
const router = useRouter();

// 권한 체크
if (!hasMinRole('SUPPORT')) {
  throw createError({
    statusCode: 403,
    statusMessage: '접근 권한이 없습니다.',
  });
}

// URL 쿼리에서 초기값 읽기
const getInitialValue = <T,>(
  key: string,
  defaultValue: T,
  validator?: (v: string) => boolean,
): T => {
  const value = route.query[key];
  if (typeof value === 'string') {
    if (validator && !validator(value)) return defaultValue;
    return value as unknown as T;
  }
  return defaultValue;
};

// 필터 상태 (URL 쿼리에서 초기화)
const searchInput = ref(getInitialValue('search', ''));
const appliedSearch = ref(getInitialValue('search', ''));
const currentPage = ref(Number(getInitialValue('page', '1')) || 1);
const limit = ref(20);
const statusFilter = ref<'all' | 'active' | 'inactive'>(
  getInitialValue('status', 'all', (v) =>
    ['all', 'active', 'inactive'].includes(v),
  ),
);
const subscriptionFilter = ref<
  'all' | 'TRIAL' | 'ACTIVE' | 'EXPIRED' | 'CANCELED' | 'NONE'
>(
  getInitialValue('subscription', 'all', (v) =>
    ['all', 'TRIAL', 'ACTIVE', 'EXPIRED', 'CANCELED', 'NONE'].includes(v),
  ),
);
const sortBy = ref<'createdAt' | 'email' | 'name'>(
  getInitialValue('sortBy', 'createdAt', (v) =>
    ['createdAt', 'email', 'name'].includes(v),
  ),
);
const sortOrder = ref<'asc' | 'desc'>(
  getInitialValue('sortOrder', 'desc', (v) => ['asc', 'desc'].includes(v)),
);

// URL 쿼리 업데이트
const updateUrlQuery = () => {
  const query: Record<string, string> = {};

  if (appliedSearch.value) query.search = appliedSearch.value;
  if (currentPage.value > 1) query.page = String(currentPage.value);
  if (statusFilter.value !== 'all') query.status = statusFilter.value;
  if (subscriptionFilter.value !== 'all')
    query.subscription = subscriptionFilter.value;
  if (sortBy.value !== 'createdAt') query.sortBy = sortBy.value;
  if (sortOrder.value !== 'desc') query.sortOrder = sortOrder.value;

  router.replace({ query });
};

// 필터 변경 시 URL 업데이트 & 페이지 리셋
watch([statusFilter, subscriptionFilter, sortBy, sortOrder], () => {
  currentPage.value = 1;
  updateUrlQuery();
});

// 페이지 변경 시 URL 업데이트
watch(currentPage, () => {
  updateUrlQuery();
});

// API 쿼리 파라미터
const queryParams = computed(() => ({
  page: currentPage.value,
  limit: limit.value,
  search: appliedSearch.value || undefined,
  status: statusFilter.value,
  subscription: subscriptionFilter.value,
  sortBy: sortBy.value,
  sortOrder: sortOrder.value,
}));

// 사용자 목록 API
interface UserListItem {
  id: number;
  email: string;
  name: string | null;
  createdAt: string;
  deletedAt: string | null;
  isActive: boolean;
  subscription: {
    id: number;
    status: string;
    planName: string;
    startedAt: string;
    expiresAt: string;
    canceledAt: string | null;
  } | null;
  credits: number;
  stats: {
    blogPosts: number;
    personas: number;
  };
}

interface UsersResponse {
  data: UserListItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

const { data: usersData, status } = useAdminApiFetch<UsersResponse>(
  () =>
    `/admin/users?${new URLSearchParams(
      Object.entries(queryParams.value)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)]),
    ).toString()}`,
  {
    watch: [queryParams],
  },
);

const users = computed(() => usersData.value?.data ?? []);
const meta = computed(
  () =>
    usersData.value?.meta ?? { total: 0, page: 1, limit: 20, totalPages: 1 },
);
const isLoading = computed(() => status.value === 'pending');

// 통계 API
interface UserStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  todaySignups: number;
  activeSubscriptions: number;
  trialSubscriptions: number;
}

const { data: statsData } = useAdminApiFetch<UserStats>('/admin/users/stats');

// 검색 핸들러 (검색 버튼 클릭 시에만 실행)
const handleSearch = () => {
  appliedSearch.value = searchInput.value;
  currentPage.value = 1;
  updateUrlQuery();
};

// 날짜 포맷
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

// 구독 상태 뱃지 색상
const getSubscriptionColor = (status: string | undefined) => {
  switch (status) {
    case 'ACTIVE':
      return 'success';
    case 'TRIAL':
      return 'info';
    case 'EXPIRED':
      return 'error';
    case 'CANCELED':
      return 'warning';
    default:
      return 'neutral';
  }
};

// 구독 상태 라벨
const getSubscriptionLabel = (subscription: UserListItem['subscription']) => {
  if (!subscription) return '미구독';
  switch (subscription.status) {
    case 'ACTIVE':
      return subscription.planName || '구독중';
    case 'TRIAL':
      return '체험중';
    case 'EXPIRED':
      return '만료됨';
    case 'CANCELED':
      return '취소됨';
    default:
      return subscription.status;
  }
};

// 테이블 컬럼
const columns = [
  { accessorKey: 'id', header: 'ID' },
  { accessorKey: 'email', header: '이메일' },
  { accessorKey: 'name', header: '이름' },
  { accessorKey: 'subscription', header: '구독' },
  { accessorKey: 'credits', header: '크레딧' },
  { accessorKey: 'stats', header: '활동' },
  { accessorKey: 'createdAt', header: '가입일' },
  { accessorKey: 'actions', header: '' },
];

// 상태 필터 옵션
const statusOptions = [
  { label: '전체', value: 'all' },
  { label: '활성', value: 'active' },
  { label: '비활성', value: 'inactive' },
];

// 구독 필터 옵션
const subscriptionOptions = [
  { label: '전체', value: 'all' },
  { label: '구독중', value: 'ACTIVE' },
  { label: '체험중', value: 'TRIAL' },
  { label: '만료됨', value: 'EXPIRED' },
  { label: '취소됨', value: 'CANCELED' },
  { label: '미구독', value: 'NONE' },
];
</script>

<template>
  <div class="space-y-6">
    <!-- 페이지 헤더 -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-neutral-900 dark:text-white">
          사용자 관리
        </h1>
        <p class="mt-1 text-sm text-neutral-500">
          등록된 사용자들을 관리합니다.
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
            {{ statsData.totalUsers.toLocaleString() }}
          </p>
          <p class="text-sm text-neutral-500">전체 사용자</p>
        </div>
      </UCard>
      <UCard>
        <div class="text-center">
          <p class="text-2xl font-bold text-success-600">
            {{ statsData.activeUsers.toLocaleString() }}
          </p>
          <p class="text-sm text-neutral-500">활성 사용자</p>
        </div>
      </UCard>
      <UCard>
        <div class="text-center">
          <p class="text-2xl font-bold text-error-600">
            {{ statsData.inactiveUsers.toLocaleString() }}
          </p>
          <p class="text-sm text-neutral-500">비활성 사용자</p>
        </div>
      </UCard>
      <UCard>
        <div class="text-center">
          <p class="text-2xl font-bold text-info-600">
            {{ statsData.todaySignups.toLocaleString() }}
          </p>
          <p class="text-sm text-neutral-500">오늘 가입</p>
        </div>
      </UCard>
      <UCard>
        <div class="text-center">
          <p class="text-2xl font-bold text-primary-600">
            {{ statsData.activeSubscriptions.toLocaleString() }}
          </p>
          <p class="text-sm text-neutral-500">구독 중</p>
        </div>
      </UCard>
      <UCard>
        <div class="text-center">
          <p class="text-2xl font-bold text-warning-600">
            {{ statsData.trialSubscriptions.toLocaleString() }}
          </p>
          <p class="text-sm text-neutral-500">체험 중</p>
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
        />
        <USelect
          v-model="subscriptionFilter"
          :items="subscriptionOptions"
          value-key="value"
          label-key="label"
          placeholder="구독 상태"
          class="w-32"
        />
        <UInput
          v-model="searchInput"
          placeholder="이메일 또는 이름으로 검색..."
          icon="i-heroicons-magnifying-glass"
          class="w-96"
          @keyup.enter="handleSearch"
        />
        <UButton color="primary" @click="handleSearch">검색</UButton>
      </div>
    </UCard>

    <!-- 사용자 테이블 -->
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <span class="text-sm text-neutral-500">
            총 {{ meta.total.toLocaleString() }}명의 사용자
          </span>
        </div>
      </template>

      <UTable :columns="columns" :data="users" :loading="isLoading">
        <template #email-cell="{ row }">
          <div class="flex items-center gap-2">
            <span>{{ row.original.email }}</span>
            <UBadge v-if="!row.original.isActive" color="error" size="xs">
              비활성
            </UBadge>
          </div>
        </template>

        <template #name-cell="{ row }">
          {{ row.original.name || '-' }}
        </template>

        <template #subscription-cell="{ row }">
          <UBadge
            :color="getSubscriptionColor(row.original.subscription?.status)"
          >
            {{ getSubscriptionLabel(row.original.subscription) }}
          </UBadge>
        </template>

        <template #credits-cell="{ row }">
          <span class="font-medium">
            {{ row.original.credits.toLocaleString() }}
          </span>
        </template>

        <template #stats-cell="{ row }">
          <div class="flex items-center gap-2 text-sm text-neutral-500">
            <span>포스트 {{ row.original.stats.blogPosts }}</span>
            <span>·</span>
            <span>페르소나 {{ row.original.stats.personas }}</span>
          </div>
        </template>

        <template #createdAt-cell="{ row }">
          {{ formatDate(row.original.createdAt) }}
        </template>

        <template #actions-cell="{ row }">
          <UButton
            color="neutral"
            variant="ghost"
            size="sm"
            icon="i-heroicons-eye"
            :to="`/admin/users/${row.original.id}`"
          />
        </template>

        <template #empty>
          <div class="flex flex-col items-center justify-center py-12">
            <UIcon
              name="i-heroicons-users"
              class="w-12 h-12 text-neutral-400 mb-4"
            />
            <p class="text-neutral-500">등록된 사용자가 없습니다.</p>
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
          />
        </div>
      </template>
    </UCard>
  </div>
</template>
