<script lang="ts" setup>
import type { ColumnDef } from '@tanstack/vue-table';
import { UButton, UBadge, UProgress } from '#components';
import { postTypes } from '~/schemas/post';

definePageMeta({
  middleware: ['auth'],
});

const route = useRoute();
const [isPending] = useTransition();

// Pagination state
const currentPage = ref(1);
const itemsPerPage = ref(10);

// Filter state
const postType = ref<string>(route.query.postType?.toString() || 'all');
const keyword = ref<string>(route.query.keyword?.toString() || '');
const dateRange = ref<{ start: string | null; end: string | null }>({
  start: route.query.startDate?.toString() || null,
  end: route.query.endDate?.toString() || null,
});

// Date range 변경 시 filters 업데이트

// PostType 옵션 생성 (전체 옵션 포함)
const postTypeOptions = [
  { label: '전체', value: 'all' },
  ...postTypes.map((type) => ({ label: type, value: type })),
];

// 필터 리셋 함수
const resetFilters = () => {
  dateRange.value = { start: null, end: null };
  postType.value = 'all';
  keyword.value = '';
  currentPage.value = 1;
  updateQueryParams({
    startDate: undefined,
    endDate: undefined,
    postType: undefined,
    keyword: undefined,
    page: 1,
  });
};

const searchParams = computed(() => {
  return {
    page: route.query.page || 1,
    limit: route.query.limit || 10,
    startDate: route.query.startDate || undefined,
    endDate: route.query.endDate || undefined,
    postType: route.query.postType || undefined,
    keyword: route.query.keyword || undefined,
  };
});

// Fetch data with pagination and filters
const { data: response } = await useApiFetch<PaginatedResponse<BlogPost>>(
  '/blog-posts',
  {
    query: searchParams,
    watch: [searchParams],
  },
);

// Status badge color mapping
const getStatusColor = (
  status: BlogPost['status'],
): 'neutral' | 'primary' | 'success' | 'error' => {
  switch (status) {
    case 'PENDING':
      return 'neutral';
    case 'IN_PROGRESS':
      return 'primary';
    case 'COMPLETED':
      return 'success';
    case 'FAILED':
      return 'error';
    default:
      return 'neutral';
  }
};

// Status text mapping
const getStatusText = (status: BlogPost['status']): string => {
  switch (status) {
    case 'PENDING':
      return '대기중';
    case 'IN_PROGRESS':
      return '생성중';
    case 'COMPLETED':
      return '완료';
    case 'FAILED':
      return '실패';
    default:
      return status;
  }
};

// Table columns definition
const columns: ColumnDef<BlogPost>[] = [
  {
    accessorKey: 'displayId',
    header: '원고 ID',
    cell: ({ row }) => row.original.displayId,
    meta: {
      class: {
        td: 'w-28 font-mono text-xs',
      },
    },
  },
  {
    accessorKey: 'keyword',
    header: '키워드',
    cell: ({ row }) => {
      const post = row.original;
      return h('div', { class: 'flex flex-col gap-1' }, [
        h('div', { class: 'font-medium' }, post.keyword),
        h('div', { class: 'text-xs text-neutral-500' }, post.postType),
      ]);
    },
  },
  {
    accessorKey: 'progress',
    header: '진행상황',
    cell: ({ row }) => {
      const post = row.original;
      const progress = Math.round(
        (post.completedCount / post.targetCount) * 100,
      );

      // Progress 색상 결정 (완료율에 따라)
      let progressColor: 'neutral' | 'primary' | 'success' = 'neutral';
      if (progress >= 100) {
        progressColor = 'success';
      } else if (progress >= 50) {
        progressColor = 'primary';
      }

      return h('div', { class: 'flex flex-col gap-1.5 min-w-32' }, [
        h(
          'div',
          { class: 'text-xs text-neutral-600 dark:text-neutral-400' },
          `${post.completedCount} / ${post.targetCount} (${progress}%)`,
        ),
        h(UProgress, {
          modelValue: progress,
          color: progressColor,
          size: 'sm',
        }),
      ]);
    },
    meta: {
      class: {
        td: 'w-40',
      },
    },
  },
  {
    accessorKey: 'length',
    header: '글자수',
    cell: ({ row }) => `${row.original.length.toLocaleString()}자`,
    meta: {
      class: {
        td: 'w-20',
      },
    },
  },
  {
    accessorKey: 'status',
    header: '상태',
    cell: ({ row }) => {
      const status = row.original.status;
      return h(
        UBadge,
        {
          color: getStatusColor(status),
          size: 'sm',
        },
        () => getStatusText(status),
      );
    },
    meta: {
      class: {
        td: 'w-20',
      },
    },
  },
  {
    accessorKey: 'createdAt',
    header: '생성일',
    cell: ({ row }) => {
      const date = new Date(row.original.createdAt);
      return date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
    },
    meta: {
      class: {
        td: 'w-28',
      },
    },
  },
  {
    id: 'actions',
    header: '액션',
    cell: ({ row }) => {
      const handleView = () => {
        navigateTo(`/console/workspace/${row.original.id}`);
      };

      return h('div', { class: 'flex gap-2' }, [
        h(
          UButton,
          {
            size: 'xs',
            color: 'primary',
            variant: 'soft',
            onClick: handleView,
            loading: isPending.value,
          },
          () => '보기',
        ),
      ]);
    },
    meta: {
      class: {
        td: 'w-24',
      },
    },
  },
];

const updateQueryParams = (params: Record<string, any>) => {
  const route = useRoute();

  const newQuery = {
    ...route.query,
    ...params,
  };

  // Remove keys with undefined or null values
  Object.keys(newQuery).forEach((key) => {
    if (newQuery[key] === undefined || newQuery[key] === null) {
      delete newQuery[key];
    }
  });

  return navigateTo({
    path: route.path,
    query: newQuery,
  });
};
</script>

<template>
  <section class="container mx-auto max-w-6xl">
    <ConsoleTitle
      title="원고 보관함"
      description="생성된 블로그 원고를 확인하고 관리할 수 있습니다."
    />

    <div
      class="flex justify-between items-center py-4 gap-x-1.5 flex-wrap gap-y-2.5"
    >
      <!-- prettier-ignore -->
      <div class="text-[13px] mr-auto">
        총 <span class="text-primary font-semibold">{{ (response?.meta.total || 0).toLocaleString() }}</span>개의 원고 요청
      </div>

      <DateRangePicker
        v-model="dateRange"
        placeholder="기간 선택"
        :number-of-months="2"
        variant="subtle"
        size="sm"
        class="w-62"
        @update:model-value="
          (value) =>
            updateQueryParams({
              startDate: value?.start,
              endDate: value?.end,
              page: 1,
            })
        "
      />

      <USelect
        v-model="postType"
        :items="postTypeOptions"
        placeholder="포스트 유형 선택"
        class="w-44"
        @update:model-value="
          (value) =>
            updateQueryParams({
              postType: value !== 'all' ? value : undefined,
              page: 1,
            })
        "
      />

      <UInput
        v-model.trim="keyword"
        icon="i-heroicons-magnifying-glass"
        placeholder="키워드로 검색"
        class="w-52"
        @keyup.enter="updateQueryParams({ keyword: keyword, page: 1 })"
      />
      <UButton
        variant="soft"
        icon="i-heroicons-arrow-path"
        @click="resetFilters"
      >
        새로고침
      </UButton>
      <UButton color="primary" to="/console/ai-post" icon="ic:round-add">
        원고 생성
      </UButton>
    </div>
    <UTable
      :data="response?.data || []"
      :columns="columns"
      :loading="isPending"
      empty="생성된 원고가 없습니다. 원고를 생성해보세요."
    />
    <div class="flex justify-center py-6">
      <UPagination
        v-model:page="currentPage"
        :total="response?.meta.total || 0"
        :items-per-page="response?.meta.limit || 10"
        :show-edges="true"
        :show-controls="true"
        @update:page="(page) => updateQueryParams({ page })"
      />
    </div>
  </section>
</template>
