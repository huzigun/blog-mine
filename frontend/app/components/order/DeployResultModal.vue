<script lang="ts" setup>
interface BlogListItem {
  stateNo: string;
  sort: string;
  date: string;
  url: string;
}

interface Pagination {
  currentPage: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

interface DeployResult {
  success: boolean;
  message: string;
  postNo: number;
  title?: string;
  items: BlogListItem[];
  pagination: Pagination;
}

const props = defineProps<{
  blogPostId: number;
  helloPostNo: number;
}>();

const emit = defineEmits<{ close: [void] }>();

const toast = useToast();

// 현재 페이지
const currentPage = ref(1);
const limit = 10;

// 배포 결과 조회
const {
  data: deployResult,
  status,
  refresh,
} = await useApiFetch<DeployResult>(
  () =>
    `/blog-posts/${props.blogPostId}/deploy-result?page=${currentPage.value}&limit=${limit}`,
  {
    watch: [currentPage],
  },
);

// 페이지 변경 핸들러
const handlePageChange = (page: number) => {
  currentPage.value = page;
};

// 새로고침
const handleRefresh = async () => {
  await refresh();
  toast.add({
    title: '새로고침 완료',
    description: '배포 결과를 다시 불러왔습니다.',
    color: 'success',
  });
};

// 블로그 URL 열기
const openBlogUrl = (url: string) => {
  window.open(url, '_blank');
};

// 날짜 포맷
const formatDate = (dateStr: string) => {
  if (!dateStr) return '-';
  // YYYY-MM-DD 형식 가정
  return dateStr;
};
</script>

<template>
  <UModal :close="{ onClick: () => emit('close') }" class="sm:max-w-2xl">
    <template #header>
      <div class="flex items-center gap-2">
        <UIcon
          name="i-heroicons-chart-bar-square"
          class="w-5 h-5 text-primary"
        />
        <span class="font-bold">배포 결과 확인</span>
        <UBadge color="neutral" variant="soft" size="xs">
          #{{ helloPostNo }}
        </UBadge>
      </div>
    </template>

    <template #body>
      <div class="space-y-4">
        <!-- 로딩 상태 -->
        <div v-if="status === 'pending'" class="py-8">
          <div class="flex flex-col items-center gap-3">
            <UIcon
              name="i-heroicons-arrow-path"
              class="w-8 h-8 text-primary animate-spin"
            />
            <p class="text-sm text-neutral-500">배포 결과를 불러오는 중...</p>
          </div>
        </div>

        <!-- 결과 없음 -->
        <div
          v-else-if="!deployResult?.success || deployResult.items.length === 0"
          class="py-8"
        >
          <div class="flex flex-col items-center gap-3">
            <UIcon
              name="i-heroicons-clock"
              class="w-12 h-12 text-neutral-400"
            />
            <div class="text-center">
              <p class="font-medium text-neutral-700 dark:text-neutral-300">
                아직 배포된 블로그가 없습니다
              </p>
              <p class="text-sm text-neutral-500 mt-1">
                배포가 진행 중이거나 아직 시작되지 않았습니다.
              </p>
            </div>
            <UButton
              color="primary"
              variant="soft"
              size="sm"
              icon="i-heroicons-arrow-path"
              @click="handleRefresh"
            >
              새로고침
            </UButton>
          </div>
        </div>

        <!-- 결과 목록 -->
        <template v-else>
          <!-- 요약 정보 -->
          <div
            class="p-3 rounded-lg bg-primary-50 dark:bg-primary-950/30 border border-primary-200 dark:border-primary-800"
          >
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-neutral-600 dark:text-neutral-400">
                  배포 완료
                </p>
                <p class="text-lg font-bold text-primary-600 dark:text-primary-400">
                  {{ deployResult.pagination.totalCount }}건
                </p>
              </div>
              <UButton
                color="neutral"
                variant="ghost"
                size="sm"
                icon="i-heroicons-arrow-path"
                @click="handleRefresh"
              >
                새로고침
              </UButton>
            </div>
          </div>

          <!-- 블로그 목록 -->
          <div class="space-y-2 max-h-[400px] overflow-y-auto">
            <div
              v-for="(item, index) in deployResult.items"
              :key="item.stateNo"
              class="p-3 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:border-primary/50 transition-colors cursor-pointer"
              @click="openBlogUrl(item.url)"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 mb-1">
                    <span
                      class="text-xs font-medium text-neutral-500 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded"
                    >
                      #{{ (currentPage - 1) * limit + index + 1 }}
                    </span>
                    <span class="text-xs text-neutral-400">
                      {{ formatDate(item.date) }}
                    </span>
                  </div>
                  <p
                    class="text-sm text-neutral-700 dark:text-neutral-300 truncate"
                  >
                    {{ item.url }}
                  </p>
                </div>
                <UButton
                  color="primary"
                  variant="ghost"
                  size="xs"
                  icon="i-heroicons-arrow-top-right-on-square"
                  @click.stop="openBlogUrl(item.url)"
                />
              </div>
            </div>
          </div>

          <!-- 페이지네이션 -->
          <div
            v-if="deployResult.pagination.totalPages > 1"
            class="flex justify-center pt-2"
          >
            <UPagination
              :model-value="currentPage"
              :total="deployResult.pagination.totalCount"
              :page-count="limit"
              @update:model-value="handlePageChange"
            />
          </div>
        </template>
      </div>
    </template>

    <template #footer>
      <UButton
        color="neutral"
        variant="outline"
        size="lg"
        block
        @click="emit('close')"
      >
        닫기
      </UButton>
    </template>
  </UModal>
</template>
