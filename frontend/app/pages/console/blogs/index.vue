<script lang="ts" setup>
import type { ColumnDef } from '@tanstack/vue-table';
import { BlogAddForm, UBadge, UTooltip, UButton } from '#components';

definePageMeta({
  middleware: ['auth'],
});

// Type definition for keyword tracking
interface KeywordTracking {
  id: number;
  keyword: string;
  myBlogUrl: string;
  bloggerName: string;
  title: string | null;
  isActive: boolean;
  displayCount: number;
  lastCollectedAt: Date | null;
  createdAt: Date;
}

const overlay = useOverlay();
const addFormModal = overlay.create(BlogAddForm);

const openAddForm = async () => {
  const result = await addFormModal.open();
  console.log(result);
};

// Dummy data for keyword tracking
const keywords = ref<KeywordTracking[]>([
  {
    id: 1,
    keyword: '블로그 마케팅',
    myBlogUrl: 'https://blog.naver.com/myid',
    bloggerName: '홍길동',
    title: '마케팅 블로그',
    isActive: true,
    displayCount: 40,
    lastCollectedAt: new Date('2024-11-20T10:30:00'),
    createdAt: new Date('2024-11-01'),
  },
  {
    id: 2,
    keyword: 'SEO 최적화',
    myBlogUrl: 'https://blog.naver.com/myid',
    bloggerName: '홍길동',
    title: '마케팅 블로그',
    isActive: true,
    displayCount: 40,
    lastCollectedAt: new Date('2024-11-20T09:15:00'),
    createdAt: new Date('2024-11-05'),
  },
  {
    id: 3,
    keyword: '콘텐츠 마케팅',
    myBlogUrl: 'https://tistory.com/myblog',
    bloggerName: '김철수',
    title: '철수의 일상',
    isActive: false,
    displayCount: 30,
    lastCollectedAt: new Date('2024-11-18T14:20:00'),
    createdAt: new Date('2024-10-15'),
  },
  {
    id: 4,
    keyword: '디지털 마케팅',
    myBlogUrl: 'https://blog.naver.com/myid',
    bloggerName: '홍길동',
    title: '마케팅 블로그',
    isActive: true,
    displayCount: 50,
    lastCollectedAt: new Date('2024-11-20T11:45:00'),
    createdAt: new Date('2024-11-10'),
  },
  {
    id: 5,
    keyword: '인플루언서 마케팅',
    myBlogUrl: 'https://medium.com/@user',
    bloggerName: '이영희',
    title: '영희의 마케팅 이야기',
    isActive: true,
    displayCount: 40,
    lastCollectedAt: null,
    createdAt: new Date('2024-11-19'),
  },
]);

// Modal state
const isModalOpen = ref(false);
const selectedKeyword = ref<KeywordTracking | null>(null);

// Filter state
const searchQuery = ref('');
const filterActive = ref<boolean | undefined>(undefined);

// Computed filtered keywords
const filteredKeywords = computed(() => {
  return keywords.value.filter((kw) => {
    const matchesSearch =
      !searchQuery.value ||
      kw.keyword.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      kw.bloggerName.toLowerCase().includes(searchQuery.value.toLowerCase());

    const matchesActive =
      filterActive.value === undefined || kw.isActive === filterActive.value;

    return matchesSearch && matchesActive;
  });
});

// Form state
interface KeywordForm {
  keyword: string;
  myBlogUrl: string;
  bloggerName: string;
  title?: string;
  isActive: boolean;
  displayCount: number;
}

const formState = reactive<KeywordForm>({
  keyword: '',
  myBlogUrl: '',
  bloggerName: '',
  title: '',
  isActive: true,
  displayCount: 40,
});

// Actions
function openAddModal() {
  selectedKeyword.value = null;
  Object.assign(formState, {
    keyword: '',
    myBlogUrl: '',
    bloggerName: '',
    title: '',
    isActive: true,
    displayCount: 40,
  });
  isModalOpen.value = true;
}

function openEditModal(keyword: KeywordTracking) {
  selectedKeyword.value = keyword;
  Object.assign(formState, {
    keyword: keyword.keyword,
    myBlogUrl: keyword.myBlogUrl,
    bloggerName: keyword.bloggerName,
    title: keyword.title || '',
    isActive: keyword.isActive,
    displayCount: keyword.displayCount,
  });
  isModalOpen.value = true;
}

function toggleActive(keyword: KeywordTracking) {
  keyword.isActive = !keyword.isActive;
  useToast().add({
    title: '상태 변경 완료',
    description: `"${keyword.keyword}" 추적이 ${keyword.isActive ? '활성화' : '비활성화'}되었습니다.`,
    color: 'success',
  });
}

function deleteKeyword(keyword: KeywordTracking) {
  const index = keywords.value.findIndex((k) => k.id === keyword.id);
  if (index !== -1) {
    keywords.value.splice(index, 1);
    useToast().add({
      title: '삭제 완료',
      description: `"${keyword.keyword}" 추적이 삭제되었습니다.`,
      color: 'success',
    });
  }
}

function handleSubmit() {
  if (selectedKeyword.value) {
    // Edit mode
    Object.assign(selectedKeyword.value, formState);
    useToast().add({
      title: '수정 완료',
      description: `"${formState.keyword}" 추적이 수정되었습니다.`,
      color: 'success',
    });
  } else {
    // Add mode
    const newKeyword: KeywordTracking = {
      id: Math.max(...keywords.value.map((k) => k.id)) + 1,
      ...formState,
      title: formState.title || null,
      lastCollectedAt: null,
      createdAt: new Date(),
    };
    keywords.value.push(newKeyword);
    useToast().add({
      title: '등록 완료',
      description: `"${formState.keyword}" 추적이 등록되었습니다.`,
      color: 'success',
    });
  }
  isModalOpen.value = false;
}

// Format date helper
function formatDate(date: Date | null) {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Truncate URL helper
function truncateUrl(url: string, maxLength = 30) {
  if (url.length <= maxLength) return url;
  return url.substring(0, maxLength) + '...';
}

// Table columns definition using TanStack Table API
const columns: ColumnDef<KeywordTracking>[] = [
  {
    accessorKey: 'keyword',
    header: '키워드',
    cell: ({ row }) => {
      const tracking = row.original;
      return h('div', { class: 'flex items-center gap-2' }, [
        h(
          'span',
          { class: 'font-medium text-gray-900 dark:text-white' },
          tracking.keyword,
        ),
        tracking.title
          ? h(
              UBadge,
              { color: 'neutral', variant: 'outline', size: 'xs' },
              () => tracking.title,
            )
          : null,
      ]);
    },
  },
  {
    accessorKey: 'bloggerName',
    header: '블로거',
    meta: {
      class: {
        td: 'w-32',
      },
    },
  },
  {
    accessorKey: 'myBlogUrl',
    header: '블로그 URL',
    cell: ({ row }) => {
      const url = row.original.myBlogUrl;
      return h(UTooltip, { text: url }, () =>
        h(
          'a',
          {
            href: url,
            target: '_blank',
            class:
              'text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300',
          },
          truncateUrl(url),
        ),
      );
    },
    meta: {
      class: {
        td: 'w-48',
      },
    },
  },
  {
    accessorKey: 'displayCount',
    header: '검색 결과 수',
    cell: ({ row }) => {
      return h(
        UBadge,
        { color: 'neutral', variant: 'subtle' },
        () => `${row.original.displayCount}개`,
      );
    },
    meta: {
      class: {
        td: 'w-28',
      },
    },
  },
  {
    accessorKey: 'isActive',
    header: '상태',
    cell: ({ row }) => {
      const isActive = row.original.isActive;
      return h(
        UBadge,
        { color: isActive ? 'success' : 'neutral', variant: 'subtle' },
        () => (isActive ? '활성' : '비활성'),
      );
    },
    meta: {
      class: {
        td: 'w-24',
      },
    },
  },
  {
    accessorKey: 'lastCollectedAt',
    header: '마지막 수집',
    cell: ({ row }) => {
      return h(
        'span',
        { class: 'text-sm text-gray-600 dark:text-gray-400' },
        formatDate(row.original.lastCollectedAt),
      );
    },
    meta: {
      class: {
        td: 'w-36',
      },
    },
  },
  {
    id: 'actions',
    header: '작업',
    cell: ({ row }) => {
      const tracking = row.original;
      return h('div', { class: 'flex items-center gap-2' }, [
        h(UTooltip, { text: tracking.isActive ? '비활성화' : '활성화' }, () =>
          h(UButton, {
            icon: tracking.isActive
              ? 'i-heroicons-pause-circle'
              : 'i-heroicons-play-circle',
            color: tracking.isActive ? 'warning' : 'success',
            variant: 'ghost',
            size: 'sm',
            onClick: () => toggleActive(tracking),
          }),
        ),
        h(UTooltip, { text: '수정' }, () =>
          h(UButton, {
            icon: 'i-heroicons-pencil-square',
            color: 'primary',
            variant: 'ghost',
            size: 'sm',
            onClick: () => openEditModal(tracking),
          }),
        ),
        h(UTooltip, { text: '삭제' }, () =>
          h(UButton, {
            icon: 'i-heroicons-trash',
            color: 'error',
            variant: 'ghost',
            size: 'sm',
            onClick: () => deleteKeyword(tracking),
          }),
        ),
      ]);
    },
    meta: {
      class: {
        td: 'w-32',
      },
    },
  },
];
</script>

<template>
  <section class="container mx-auto max-w-6xl">
    <!-- Page Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
          블로그 순위 추적
        </h1>
        <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
          키워드별 블로그 순위를 추적하고 관리하세요
        </p>
      </div>
      <UButton
        icon="i-heroicons-plus"
        size="lg"
        color="primary"
        @click="openAddForm"
      >
        새 추적 등록
      </UButton>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <UCard>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600 dark:text-gray-400">전체 추적</p>
            <p class="mt-1 text-3xl font-bold text-gray-900 dark:text-white">
              {{ keywords.length }}
            </p>
          </div>
          <UIcon
            name="i-heroicons-chart-bar"
            class="w-12 h-12 text-primary-500"
          />
        </div>
      </UCard>

      <UCard>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600 dark:text-gray-400">활성 추적</p>
            <p class="mt-1 text-3xl font-bold text-success-600">
              {{ keywords.filter((k) => k.isActive).length }}
            </p>
          </div>
          <UIcon
            name="i-heroicons-check-circle"
            class="w-12 h-12 text-success-500"
          />
        </div>
      </UCard>

      <UCard>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600 dark:text-gray-400">비활성 추적</p>
            <p class="mt-1 text-3xl font-bold text-gray-600">
              {{ keywords.filter((k) => !k.isActive).length }}
            </p>
          </div>
          <UIcon
            name="i-heroicons-pause-circle"
            class="w-12 h-12 text-gray-400"
          />
        </div>
      </UCard>
    </div>

    <!-- Filters -->
    <UCard>
      <div class="flex flex-col sm:flex-row gap-4">
        <div class="flex-1">
          <UInput
            v-model="searchQuery"
            icon="i-heroicons-magnifying-glass"
            placeholder="키워드 또는 블로거 이름으로 검색..."
            size="lg"
          />
        </div>
        <USelectMenu
          v-model="filterActive"
          :options="[
            { label: '전체', value: undefined },
            { label: '활성', value: true },
            { label: '비활성', value: false },
          ]"
          placeholder="상태 필터"
          size="lg"
          class="w-full sm:w-48"
        />
      </div>
    </UCard>

    <!-- Keywords Table -->
    <UCard>
      <UTable
        :data="filteredKeywords"
        :columns="columns"
        empty="등록된 키워드 추적이 없습니다."
      />
    </UCard>
  </section>
</template>
