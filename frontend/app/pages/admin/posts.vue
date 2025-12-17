<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: ['admin'],
})

// 블로그 포스트 목록 (추후 API 연동)
const posts = ref<any[]>([])
const isLoading = ref(false)

const columns = [
  { accessorKey: 'id', header: 'ID' },
  { accessorKey: 'title', header: '제목' },
  { accessorKey: 'user', header: '작성자' },
  { accessorKey: 'status', header: '상태' },
  { accessorKey: 'createdAt', header: '생성일' },
  { accessorKey: 'actions', header: '' },
]
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold text-neutral-900 dark:text-white">블로그 포스트</h1>
      <p class="mt-1 text-sm text-neutral-500">
        생성된 블로그 포스트를 조회합니다.
      </p>
    </div>

    <UCard>
      <div class="flex flex-col sm:flex-row gap-4">
        <UInput
          placeholder="제목 또는 작성자로 검색..."
          icon="i-heroicons-magnifying-glass"
          class="flex-1"
        />
        <UButton color="primary">검색</UButton>
      </div>
    </UCard>

    <UCard>
      <UTable :columns="columns" :rows="posts" :loading="isLoading">
        <template #empty-state>
          <div class="flex flex-col items-center justify-center py-12">
            <UIcon name="i-heroicons-document-text" class="w-12 h-12 text-neutral-400 mb-4" />
            <p class="text-neutral-500">블로그 포스트가 없습니다.</p>
          </div>
        </template>
      </UTable>
    </UCard>
  </div>
</template>
