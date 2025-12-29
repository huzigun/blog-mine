<script lang="ts" setup>
import type { ColumnDef } from '@tanstack/vue-table';
import { UButton } from '#components';

definePageMeta({
  middleware: ['auth'],
});

const toast = useToast();
const confirm = useConfirm();
const [isPending, startTransition] = useTransition();

// Pagination state
const currentPage = ref(1);
const itemsPerPage = ref(10);

// Fetch data with pagination
const { data: response, refresh } = await useApiFetch<
  PaginatedResponse<Persona>
>('/personas/my', {
  query: {
    page: currentPage,
    limit: itemsPerPage,
  },
  watch: [currentPage, itemsPerPage],
});

// Table columns definition
const columns: ColumnDef<Persona>[] = [
  {
    accessorKey: 'id',
    header: 'ID',
    meta: {
      class: {
        td: 'w-20',
      },
    },
  },
  {
    accessorKey: 'info',
    header: '페르소나 정보',
    cell: ({ row }) =>
      `${row.original.occupation} (${row.original.age}세/${row.original.gender})`,
  },
  {
    accessorKey: 'isMarried',
    header: '결혼',
    cell: ({ row }) => (row.original.isMarried ? '기혼' : '미혼'),
  },
  {
    accessorKey: 'hasChildren',
    header: '자녀',
    cell: ({ row }) => (row.original.hasChildren ? '유' : '무'),
  },
  {
    id: 'actions',
    header: '액션',
    cell: ({ row }) => {
      const handleEdit = () => {
        navigateTo(`/console/personas/${row.original.id}/edit`);
      };

      const handleDelete = async () => {
        const confirmed = await confirm({
          title: '페르소나 삭제',
          description:
            '정말 이 페르소나를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.',
          confirmText: '삭제',
          cancelText: '취소',
          confirmColor: 'error',
          icon: 'i-heroicons-trash',
        });

        if (!confirmed) {
          return;
        }

        startTransition(
          async () => {
            await useApi(`/personas/${row.original.id}`, {
              method: 'DELETE',
            });
          },
          {
            onComplete: () => {
              toast.add({
                title: '페르소나 삭제 완료',
                color: 'success',
              });
              refresh();
            },
            onError: () => {
              toast.add({
                title: '페르소나 삭제 실패',
                color: 'error',
              });
            },
          },
        );
      };

      return h('div', { class: 'flex gap-2' }, [
        h(
          UButton,
          {
            size: 'xs',
            color: 'primary',
            variant: 'soft',
            onClick: handleEdit,
            loading: isPending.value,
          },
          () => '수정',
        ),
        h(
          UButton,
          {
            size: 'xs',
            color: 'error',
            variant: 'soft',
            loading: isPending.value,
            onClick: handleDelete,
          },
          () => '삭제',
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
  <section class="container mx-auto max-w-5xl">
    <ConsoleTitle
      title="페르소나 관리"
      description="페르소나를 생성, 수정 및 삭제할 수 있습니다."
    />

    <div class="flex justify-between items-center py-4">
      <!-- prettier-ignore -->
      <div class="text-[13px]">
        총 <span class="text-primary font-semibold">{{ (response?.meta.total || 0).toLocaleString() }}</span>개의 페르소나
      </div>
      <UButton color="primary" to="/console/personas/create">
        페르소나 생성
      </UButton>
    </div>
    <UTable
      :data="response?.data || []"
      :columns="columns"
      :loading="isPending"
      empty="등록된 페르소나가 없습니다. 페르소나를 생성해보세요."
    />
    <div class="flex justify-center py-4">
      <UPagination
        v-model:page="currentPage"
        :total="response?.meta.total || 0"
        :items-per-page="itemsPerPage"
        :show-edges="true"
        :show-controls="true"
      />
    </div>
  </section>
</template>
