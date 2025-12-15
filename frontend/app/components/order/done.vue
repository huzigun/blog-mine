<script lang="ts" setup>
const props = defineProps<{
  requestId: string | number;
}>();

const emit = defineEmits<{ close: ['status' | 'new'] }>();
</script>

<template>
  <UModal title="배포 신청 완료!" :dismissible="false">
    <template #body>
      <div class="text-center">
        <!-- 성공 아이콘 -->
        <div
          class="mx-auto w-14 h-14 rounded-full bg-success-100 dark:bg-success-900/30 flex items-center justify-center mb-4"
        >
          <UIcon
            name="i-heroicons-check-circle"
            :size="28"
            class="text-success-600"
          />
        </div>

        <!-- 설명 -->
        <p class="text-sm text-neutral-600 dark:text-neutral-400 mb-5">
          배포 신청이 완료되었습니다.
          <br />
          심사는
          <span class="font-semibold text-primary-600">3~4일</span>
          정도 소요되며,
          <br />
          진행 상황은 배포 신청 내역에서 확인할 수 있어요.
        </p>

        <!-- 안내 카드 -->
        <div
          class="p-4 rounded-xl bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 mb-6"
        >
          <div class="flex items-start gap-3 text-left">
            <UIcon
              name="i-heroicons-user-group"
              class="w-5 h-5 text-purple-600 shrink-0 mt-0.5"
            />
            <div>
              <p
                class="text-sm font-semibold text-purple-700 dark:text-purple-300 mb-1"
              >
                전문 에디터 팀이 검수합니다
              </p>
              <p class="text-xs text-purple-600 dark:text-purple-400">
                제출하신 배포 신청은 전문 에디터 팀이 검수하고, 최적의 계정으로
                업로드 작업이 진행됩니다.
              </p>
            </div>
          </div>
        </div>

        <!-- 버튼 그룹 -->
        <div class="flex gap-3">
          <UButton
            color="neutral"
            variant="outline"
            size="lg"
            block
            @click="$emit('close', 'new')"
          >
            <UIcon name="i-heroicons-plus" class="w-4 h-4 mr-1" />
            새 원고 만들기
          </UButton>
          <UButton
            color="primary"
            size="lg"
            block
            class="bg-linear-to-r from-purple-600 to-blue-600"
            @click="$emit('close', 'status')"
          >
            <UIcon name="i-heroicons-eye" class="w-4 h-4 mr-1" />
            배포 진행상황 보기
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>
