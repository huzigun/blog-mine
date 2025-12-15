<script lang="ts" setup>
const props = defineProps<{
  completedPostCount: number;
}>();

const emit = defineEmits<{ close: [boolean] }>();
</script>

<template>
  <UModal title="원고 생성 요청 완료!" :dismissible="false">
    <template #body>
      <div class="text-center">
        <!-- 성공 아이콘 -->
        <div
          class="mx-auto w-12 h-12 rounded-full bg-success-100 dark:bg-success-900/30 flex items-center justify-center mb-4"
        >
          <UIcon
            name="i-heroicons-check-circle"
            :size="24"
            class="text-success-600"
          />
        </div>

        <!-- 설명 -->
        <p class="text-sm text-neutral-600 dark:text-neutral-400 mb-6">
          <span class="font-semibold text-primary-600">
            {{ completedPostCount }}개
          </span>
          의 원고 생성이 시작되었습니다.
          <br />
          진행 상황은 원고 목록에서 확인하실 수 있습니다.
        </p>

        <!-- 안내 카드 -->
        <div
          class="p-4 rounded-xl bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 mb-6"
        >
          <div class="flex items-start gap-3 text-left">
            <UIcon
              name="i-heroicons-rocket-launch"
              class="w-5 h-5 text-purple-600 shrink-0 mt-0.5"
            />
            <div>
              <p
                class="text-sm font-semibold text-purple-700 dark:text-purple-300 mb-1"
              >
                원고 배포가 필요하신가요?
              </p>
              <p class="text-xs text-purple-600 dark:text-purple-400">
                생성된 원고를 블로그에 배포하려면 발주 신청을 진행해주세요.
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
            @click="$emit('close', false)"
          >
            계속 생성
          </UButton>
          <UButton
            color="primary"
            size="lg"
            block
            class="bg-linear-to-r from-purple-600 to-blue-600"
            @click="$emit('close', true)"
          >
            <UIcon name="i-heroicons-rocket-launch" class="w-4 h-4 mr-1" />
            원고 배포 신청
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>
