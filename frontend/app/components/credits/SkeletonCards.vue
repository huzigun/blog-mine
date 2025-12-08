<script setup lang="ts">
// 카드 관리 탭의 스켈레톤 UI
</script>

<template>
  <div class="py-6">
    <div class="space-y-6">
      <!-- 헤더 섹션 -->
      <div class="flex items-center justify-between">
        <div>
          <USkeleton class="h-8 w-32 mb-2" />
          <USkeleton class="h-4 w-64" />
        </div>
        <USkeleton class="h-10 w-32 rounded-lg" />
      </div>

      <!-- 카드 목록 -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <UCard v-for="i in 3" :key="i">
          <div class="space-y-4">
            <!-- 카드 회사 로고 -->
            <div class="flex items-center justify-between">
              <USkeleton class="h-8 w-24" />
              <USkeleton class="h-6 w-16" />
            </div>

            <!-- 카드 번호 -->
            <USkeleton class="h-6 w-full" />

            <!-- 카드 정보 -->
            <div class="flex items-center justify-between text-sm">
              <USkeleton class="h-4 w-20" />
              <USkeleton class="h-4 w-24" />
            </div>

            <!-- 액션 버튼들 -->
            <div class="flex gap-2 pt-2">
              <USkeleton class="h-8 flex-1 rounded-lg" />
              <USkeleton class="h-8 w-20 rounded-lg" />
            </div>
          </div>
        </UCard>
      </div>

      <!-- 카드가 없을 때 안내 -->
      <div class="text-center py-12">
        <USkeleton class="h-12 w-12 rounded-full mx-auto mb-4" />
        <USkeleton class="h-6 w-48 mx-auto mb-2" />
        <USkeleton class="h-4 w-64 mx-auto" />
      </div>
    </div>
  </div>
</template>
