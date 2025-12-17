<script setup lang="ts">
import { useAdminApiFetch } from '~/composables/useAdminApi';
import { AdminAdminCreateModal } from '#components';

interface Admin {
  id: number;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  lastLoginAt: string | null;
  lastLoginIp: string | null;
  createdAt: string;
  updatedAt: string;
}

interface AdminStats {
  totalAdmins: number;
  activeAdmins: number;
  inactiveAdmins: number;
  superAdmins: number;
  normalAdmins: number;
  supportAdmins: number;
  viewerAdmins: number;
}

definePageMeta({
  layout: 'admin',
  middleware: ['admin'],
});

const { hasMinRole } = useAdminAuth();
const route = useRoute();
const overlay = useOverlay();

// SUPER_ADMIN 권한 체크
if (!hasMinRole('SUPER_ADMIN')) {
  throw createError({
    statusCode: 403,
    statusMessage: '최고 관리자만 접근할 수 있습니다.',
  });
}

// 검색 및 필터 상태
const search = ref((route.query.search as string) || '');
const roleFilter = ref((route.query.role as string) || 'all');
const activeFilter = ref((route.query.isActive as string) || 'all');
const currentPage = ref(Number(route.query.page) || 1);
const limit = 20;

// 쿼리 파라미터
const queryParams = computed(() => ({
  page: currentPage.value,
  limit,
  search: search.value || undefined,
  role: roleFilter.value,
  isActive: activeFilter.value,
  sortBy: 'createdAt',
  sortOrder: 'desc',
}));

// 관리자 목록 데이터
const {
  data: adminsData,
  status,
  refresh: refreshAdmins,
} = await useAdminApiFetch<{
  data: Admin[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}>('/admin/admins', {
  query: queryParams,
  watch: [queryParams],
});

// 통계 데이터
const { data: stats, refresh: refreshStats } =
  await useAdminApiFetch<AdminStats>('/admin/admins/stats');

const admins = computed(() => adminsData.value?.data || []);
const totalPages = computed(() => adminsData.value?.meta.totalPages || 1);
const totalAdmins = computed(() => adminsData.value?.meta.total || 0);
const isLoading = computed(() => status.value === 'pending');

// 관리자 생성 모달 (useOverlay)
const createModal = overlay.create(AdminAdminCreateModal);

// 테이블 컬럼
const columns = [
  { accessorKey: 'id', header: 'ID' },
  { accessorKey: 'email', header: '이메일' },
  { accessorKey: 'name', header: '이름' },
  { accessorKey: 'role', header: '역할' },
  { accessorKey: 'isActive', header: '상태' },
  { accessorKey: 'lastLoginAt', header: '마지막 로그인' },
  { accessorKey: 'createdAt', header: '생성일' },
  { accessorKey: 'actions', header: '' },
];

// 역할 라벨
const getRoleLabel = (role: string) => {
  switch (role) {
    case 'SUPER_ADMIN':
      return '최고 관리자';
    case 'ADMIN':
      return '관리자';
    case 'SUPPORT':
      return '고객지원';
    case 'VIEWER':
      return '조회 전용';
    default:
      return role;
  }
};

// 역할 뱃지 색상
const getRoleColor = (role: string) => {
  switch (role) {
    case 'SUPER_ADMIN':
      return 'error';
    case 'ADMIN':
      return 'warning';
    case 'SUPPORT':
      return 'info';
    case 'VIEWER':
      return 'neutral';
    default:
      return 'neutral';
  }
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

// URL 업데이트
const updateUrl = () => {
  navigateTo({
    path: '/admin/admins',
    query: {
      page: currentPage.value > 1 ? currentPage.value : undefined,
      search: search.value || undefined,
      role: roleFilter.value !== 'all' ? roleFilter.value : undefined,
      isActive: activeFilter.value !== 'all' ? activeFilter.value : undefined,
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

// 역할 필터 옵션
const roleOptions = [
  { label: '전체', value: 'all' },
  { label: '최고 관리자', value: 'SUPER_ADMIN' },
  { label: '관리자', value: 'ADMIN' },
  { label: '고객지원', value: 'SUPPORT' },
  { label: '조회 전용', value: 'VIEWER' },
];

// 상태 필터 옵션
const activeOptions = [
  { label: '전체', value: 'all' },
  { label: '활성', value: 'true' },
  { label: '비활성', value: 'false' },
];

// 관리자 생성 모달 열기
const openCreateModal = async () => {
  const instance = createModal.open({});
  const result = (await instance.result) as boolean;

  if (result) {
    await Promise.all([refreshAdmins(), refreshStats()]);
  }
};
</script>

<template>
  <div class="space-y-6">
    <!-- 페이지 헤더 -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-neutral-900 dark:text-white">
          관리자 관리
        </h1>
        <p class="mt-1 text-sm text-neutral-500">
          관리자 계정을 관리합니다. (최고 관리자 전용)
        </p>
      </div>
      <UButton
        color="primary"
        icon="i-heroicons-plus"
        @click="openCreateModal"
      >
        관리자 추가
      </UButton>
    </div>

    <!-- 통계 카드 -->
    <div v-if="stats" class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
      <UCard>
        <div class="text-center">
          <p class="text-2xl font-bold text-neutral-900 dark:text-white">
            {{ stats.totalAdmins.toLocaleString() }}
          </p>
          <p class="text-sm text-neutral-500">전체</p>
        </div>
      </UCard>
      <UCard>
        <div class="text-center">
          <p class="text-2xl font-bold text-success-600">
            {{ stats.activeAdmins.toLocaleString() }}
          </p>
          <p class="text-sm text-neutral-500">활성</p>
        </div>
      </UCard>
      <UCard>
        <div class="text-center">
          <p class="text-2xl font-bold text-neutral-600">
            {{ stats.inactiveAdmins.toLocaleString() }}
          </p>
          <p class="text-sm text-neutral-500">비활성</p>
        </div>
      </UCard>
      <UCard>
        <div class="text-center">
          <p class="text-2xl font-bold text-error-600">
            {{ stats.superAdmins.toLocaleString() }}
          </p>
          <p class="text-sm text-neutral-500">최고 관리자</p>
        </div>
      </UCard>
      <UCard>
        <div class="text-center">
          <p class="text-2xl font-bold text-warning-600">
            {{ stats.normalAdmins.toLocaleString() }}
          </p>
          <p class="text-sm text-neutral-500">관리자</p>
        </div>
      </UCard>
      <UCard>
        <div class="text-center">
          <p class="text-2xl font-bold text-info-600">
            {{ stats.supportAdmins.toLocaleString() }}
          </p>
          <p class="text-sm text-neutral-500">고객지원</p>
        </div>
      </UCard>
      <UCard>
        <div class="text-center">
          <p class="text-2xl font-bold text-neutral-600">
            {{ stats.viewerAdmins.toLocaleString() }}
          </p>
          <p class="text-sm text-neutral-500">조회 전용</p>
        </div>
      </UCard>
    </div>

    <!-- 검색 및 필터 -->
    <UCard>
      <div class="flex flex-col lg:flex-row gap-4">
        <div class="flex-1 flex gap-2">
          <UInput
            v-model="search"
            placeholder="이메일 또는 이름으로 검색..."
            icon="i-heroicons-magnifying-glass"
            class="flex-1"
            @keyup.enter="handleSearch"
          />
          <UButton color="primary" @click="handleSearch">검색</UButton>
        </div>
        <div class="flex gap-2">
          <USelect
            v-model="roleFilter"
            :items="roleOptions"
            placeholder="역할"
            class="w-32"
            @update:model-value="handleFilterChange"
          />
          <USelect
            v-model="activeFilter"
            :items="activeOptions"
            placeholder="상태"
            class="w-28"
            @update:model-value="handleFilterChange"
          />
        </div>
      </div>
    </UCard>

    <!-- 관리자 목록 -->
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <h3 class="font-semibold">
            관리자 목록 ({{ totalAdmins.toLocaleString() }}명)
          </h3>
        </div>
      </template>

      <UTable :columns="columns" :data="admins" :loading="isLoading">
        <template #id-cell="{ row }">
          <span class="text-sm font-mono text-neutral-500">
            #{{ (row.original as Admin).id }}
          </span>
        </template>

        <template #email-cell="{ row }">
          <span class="font-medium">{{ (row.original as Admin).email }}</span>
        </template>

        <template #name-cell="{ row }">
          <span>{{ (row.original as Admin).name }}</span>
        </template>

        <template #role-cell="{ row }">
          <UBadge :color="getRoleColor((row.original as Admin).role)">
            {{ getRoleLabel((row.original as Admin).role) }}
          </UBadge>
        </template>

        <template #isActive-cell="{ row }">
          <UBadge :color="(row.original as Admin).isActive ? 'success' : 'neutral'">
            {{ (row.original as Admin).isActive ? '활성' : '비활성' }}
          </UBadge>
        </template>

        <template #lastLoginAt-cell="{ row }">
          <div class="flex flex-col">
            <span class="text-sm text-neutral-500">
              {{ formatDate((row.original as Admin).lastLoginAt) }}
            </span>
            <span
              v-if="(row.original as Admin).lastLoginIp"
              class="text-xs text-neutral-400"
            >
              {{ (row.original as Admin).lastLoginIp }}
            </span>
          </div>
        </template>

        <template #createdAt-cell="{ row }">
          <span class="text-sm text-neutral-500">
            {{ formatDate((row.original as Admin).createdAt) }}
          </span>
        </template>

        <template #actions-cell="{ row }">
          <UButton
            color="neutral"
            variant="ghost"
            size="sm"
            icon="i-heroicons-pencil-square"
            :to="`/admin/admins/${(row.original as Admin).id}`"
          />
        </template>

        <template #empty-state>
          <div class="flex flex-col items-center justify-center py-12">
            <UIcon
              name="i-heroicons-users"
              class="w-12 h-12 text-neutral-400 mb-4"
            />
            <p class="text-neutral-500">관리자가 없습니다.</p>
          </div>
        </template>
      </UTable>

      <!-- 페이지네이션 -->
      <template v-if="totalPages > 1" #footer>
        <div class="flex justify-center">
          <UPagination
            v-model="currentPage"
            :total="totalAdmins"
            :items-per-page="limit"
            @update:model-value="handlePageChange"
          />
        </div>
      </template>
    </UCard>

  </div>
</template>
