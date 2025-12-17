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

// 구독 목록 (추후 API 연동)
const subscriptions = ref<any[]>([])
const isLoading = ref(false)
const statusFilter = ref('all')

const columns = [
  { accessorKey: 'id', header: 'ID' },
  { accessorKey: 'user', header: '사용자' },
  { accessorKey: 'plan', header: '플랜' },
  { accessorKey: 'status', header: '상태' },
  { accessorKey: 'startedAt', header: '시작일' },
  { accessorKey: 'expiresAt', header: '만료일' },
  { accessorKey: 'actions', header: '' },
]

const statusOptions = [
  { label: '전체', value: 'all' },
  { label: '활성', value: 'ACTIVE' },
  { label: '체험중', value: 'TRIAL' },
  { label: '만료됨', value: 'EXPIRED' },
  { label: '취소됨', value: 'CANCELED' },
]
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold text-neutral-900 dark:text-white">구독 관리</h1>
      <p class="mt-1 text-sm text-neutral-500">
        사용자 구독을 관리합니다.
      </p>
    </div>

    <UCard>
      <div class="flex flex-col sm:flex-row gap-4">
        <USelect v-model="statusFilter" :options="statusOptions" class="w-40" />
        <UInput
          placeholder="사용자 이메일로 검색..."
          icon="i-heroicons-magnifying-glass"
          class="flex-1"
        />
        <UButton color="primary">검색</UButton>
      </div>
    </UCard>

    <UCard>
      <UTable :columns="columns" :rows="subscriptions" :loading="isLoading">
        <template #empty-state>
          <div class="flex flex-col items-center justify-center py-12">
            <UIcon name="i-heroicons-credit-card" class="w-12 h-12 text-neutral-400 mb-4" />
            <p class="text-neutral-500">구독 내역이 없습니다.</p>
          </div>
        </template>
      </UTable>
    </UCard>
  </div>
</template>
