<script setup lang="ts">
import { useAdminApiFetch } from '~/composables/useAdminApi';

interface Contact {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  category: string;
  status: string;
  respondedAt: string | null;
  createdAt: string;
}

interface ContactStats {
  totalContacts: number;
  pendingContacts: number;
  inProgressContacts: number;
  resolvedContacts: number;
  closedContacts: number;
  todayContacts: number;
  monthlyContacts: number;
}

definePageMeta({
  layout: 'admin',
  middleware: ['admin'],
});

const { hasMinRole } = useAdminAuth();
const route = useRoute();

// 권한 체크
if (!hasMinRole('SUPPORT')) {
  throw createError({
    statusCode: 403,
    statusMessage: '접근 권한이 없습니다.',
  });
}

// 검색 및 필터 상태
const search = ref((route.query.search as string) || '');
const statusFilter = ref((route.query.status as string) || 'all');
const categoryFilter = ref((route.query.category as string) || 'all');
const currentPage = ref(Number(route.query.page) || 1);
const limit = 20;

// 쿼리 파라미터
const queryParams = computed(() => ({
  page: currentPage.value,
  limit,
  search: search.value || undefined,
  status: statusFilter.value,
  category: categoryFilter.value,
  sortBy: 'createdAt',
  sortOrder: 'desc',
}));

// 문의 목록 데이터
const { data: contactsData, status } = await useAdminApiFetch<{
  data: Contact[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}>('/admin/contacts', {
  query: queryParams,
  watch: [queryParams],
});

// 통계 데이터
const { data: stats } = await useAdminApiFetch<ContactStats>(
  '/admin/contacts/stats',
);

const contacts = computed(() => contactsData.value?.data || []);
const totalPages = computed(() => contactsData.value?.meta.totalPages || 1);
const totalContacts = computed(() => contactsData.value?.meta.total || 0);
const isLoading = computed(() => status.value === 'pending');

// 테이블 컬럼
const columns = [
  { accessorKey: 'id', header: 'ID' },
  { accessorKey: 'name', header: '이름' },
  { accessorKey: 'email', header: '이메일' },
  { accessorKey: 'subject', header: '제목' },
  { accessorKey: 'category', header: '카테고리' },
  { accessorKey: 'status', header: '상태' },
  { accessorKey: 'createdAt', header: '접수일' },
  { accessorKey: 'actions', header: '' },
];

// 상태 뱃지 색상
const getStatusColor = (status: string) => {
  switch (status) {
    case 'RESOLVED':
      return 'success';
    case 'IN_PROGRESS':
      return 'info';
    case 'PENDING':
      return 'warning';
    case 'CLOSED':
      return 'neutral';
    default:
      return 'neutral';
  }
};

// 상태 라벨
const getStatusLabel = (status: string) => {
  switch (status) {
    case 'RESOLVED':
      return '해결됨';
    case 'IN_PROGRESS':
      return '처리중';
    case 'PENDING':
      return '대기중';
    case 'CLOSED':
      return '종료';
    default:
      return status;
  }
};

// 카테고리 라벨
const getCategoryLabel = (category: string) => {
  switch (category) {
    case 'GENERAL':
      return '일반';
    case 'TECHNICAL':
      return '기술';
    case 'BILLING':
      return '결제';
    case 'FEATURE':
      return '기능요청';
    case 'BUG':
      return '버그';
    case 'PARTNERSHIP':
      return '제휴';
    case 'OTHER':
      return '기타';
    default:
      return category;
  }
};

// 날짜 포맷
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// URL 업데이트
const updateUrl = () => {
  navigateTo({
    path: '/admin/contacts',
    query: {
      page: currentPage.value > 1 ? currentPage.value : undefined,
      search: search.value || undefined,
      status: statusFilter.value !== 'all' ? statusFilter.value : undefined,
      category:
        categoryFilter.value !== 'all' ? categoryFilter.value : undefined,
    },
  });
};

// 검색 핸들러
const handleSearch = () => {
  currentPage.value = 1;
  updateUrl();
};

// 필터 변경 핸들러
const handleFilterChange = () => {
  currentPage.value = 1;
  updateUrl();
};

// 페이지 변경 핸들러
const handlePageChange = (page: number) => {
  currentPage.value = page;
  updateUrl();
};

// 상태 필터 옵션
const statusOptions = [
  { label: '전체', value: 'all' },
  { label: '대기중', value: 'PENDING' },
  { label: '처리중', value: 'IN_PROGRESS' },
  { label: '해결됨', value: 'RESOLVED' },
  { label: '종료', value: 'CLOSED' },
];

// 카테고리 필터 옵션
const categoryOptions = [
  { label: '전체', value: 'all' },
  { label: '일반', value: 'GENERAL' },
  { label: '기술', value: 'TECHNICAL' },
  { label: '결제', value: 'BILLING' },
  { label: '기능요청', value: 'FEATURE' },
  { label: '버그', value: 'BUG' },
  { label: '제휴', value: 'PARTNERSHIP' },
  { label: '기타', value: 'OTHER' },
];
</script>

<template>
  <div class="space-y-6">
    <!-- 페이지 헤더 -->
    <div>
      <h1 class="text-2xl font-bold text-neutral-900 dark:text-white">
        문의 관리
      </h1>
      <p class="mt-1 text-sm text-neutral-500">고객 문의를 관리합니다.</p>
    </div>

    <!-- 통계 카드 -->
    <div v-if="stats" class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
      <UCard>
        <div class="text-center">
          <p class="text-2xl font-bold text-neutral-900 dark:text-white">
            {{ stats.totalContacts.toLocaleString() }}
          </p>
          <p class="text-sm text-neutral-500">전체</p>
        </div>
      </UCard>
      <UCard>
        <div class="text-center">
          <p class="text-2xl font-bold text-warning-600">
            {{ stats.pendingContacts.toLocaleString() }}
          </p>
          <p class="text-sm text-neutral-500">대기중</p>
        </div>
      </UCard>
      <UCard>
        <div class="text-center">
          <p class="text-2xl font-bold text-info-600">
            {{ stats.inProgressContacts.toLocaleString() }}
          </p>
          <p class="text-sm text-neutral-500">처리중</p>
        </div>
      </UCard>
      <UCard>
        <div class="text-center">
          <p class="text-2xl font-bold text-success-600">
            {{ stats.resolvedContacts.toLocaleString() }}
          </p>
          <p class="text-sm text-neutral-500">해결됨</p>
        </div>
      </UCard>
      <UCard>
        <div class="text-center">
          <p class="text-2xl font-bold text-neutral-600">
            {{ stats.closedContacts.toLocaleString() }}
          </p>
          <p class="text-sm text-neutral-500">종료</p>
        </div>
      </UCard>
      <UCard>
        <div class="text-center">
          <p class="text-2xl font-bold text-primary-600">
            {{ stats.todayContacts.toLocaleString() }}
          </p>
          <p class="text-sm text-neutral-500">오늘</p>
        </div>
      </UCard>
      <UCard>
        <div class="text-center">
          <p class="text-2xl font-bold text-primary-600">
            {{ stats.monthlyContacts.toLocaleString() }}
          </p>
          <p class="text-sm text-neutral-500">이번달</p>
        </div>
      </UCard>
    </div>

    <!-- 검색 및 필터 -->
    <UCard>
      <div class="flex flex-col lg:flex-row gap-4">
        <div class="flex-1 flex gap-2">
          <UInput
            v-model="search"
            placeholder="이름, 이메일, 제목으로 검색..."
            icon="i-heroicons-magnifying-glass"
            class="flex-1"
            @keyup.enter="handleSearch"
          />
          <UButton color="primary" @click="handleSearch">검색</UButton>
        </div>
        <div class="flex gap-2">
          <USelect
            v-model="statusFilter"
            :items="statusOptions"
            placeholder="상태"
            class="w-32"
            @update:model-value="handleFilterChange"
          />
          <USelect
            v-model="categoryFilter"
            :items="categoryOptions"
            placeholder="카테고리"
            class="w-32"
            @update:model-value="handleFilterChange"
          />
        </div>
      </div>
    </UCard>

    <!-- 문의 목록 -->
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <h3 class="font-semibold">
            문의 목록 ({{ totalContacts.toLocaleString() }}건)
          </h3>
        </div>
      </template>

      <UTable :columns="columns" :data="contacts" :loading="isLoading">
        <template #id-cell="{ row }">
          <span class="text-sm font-mono text-neutral-500">
            #{{ (row.original as Contact).id }}
          </span>
        </template>

        <template #name-cell="{ row }">
          <div class="flex flex-col">
            <span class="font-medium">{{ (row.original as Contact).name }}</span>
            <span v-if="(row.original as Contact).phone" class="text-xs text-neutral-500">
              {{ (row.original as Contact).phone }}
            </span>
          </div>
        </template>

        <template #email-cell="{ row }">
          <span class="text-sm">{{ (row.original as Contact).email }}</span>
        </template>

        <template #subject-cell="{ row }">
          <span class="text-sm line-clamp-1">{{ (row.original as Contact).subject }}</span>
        </template>

        <template #category-cell="{ row }">
          <UBadge color="neutral" variant="subtle">
            {{ getCategoryLabel((row.original as Contact).category) }}
          </UBadge>
        </template>

        <template #status-cell="{ row }">
          <UBadge :color="getStatusColor((row.original as Contact).status)">
            {{ getStatusLabel((row.original as Contact).status) }}
          </UBadge>
        </template>

        <template #createdAt-cell="{ row }">
          <span class="text-sm text-neutral-500">
            {{ formatDate((row.original as Contact).createdAt) }}
          </span>
        </template>

        <template #actions-cell="{ row }">
          <UButton
            color="neutral"
            variant="ghost"
            size="sm"
            icon="i-heroicons-eye"
            :to="`/admin/contacts/${(row.original as Contact).id}`"
          />
        </template>

        <template #empty-state>
          <div class="flex flex-col items-center justify-center py-12">
            <UIcon
              name="i-heroicons-chat-bubble-left-right"
              class="w-12 h-12 text-neutral-400 mb-4"
            />
            <p class="text-neutral-500">문의 내역이 없습니다.</p>
          </div>
        </template>
      </UTable>

      <!-- 페이지네이션 -->
      <template v-if="totalPages > 1" #footer>
        <div class="flex justify-center">
          <UPagination
            v-model="currentPage"
            :total="totalContacts"
            :items-per-page="limit"
            @update:model-value="handlePageChange"
          />
        </div>
      </template>
    </UCard>
  </div>
</template>
