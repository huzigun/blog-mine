<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: ['admin'],
})

const { hasMinRole } = useAdminAuth()

if (!hasMinRole('ADMIN')) {
  throw createError({
    statusCode: 403,
    statusMessage: '관리자 이상 권한이 필요합니다.',
  })
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold text-neutral-900 dark:text-white">시스템 설정</h1>
      <p class="mt-1 text-sm text-neutral-500">
        시스템 설정을 관리합니다.
      </p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- 일반 설정 -->
      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold">일반 설정</h3>
        </template>

        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="font-medium">서비스 점검 모드</p>
              <p class="text-sm text-neutral-500">
                활성화 시 사용자가 서비스에 접근할 수 없습니다.
              </p>
            </div>
            <USwitch />
          </div>

          <div class="flex items-center justify-between">
            <div>
              <p class="font-medium">신규 가입 허용</p>
              <p class="text-sm text-neutral-500">
                비활성화 시 신규 회원가입이 제한됩니다.
              </p>
            </div>
            <USwitch model-value />
          </div>
        </div>
      </UCard>

      <!-- 알림 설정 -->
      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold">알림 설정</h3>
        </template>

        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="font-medium">이메일 알림</p>
              <p class="text-sm text-neutral-500">
                시스템 이벤트 발생 시 이메일 발송
              </p>
            </div>
            <USwitch model-value />
          </div>

          <div class="flex items-center justify-between">
            <div>
              <p class="font-medium">결제 알림</p>
              <p class="text-sm text-neutral-500">
                결제 발생 시 관리자에게 알림
              </p>
            </div>
            <USwitch model-value />
          </div>
        </div>
      </UCard>

      <!-- 구독 설정 -->
      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold">구독 설정</h3>
        </template>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-2">체험판 기간 (일)</label>
            <UInput type="number" model-value="7" />
          </div>
          <div>
            <label class="block text-sm font-medium mb-2">체험판 크레딧</label>
            <UInput type="number" model-value="10" />
          </div>
        </div>
      </UCard>

      <!-- 크레딧 설정 -->
      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold">크레딧 설정</h3>
        </template>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-2">포스트 생성 비용 (크레딧)</label>
            <UInput type="number" model-value="1" />
          </div>
          <div>
            <label class="block text-sm font-medium mb-2">최소 충전 금액 (원)</label>
            <UInput type="number" model-value="10000" />
          </div>
        </div>
      </UCard>
    </div>

    <div class="flex justify-end">
      <UButton color="primary" size="lg">설정 저장</UButton>
    </div>
  </div>
</template>
