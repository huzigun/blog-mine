<script lang="ts" setup>
import type { ColumnDef } from '@tanstack/vue-table';
import { BlogAddForm, UTooltip, UButton, USwitch, BlogRank } from '#components';

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

const confirm = useConfirm();
const toast = useToast();
const overlay = useOverlay();
const addFormModal = overlay.create(BlogAddForm);
const rankModal = overlay.create(BlogRank);
const [isLoading, startTransition] = useTransition();

// Pagination state
const currentPage = ref(1);
const itemsPerPage = ref(10);

const openAddForm = async () => {
  const result = await addFormModal.open();
  if (result === true) {
    await refresh();
  }
};

const openRankModal = async (track: KeywordTracking) => {
  await rankModal.open({
    blogId: track.id,
  });
};

const { data: result, refresh } = await useApiFetch<{
  data: KeywordTracking[];
  meta: any;
}>('/keyword-tracking', {});

function deleteKeyword(tracking: KeywordTracking) {
  startTransition(
    async () => {
      await useApi(`/keyword-tracking/${tracking.id}`, {
        method: 'DELETE',
      });
    },
    {
      onSuccess: async () => {
        await refresh();
        toast.add({
          title: '삭제 완료',
          description: `[${tracking.title}] 추적이 삭제되었습니다.`,
          color: 'success',
        });
      },
      onError: () => {
        toast.add({
          title: '삭제 실패',
          description: `[${tracking.title}] 추적의 삭제에 실패했습니다.`,
          color: 'error',
        });
      },
    },
  );
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

// Table columns definition using TanStack Table API
const columns: ColumnDef<KeywordTracking>[] = [
  {
    accessorKey: 'keyword',
    header: '키워드',
  },
  {
    accessorKey: 'bloggerName',
    header: '블로거 이름',
  },
  {
    accessorKey: 'title',
    header: '블로그 URL',
    cell: ({ row }) => {
      const title = row.getValue('title') as string;
      const url = row.original.myBlogUrl;
      return h(
        'div',
        {
          class: 'flex items-center justify-between gap-x-2',
        },
        [
          h('span', {}, title),
          h(UButton, {
            size: 'md',
            icon: 'i-heroicons-arrow-top-right-on-square',
            color: 'primary',
            variant: 'ghost',
            href: url,
            target: '_blank',
          }),
        ],
      );
    },
  },
  {
    accessorKey: 'isActive',
    header: '상태',
    cell: ({ row }) => {
      const isActive = row.original.isActive;
      const originalId = row.original.id;
      return h(USwitch, {
        color: 'neutral',
        variant: 'subtle',
        size: 'sm',
        modelValue: isActive,
        loading: isLoading.value,
        'onUpdate:modelValue': (value: boolean) => {
          startTransition(
            async () => {
              await useApi(`/keyword-tracking/${originalId}/toggle`, {
                method: 'PATCH',
                body: { isActive: value },
              });
            },
            {
              onSuccess: () => {
                row.original.isActive = value;
                useToast().add({
                  title: '상태 변경 완료',
                  description: `[${row.original.title}] 추적이 ${
                    row.original.isActive ? '활성화' : '비활성화'
                  }되었습니다.`,
                  color: 'success',
                });
              },
              onError: () => {
                useToast().add({
                  title: '상태 변경 실패',
                  description: `[${row.original.title}] 추적의 상태 변경에 실패했습니다.`,
                  color: 'error',
                });
              },
            },
          );
        },
      });
    },
  },
  {
    accessorKey: 'createdAt',
    header: '등록 일시',
    cell: ({ row }) => {
      const date = row.original.createdAt;
      return formatDate(date);
    },
  },
  {
    id: 'actions',
    header: '작업',
    cell: ({ row }) => {
      const tracking = row.original;
      return h('div', { class: 'flex items-center gap-2' }, [
        h(UTooltip, { text: '삭제' }, () =>
          h(UButton, {
            icon: 'i-heroicons-trash',
            color: 'error',
            variant: 'ghost',
            size: 'sm',
            onClick: () => {
              confirm({
                title: '키워드 추적 삭제',
                description: `"${tracking.keyword}" 키워드 추적을 정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`,
                confirmText: '삭제',
                cancelText: '취소',
                confirmColor: 'error',
                icon: 'i-heroicons-trash',
              }).then((confirmed) => {
                if (confirmed) {
                  deleteKeyword(tracking);
                }
              });
            },
          }),
        ),
        h(UButton, {
          icon: 'i-heroicons-chart-bar-solid',
          color: 'info',
          variant: 'ghost',
          size: 'sm',
          onClick: () => {
            openRankModal(row.original);
          },
        }),
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
  <SubscriptionGuard>
    <section class="container mx-auto max-w-6xl">
      <ConsoleTitle
        title="블로그 순위 추적"
        description="키워드별 블로그 순위를 추적하고 관리하세요"
      />

      <!-- Help Section (Collapsible) -->
      <UAccordion
        :items="[
          {
            label: '추적 기능 안내',
            icon: 'i-heroicons-information-circle',
            slot: 'help-content',
          },
        ]"
        color="primary"
        variant="subtle"
        class="mb-4 border border-primary/10 bg-primary/3 rounded-lg px-4"
      >
        <template #help-content>
          <ul
            class="list-disc list-inside space-y-2 text-sm text-gray-700 dark:text-gray-300 pb-4"
          >
            <li>
              등록된 블로그 중 활성화된 블로그의 순위 데이터를 매일 자동으로
              수집합니다.
            </li>
            <li>등록된 기간 동안 최신 순위 변화를 확인할 수 있습니다.</li>
            <li>
              필요할 경우 언제든지 추적을 중지해 보관함으로 이동할 수 있습니다.
            </li>
          </ul>
        </template>
      </UAccordion>

      <div class="flex justify-between items-center py-4">
        <!-- prettier-ignore -->
        <div class="text-[13px]">
        총 <span class="text-primary font-semibold">{{ (result?.meta.total || 0).toLocaleString() }}</span>개의 블로그
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

      <!-- Keywords Table -->
      <UTable
        :data="result?.data || []"
        :columns="columns"
        empty="등록된 키워드 추적이 없습니다."
      />

      <div class="flex justify-center py-4">
        <UPagination
          v-model:page="currentPage"
          :total="result?.meta.total || 0"
          :items-per-page="itemsPerPage"
          :show-edges="true"
          :show-controls="true"
        />
      </div>
    </section>
  </SubscriptionGuard>
</template>
