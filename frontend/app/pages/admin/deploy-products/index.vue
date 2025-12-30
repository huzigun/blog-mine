<script setup lang="ts">
import { useAdminApiFetch, useAdminApi } from '~/composables/useAdminApi';

interface DeployProduct {
  id: number;
  itemId: number;
  name: string;
  tag: string;
  credit: number;
  description: string | null;
  features: string[];
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

definePageMeta({
  layout: 'admin',
  middleware: ['admin'],
});

const toast = useToast();
const overlay = useOverlay();

// 상품 목록 데이터
const {
  data: products,
  status,
  refresh,
} = await useAdminApiFetch<DeployProduct[]>('/admin/deploy-products');

const isLoading = computed(() => status.value === 'pending');

// 테이블 컬럼
const columns = [
  { accessorKey: 'sortOrder', header: '순서' },
  { accessorKey: 'itemId', header: 'Item ID' },
  { accessorKey: 'name', header: '상품명' },
  { accessorKey: 'tag', header: '태그' },
  { accessorKey: 'credit', header: '단가 (BloC)' },
  { accessorKey: 'features', header: '특징' },
  { accessorKey: 'isActive', header: '상태' },
  { accessorKey: 'actions', header: '' },
];

// 활성/비활성 토글
const toggleActive = async (product: DeployProduct) => {
  try {
    await useAdminApi(`/admin/deploy-products/${product.id}/toggle`, {
      method: 'PATCH',
    });
    toast.add({
      title: product.isActive ? '비활성화됨' : '활성화됨',
      description: `${product.name} 상품이 ${product.isActive ? '비활성화' : '활성화'}되었습니다.`,
      color: 'success',
    });
    await refresh();
  } catch (err: any) {
    toast.add({
      title: '상태 변경 실패',
      description: err.message || '상태 변경 중 오류가 발생했습니다.',
      color: 'error',
    });
  }
};

// 상품 삭제
const deleteProduct = async (product: DeployProduct) => {
  const confirmed = await overlay.create(resolveComponent('UConfirmDialog'), {
    title: '상품 삭제',
    description: `'${product.name}' 상품을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`,
    confirmLabel: '삭제',
    cancelLabel: '취소',
    confirmColor: 'error',
  });

  if (!confirmed) return;

  try {
    await useAdminApi(`/admin/deploy-products/${product.id}`, {
      method: 'DELETE',
    });
    toast.add({
      title: '상품 삭제됨',
      description: `${product.name} 상품이 삭제되었습니다.`,
      color: 'success',
    });
    await refresh();
  } catch (err: any) {
    toast.add({
      title: '삭제 실패',
      description: err.message || '삭제 중 오류가 발생했습니다.',
      color: 'error',
    });
  }
};
</script>

<template>
  <div class="space-y-6">
    <!-- 페이지 헤더 -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-neutral-900 dark:text-white">
          배포 상품 관리
        </h1>
        <p class="mt-1 text-sm text-neutral-500">
          배포 요청 시 선택할 수 있는 상품을 관리합니다.
        </p>
      </div>
      <UButton
        color="primary"
        icon="i-heroicons-plus"
        to="/admin/deploy-products/new"
      >
        상품 등록
      </UButton>
    </div>

    <!-- 통계 카드 -->
    <div v-if="products" class="grid grid-cols-2 md:grid-cols-3 gap-4">
      <UCard>
        <div class="text-center">
          <p class="text-2xl font-bold text-neutral-900 dark:text-white">
            {{ products.length }}
          </p>
          <p class="text-sm text-neutral-500">전체 상품</p>
        </div>
      </UCard>
      <UCard>
        <div class="text-center">
          <p class="text-2xl font-bold text-success-600">
            {{ products.filter((p) => p.isActive).length }}
          </p>
          <p class="text-sm text-neutral-500">활성 상품</p>
        </div>
      </UCard>
      <UCard>
        <div class="text-center">
          <p class="text-2xl font-bold text-neutral-600">
            {{ products.filter((p) => !p.isActive).length }}
          </p>
          <p class="text-sm text-neutral-500">비활성 상품</p>
        </div>
      </UCard>
    </div>

    <!-- 상품 목록 -->
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <h3 class="font-semibold">상품 목록</h3>
        </div>
      </template>

      <UTable :columns="columns" :data="products || []" :loading="isLoading">
        <template #sortOrder-cell="{ row }">
          <span class="text-sm font-mono text-neutral-500">
            {{ (row.original as DeployProduct).sortOrder }}
          </span>
        </template>

        <template #itemId-cell="{ row }">
          <span class="text-sm font-mono text-neutral-500">
            {{ (row.original as DeployProduct).itemId }}
          </span>
        </template>

        <template #name-cell="{ row }">
          <div class="flex flex-col">
            <span class="font-medium">{{
              (row.original as DeployProduct).name
            }}</span>
            <span
              v-if="(row.original as DeployProduct).description"
              class="text-xs text-neutral-500 truncate max-w-[200px]"
            >
              {{ (row.original as DeployProduct).description }}
            </span>
          </div>
        </template>

        <template #tag-cell="{ row }">
          <UBadge color="neutral" variant="subtle" size="sm">
            {{ (row.original as DeployProduct).tag }}
          </UBadge>
        </template>

        <template #credit-cell="{ row }">
          <span class="font-mono font-medium text-primary-600">
            {{ (row.original as DeployProduct).credit.toLocaleString() }}
          </span>
        </template>

        <template #features-cell="{ row }">
          <div class="flex flex-col gap-0.5 max-w-[300px]">
            <span
              v-for="(feature, idx) in (row.original as DeployProduct).features.slice(0, 2)"
              :key="idx"
              class="text-xs text-neutral-500 truncate"
            >
              {{ feature }}
            </span>
            <span
              v-if="(row.original as DeployProduct).features.length > 2"
              class="text-xs text-neutral-400"
            >
              외 {{ (row.original as DeployProduct).features.length - 2 }}개
            </span>
          </div>
        </template>

        <template #isActive-cell="{ row }">
          <UBadge
            :color="(row.original as DeployProduct).isActive ? 'success' : 'neutral'"
          >
            {{ (row.original as DeployProduct).isActive ? '활성' : '비활성' }}
          </UBadge>
        </template>

        <template #actions-cell="{ row }">
          <div class="flex items-center gap-1">
            <UButton
              color="neutral"
              variant="ghost"
              size="sm"
              icon="i-heroicons-pencil-square"
              :to="`/admin/deploy-products/${(row.original as DeployProduct).id}`"
            />
            <UButton
              :color="(row.original as DeployProduct).isActive ? 'warning' : 'success'"
              variant="ghost"
              size="sm"
              :icon="(row.original as DeployProduct).isActive ? 'i-heroicons-eye-slash' : 'i-heroicons-eye'"
              @click="toggleActive(row.original as DeployProduct)"
            />
            <UButton
              color="error"
              variant="ghost"
              size="sm"
              icon="i-heroicons-trash"
              @click="deleteProduct(row.original as DeployProduct)"
            />
          </div>
        </template>

        <template #empty-state>
          <div class="flex flex-col items-center justify-center py-12">
            <UIcon
              name="i-heroicons-cube"
              class="w-12 h-12 text-neutral-400 mb-4"
            />
            <p class="text-neutral-500">등록된 상품이 없습니다.</p>
            <UButton
              color="primary"
              variant="soft"
              class="mt-4"
              to="/admin/deploy-products/new"
            >
              첫 상품 등록하기
            </UButton>
          </div>
        </template>
      </UTable>
    </UCard>
  </div>
</template>
