<script setup lang="ts">
import { useAdminApiFetch, useAdminApi } from '~/composables/useAdminApi';

// 블로그 포스트 목록 API 타입
interface PostListItem {
  id: number;
  displayId: string;
  keyword: string;
  postType: string;
  subKeywords: string[];
  length: number;
  count: number;
  status: string;
  completedCount: number;
  targetCount: number;
  creditCost: number | null;
  lastError: string | null;
  errorAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  user: {
    id: number;
    email: string;
    name: string | null;
  };
  aiPostsCount: number;
}

interface PostsResponse {
  data: PostListItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// 통계 API
interface PostStats {
  totalPosts: number;
  pendingPosts: number;
  inProgressPosts: number;
  completedPosts: number;
  failedPosts: number;
  todayPosts: number;
  monthlyPosts: number;
  totalAIPosts: number;
  monthlyAIPosts: number;
}

definePageMeta({
  layout: 'admin',
  middleware: ['admin'],
});

const { hasMinRole } = useAdminAuth();
const route = useRoute();
const toast = useToast();

// 권한 체크
if (!hasMinRole('VIEWER')) {
  throw createError({
    statusCode: 403,
    statusMessage: '접근 권한이 없습니다.',
  });
}

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
  { data: postsData, status, refresh: refreshPosts },
  { data: statsData, refresh: refreshStats },
] = await Promise.all([
  useAdminApiFetch<PostsResponse>('/admin/posts', {
    query: queryParams,
    watch: [queryParams],
  }),
  useAdminApiFetch<PostStats>('/admin/posts/stats', {
    key: 'admin-posts-stats',
  }),
]);

const posts = computed(() => postsData.value?.data ?? []);
const meta = computed(
  () =>
    postsData.value?.meta ?? {
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

// 포스트 상태 뱃지 색상
const getStatusColor = (status: string) => {
  switch (status) {
    case 'COMPLETED':
      return 'success';
    case 'IN_PROGRESS':
      return 'info';
    case 'PENDING':
      return 'warning';
    case 'FAILED':
      return 'error';
    default:
      return 'neutral';
  }
};

// 포스트 상태 라벨
const getStatusLabel = (status: string) => {
  switch (status) {
    case 'COMPLETED':
      return '완료';
    case 'IN_PROGRESS':
      return '진행중';
    case 'PENDING':
      return '대기중';
    case 'FAILED':
      return '실패';
    default:
      return status;
  }
};

// 테이블 컬럼
const columns = [
  { accessorKey: 'displayId', header: 'ID' },
  { accessorKey: 'user', header: '사용자' },
  { accessorKey: 'keyword', header: '키워드' },
  { accessorKey: 'postType', header: '유형' },
  { accessorKey: 'progress', header: '진행률' },
  { accessorKey: 'status', header: '상태' },
  { accessorKey: 'createdAt', header: '생성일' },
  { accessorKey: 'actions', header: '' },
];

// 상태 필터 옵션
const statusOptions = [
  { label: '전체', value: 'all' },
  { label: '대기중', value: 'PENDING' },
  { label: '진행중', value: 'IN_PROGRESS' },
  { label: '완료', value: 'COMPLETED' },
  { label: '실패', value: 'FAILED' },
];

// 재시도 처리
const retryingId = ref<number | null>(null);
const handleRetry = async (postId: number) => {
  if (!hasMinRole('ADMIN')) {
    toast.add({
      title: '권한 없음',
      description: '재시도 권한이 없습니다.',
      color: 'error',
    });
    return;
  }

  retryingId.value = postId;
  try {
    await useAdminApi(`/admin/posts/${postId}/retry`, {
      method: 'POST',
    });

    toast.add({
      title: '재시도 성공',
      description: '포스트가 대기 상태로 변경되었습니다.',
      color: 'success',
    });

    await Promise.all([refreshPosts(), refreshStats()]);
  } catch (error: any) {
    toast.add({
      title: '재시도 실패',
      description: error.data?.message || '재시도에 실패했습니다.',
      color: 'error',
    });
  } finally {
    retryingId.value = null;
  }
};
</script>

<template>
  <div class="space-y-6">
    <!-- 페이지 헤더 -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-neutral-900 dark:text-white">
          블로그 포스트
        </h1>
        <p class="mt-1 text-sm text-neutral-500">
          생성된 블로그 포스트를 조회하고 관리합니다.
        </p>
      </div>
    </div>

    <!-- 통계 카드 -->
    <div v-if="statsData" class="grid grid-cols-2 md:grid-cols-5 gap-4">
      <UCard>
        <div class="text-center">
          <p class="text-2xl font-bold text-neutral-900 dark:text-white">
            {{ statsData.totalPosts.toLocaleString() }}
          </p>
          <p class="text-sm text-neutral-500">전체 포스트</p>
        </div>
      </UCard>
      <UCard>
        <div class="text-center">
          <p class="text-2xl font-bold text-warning-600">
            {{ statsData.pendingPosts.toLocaleString() }}
          </p>
          <p class="text-sm text-neutral-500">대기중</p>
        </div>
      </UCard>
      <UCard>
        <div class="text-center">
          <p class="text-2xl font-bold text-info-600">
            {{ statsData.inProgressPosts.toLocaleString() }}
          </p>
          <p class="text-sm text-neutral-500">진행중</p>
        </div>
      </UCard>
      <UCard>
        <div class="text-center">
          <p class="text-2xl font-bold text-success-600">
            {{ statsData.completedPosts.toLocaleString() }}
          </p>
          <p class="text-sm text-neutral-500">완료</p>
        </div>
      </UCard>
      <UCard>
        <div class="text-center">
          <p class="text-2xl font-bold text-error-600">
            {{ statsData.failedPosts.toLocaleString() }}
          </p>
          <p class="text-sm text-neutral-500">실패</p>
        </div>
      </UCard>
    </div>

    <!-- 추가 통계 -->
    <div v-if="statsData" class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <UCard>
        <div class="text-center">
          <p class="text-xl font-bold text-primary-600">
            {{ statsData.todayPosts.toLocaleString() }}
          </p>
          <p class="text-xs text-neutral-500">오늘 생성</p>
        </div>
      </UCard>
      <UCard>
        <div class="text-center">
          <p class="text-xl font-bold text-primary-600">
            {{ statsData.monthlyPosts.toLocaleString() }}
          </p>
          <p class="text-xs text-neutral-500">이번달 생성</p>
        </div>
      </UCard>
      <UCard>
        <div class="text-center">
          <p class="text-xl font-bold text-neutral-900 dark:text-white">
            {{ statsData.totalAIPosts.toLocaleString() }}
          </p>
          <p class="text-xs text-neutral-500">총 AI 원고</p>
        </div>
      </UCard>
      <UCard>
        <div class="text-center">
          <p class="text-xl font-bold text-neutral-900 dark:text-white">
            {{ statsData.monthlyAIPosts.toLocaleString() }}
          </p>
          <p class="text-xs text-neutral-500">이번달 AI 원고</p>
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
          placeholder="키워드, ID 또는 사용자로 검색..."
          icon="i-heroicons-magnifying-glass"
          class="w-96"
          @keyup.enter="handleSearch"
        />
        <UButton color="primary" @click="handleSearch">검색</UButton>
      </div>
    </UCard>

    <!-- 포스트 테이블 -->
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <span class="text-sm text-neutral-500">
            총 {{ meta.total.toLocaleString() }}건의 포스트
          </span>
        </div>
      </template>

      <UTable :columns="columns" :data="posts" :loading="isLoading">
        <template #displayId-cell="{ row }">
          <span class="text-xs font-mono">
            {{ row.original.displayId }}
          </span>
        </template>

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

        <template #keyword-cell="{ row }">
          <div class="flex flex-col">
            <span class="font-medium">{{ row.original.keyword }}</span>
            <span
              v-if="row.original.subKeywords.length > 0"
              class="text-xs text-neutral-500"
            >
              +{{ row.original.subKeywords.length }}개 서브키워드
            </span>
          </div>
        </template>

        <template #postType-cell="{ row }">
          <UBadge color="neutral" variant="subtle">
            {{ row.original.postType }}
          </UBadge>
        </template>

        <template #progress-cell="{ row }">
          <div class="flex items-center gap-2">
            <div class="w-16 h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
              <div
                class="h-full bg-primary-500 transition-all"
                :style="{
                  width: `${(row.original.completedCount / row.original.targetCount) * 100}%`,
                }"
              />
            </div>
            <span class="text-xs text-neutral-500">
              {{ row.original.completedCount }}/{{ row.original.targetCount }}
            </span>
          </div>
        </template>

        <template #status-cell="{ row }">
          <div class="flex flex-col gap-1">
            <UBadge :color="getStatusColor(row.original.status)">
              {{ getStatusLabel(row.original.status) }}
            </UBadge>
            <span
              v-if="row.original.lastError"
              class="text-xs text-error-500 truncate max-w-32"
              :title="row.original.lastError"
            >
              {{ row.original.lastError }}
            </span>
          </div>
        </template>

        <template #createdAt-cell="{ row }">
          <span class="text-sm">
            {{ formatDate(row.original.createdAt) }}
          </span>
        </template>

        <template #actions-cell="{ row }">
          <div class="flex items-center gap-2">
            <UButton
              color="neutral"
              variant="ghost"
              size="sm"
              icon="i-heroicons-eye"
              title="상세보기"
              :to="`/admin/posts/${row.original.id}`"
            />
            <UButton
              v-if="row.original.status === 'FAILED' && hasMinRole('ADMIN')"
              color="warning"
              variant="ghost"
              size="sm"
              icon="i-heroicons-arrow-path"
              title="재시도"
              :loading="retryingId === row.original.id"
              @click="handleRetry(row.original.id)"
            />
          </div>
        </template>

        <template #empty>
          <div class="flex flex-col items-center justify-center py-12">
            <UIcon
              name="i-heroicons-document-text"
              class="w-12 h-12 text-neutral-400 mb-4"
            />
            <p class="text-neutral-500">블로그 포스트가 없습니다.</p>
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
