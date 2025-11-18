<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
});

const auth = useAuth();

// 구독 정보 가져오기
const subscription = computed(() => auth.subscription);
const plan = computed(() => subscription.value?.plan);

// 대시보드로 이동
const goToDashboard = () => {
  navigateTo('/console/dashboard');
};

// 마이페이지로 이동
const goToProfile = () => {
  navigateTo('/mypage/profile');
};
</script>

<template>
  <div class="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4">
    <div class="max-w-2xl w-full">
      <UCard>
        <div class="text-center space-y-6 py-8">
          <!-- 성공 아이콘 -->
          <div class="flex justify-center">
            <div
              class="w-20 h-20 rounded-full bg-success/10 dark:bg-success/20 flex items-center justify-center"
            >
              <div class="i-heroicons-check-circle-solid text-5xl text-success" />
            </div>
          </div>

          <!-- 메시지 -->
          <div class="space-y-2">
            <h1 class="text-3xl font-bold">구독이 완료되었습니다!</h1>
            <p class="text-neutral-600 dark:text-neutral-400">
              {{ plan?.displayName }} 플랜 구독이 성공적으로 처리되었습니다.
            </p>
          </div>

          <!-- 구독 정보 -->
          <div v-if="subscription" class="bg-neutral-50 dark:bg-neutral-900 rounded-lg p-6">
            <div class="space-y-4">
              <div class="flex items-center justify-between text-sm">
                <span class="text-neutral-600 dark:text-neutral-400">플랜</span>
                <span class="font-semibold">{{ plan?.displayName }}</span>
              </div>

              <div class="flex items-center justify-between text-sm">
                <span class="text-neutral-600 dark:text-neutral-400">월 BloC</span>
                <span class="font-semibold">{{ plan?.monthlyCredits?.toLocaleString() }}개</span>
              </div>

              <div class="flex items-center justify-between text-sm">
                <span class="text-neutral-600 dark:text-neutral-400">구독 상태</span>
                <UBadge
                  :color="subscription.status === 'ACTIVE' ? 'success' : 'neutral'"
                  variant="soft"
                >
                  {{ subscription.status === 'ACTIVE' ? '활성' : subscription.status }}
                </UBadge>
              </div>

              <div
                v-if="subscription.expiresAt"
                class="flex items-center justify-between text-sm"
              >
                <span class="text-neutral-600 dark:text-neutral-400">다음 결제일</span>
                <span class="font-semibold">
                  {{ new Date(subscription.expiresAt).toLocaleDateString('ko-KR') }}
                </span>
              </div>
            </div>
          </div>

          <!-- 다음 단계 안내 -->
          <div class="border-t border-neutral-200 dark:border-neutral-800 pt-6">
            <h2 class="text-lg font-semibold mb-4">다음 단계</h2>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div class="text-center p-4 bg-neutral-50 dark:bg-neutral-900 rounded-lg">
                <div class="i-heroicons-document-text text-2xl text-primary mx-auto mb-2" />
                <p class="font-medium mb-1">원고 작성</p>
                <p class="text-xs text-neutral-600 dark:text-neutral-400">
                  AI로 블로그 포스트 생성
                </p>
              </div>

              <div class="text-center p-4 bg-neutral-50 dark:bg-neutral-900 rounded-lg">
                <div class="i-heroicons-user-circle text-2xl text-primary mx-auto mb-2" />
                <p class="font-medium mb-1">페르소나 설정</p>
                <p class="text-xs text-neutral-600 dark:text-neutral-400">
                  브랜드 맞춤 페르소나
                </p>
              </div>

              <div class="text-center p-4 bg-neutral-50 dark:bg-neutral-900 rounded-lg">
                <div class="i-heroicons-chart-bar text-2xl text-primary mx-auto mb-2" />
                <p class="font-medium mb-1">키워드 추적</p>
                <p class="text-xs text-neutral-600 dark:text-neutral-400">
                  검색량 트렌드 분석
                </p>
              </div>
            </div>
          </div>

          <!-- 액션 버튼 -->
          <div class="flex flex-col sm:flex-row gap-3 justify-center pt-4">
            <UButton
              color="primary"
              size="lg"
              icon="i-heroicons-home"
              @click="goToDashboard"
            >
              대시보드로 이동
            </UButton>
            <UButton
              color="neutral"
              variant="outline"
              size="lg"
              icon="i-heroicons-user"
              @click="goToProfile"
            >
              구독 관리
            </UButton>
          </div>

          <!-- 추가 안내 -->
          <div class="text-xs text-neutral-500 dark:text-neutral-400 pt-4">
            <p>• 구독은 언제든지 마이페이지에서 관리할 수 있습니다.</p>
            <p>• 결제 내역은 이메일로 발송되었습니다.</p>
            <p>• 문의사항은 고객센터로 연락해주세요.</p>
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>
