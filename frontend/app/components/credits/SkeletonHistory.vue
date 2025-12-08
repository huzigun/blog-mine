<script setup lang="ts">
// 결제 내역 탭의 스켈레톤 UI
</script>

<template>
  <div class="py-6">
    <div class="space-y-6">
      <!-- 검색 및 필터 섹션 -->
      <UCard>
        <div class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
            <!-- 검색 -->
            <USkeleton class="h-10 w-full rounded-lg" />
            <!-- 상태 필터 -->
            <USkeleton class="h-10 w-full rounded-lg" />
            <!-- 시작일 -->
            <USkeleton class="h-10 w-full rounded-lg" />
            <!-- 종료일 -->
            <USkeleton class="h-10 w-full rounded-lg" />
          </div>
          <div class="flex gap-2">
            <USkeleton class="h-9 w-20 rounded-lg" />
            <USkeleton class="h-9 w-20 rounded-lg" />
          </div>
        </div>
      </UCard>

      <!-- 테이블 -->
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <USkeleton class="h-6 w-32" />
            <USkeleton class="h-5 w-24" />
          </div>
        </template>

        <!-- 테이블 헤더 -->
        <div class="border-b border-neutral-200 dark:border-neutral-800 pb-3 mb-3">
          <div class="grid grid-cols-6 gap-4">
            <USkeleton class="h-4 w-20" />
            <USkeleton class="h-4 w-24" />
            <USkeleton class="h-4 w-16" />
            <USkeleton class="h-4 w-20" />
            <USkeleton class="h-4 w-16" />
            <USkeleton class="h-4 w-16" />
          </div>
        </div>

        <!-- 테이블 본문 -->
        <div class="space-y-3">
          <div
            v-for="i in 5"
            :key="i"
            class="grid grid-cols-6 gap-4 py-3 border-b border-neutral-100 dark:border-neutral-900"
          >
            <USkeleton class="h-4 w-16" />
            <USkeleton class="h-4 w-32" />
            <USkeleton class="h-4 w-20" />
            <USkeleton class="h-4 w-24" />
            <USkeleton class="h-5 w-16" />
            <USkeleton class="h-8 w-20 rounded" />
          </div>
        </div>

        <template #footer>
          <!-- 페이지네이션 -->
          <div class="flex items-center justify-between">
            <USkeleton class="h-4 w-32" />
            <div class="flex gap-2">
              <USkeleton class="h-8 w-8 rounded" />
              <USkeleton class="h-8 w-8 rounded" />
              <USkeleton class="h-8 w-8 rounded" />
              <USkeleton class="h-8 w-8 rounded" />
            </div>
          </div>
        </template>
      </UCard>
    </div>
  </div>
</template>
