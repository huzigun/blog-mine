<script setup lang="ts">
// BloC 충전 탭의 스켈레톤 UI
</script>

<template>
  <div class="py-6">
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- 왼쪽: 충전 옵션 스켈레톤 -->
      <div class="lg:col-span-2 space-y-6">
        <!-- 현재 잔액 카드 스켈레톤 -->
        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <USkeleton class="h-6 w-6" />
              <USkeleton class="h-6 w-40" />
            </div>
          </template>

          <div class="text-center py-6">
            <!-- 잔액 숫자 -->
            <div class="flex justify-center gap-x-4 items-end mb-4">
              <USkeleton class="h-12 w-32" />
              <USkeleton class="h-6 w-16 mb-1" />
            </div>

            <!-- 잔액 상세 -->
            <div class="mt-4 grid grid-cols-3 gap-4">
              <div class="p-3 bg-neutral-50 dark:bg-neutral-900 rounded-lg">
                <USkeleton class="h-5 w-16 mx-auto mb-1" />
                <USkeleton class="h-3 w-12 mx-auto" />
              </div>
              <div class="p-3 bg-neutral-50 dark:bg-neutral-900 rounded-lg">
                <USkeleton class="h-5 w-16 mx-auto mb-1" />
                <USkeleton class="h-3 w-12 mx-auto" />
              </div>
              <div class="p-3 bg-neutral-50 dark:bg-neutral-900 rounded-lg">
                <USkeleton class="h-5 w-16 mx-auto mb-1" />
                <USkeleton class="h-3 w-12 mx-auto" />
              </div>
            </div>
          </div>
        </UCard>

        <!-- 충전 패키지 카드 스켈레톤 -->
        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <USkeleton class="h-6 w-6" />
              <USkeleton class="h-6 w-32" />
            </div>
          </template>

          <div class="space-y-4">
            <!-- 패키지 버튼들 -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div
                v-for="i in 3"
                :key="i"
                class="p-6 border-2 border-neutral-200 dark:border-neutral-800 rounded-lg"
              >
                <div class="text-center space-y-2">
                  <USkeleton class="h-8 w-24 mx-auto" />
                  <USkeleton class="h-6 w-20 mx-auto" />
                </div>
              </div>
            </div>

            <!-- 안내 메시지 -->
            <div class="p-4 bg-info/5 rounded-lg">
              <USkeleton class="h-4 w-full" />
            </div>
          </div>
        </UCard>
      </div>

      <!-- 오른쪽: 주문 요약 스켈레톤 -->
      <div class="lg:col-span-1">
        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <USkeleton class="h-6 w-6" />
              <USkeleton class="h-6 w-24" />
            </div>
          </template>

          <div class="space-y-4">
            <!-- 선택된 항목 -->
            <div class="p-4 bg-neutral-50 dark:bg-neutral-900 rounded-lg">
              <div class="space-y-2">
                <div class="flex justify-between">
                  <USkeleton class="h-4 w-20" />
                  <USkeleton class="h-4 w-24" />
                </div>
                <div class="flex justify-between">
                  <USkeleton class="h-4 w-16" />
                  <USkeleton class="h-4 w-20" />
                </div>
              </div>
            </div>

            <!-- 총 결제 금액 -->
            <div class="border-t border-neutral-200 dark:border-neutral-800 pt-4">
              <div class="flex justify-between items-center mb-4">
                <USkeleton class="h-5 w-24" />
                <USkeleton class="h-7 w-28" />
              </div>

              <!-- 충전 버튼 -->
              <USkeleton class="h-10 w-full rounded-lg" />
            </div>

            <!-- 안내사항 -->
            <div class="p-3 bg-info/5 rounded-lg">
              <USkeleton class="h-3 w-full mb-2" />
              <USkeleton class="h-3 w-4/5 mb-2" />
              <USkeleton class="h-3 w-full" />
            </div>
          </div>
        </UCard>
      </div>
    </div>
  </div>
</template>
