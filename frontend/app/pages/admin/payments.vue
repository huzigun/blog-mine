<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: ['admin'],
})

const { hasMinRole } = useAdminAuth()

if (!hasMinRole('SUPPORT')) {
  throw createError({
    statusCode: 403,
    statusMessage: '접근 권한이 없습니다.',
  })
}

// 결제 목록 (추후 API 연동)
const payments = ref<any[]>([])
const isLoading = ref(false)

const columns = [
  { accessorKey: 'id', header: 'ID' },
  { accessorKey: 'user', header: '사용자' },
  { accessorKey: 'amount', header: '금액' },
  { accessorKey: 'type', header: '유형' },
  { accessorKey: 'status', header: '상태' },
  { accessorKey: 'createdAt', header: '결제일' },
  { accessorKey: 'actions', header: '' },
]
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold text-neutral-900 dark:text-white">결제 내역</h1>
      <p class="mt-1 text-sm text-neutral-500">
        모든 결제 내역을 조회합니다.
      </p>
    </div>

    <UCard>
      <div class="flex flex-col sm:flex-row gap-4">
        <UInput
          placeholder="사용자 이메일로 검색..."
          icon="i-heroicons-magnifying-glass"
          class="flex-1"
        />
        <UButton color="primary">검색</UButton>
      </div>
    </UCard>

    <UCard>
      <UTable :columns="columns" :rows="payments" :loading="isLoading">
        <template #empty-state>
          <div class="flex flex-col items-center justify-center py-12">
            <UIcon name="i-heroicons-banknotes" class="w-12 h-12 text-neutral-400 mb-4" />
            <p class="text-neutral-500">결제 내역이 없습니다.</p>
          </div>
        </template>
      </UTable>
    </UCard>
  </div>
</template>
