<script lang="ts" setup>
definePageMeta({
  layout: 'default',
  middleware: ['auth'],
});

const toast = useToast();

// 크레딧 잔액 타입 정의
interface CreditBalance {
  totalCredits: number;
  subscriptionCredits: number;
  purchasedCredits: number;
  bonusCredits: number;
}

// 크레딧 충전 패키지
const creditPackages = [
  { credits: 10, price: 1000, popular: false },
  { credits: 50, price: 5000, popular: true },
  { credits: 100, price: 10000, popular: false },
];

// 누적 충전 수량
const totalCreditsToCharge = ref<number>(0);

// 크레딧 잔액
const { data: balance, refresh: refreshBalance } =
  await useAsyncData<CreditBalance>('credit-balance', () =>
    useApi<CreditBalance>('/credits/balance'),
  );

// 충전 중 상태
const isPurchasing = ref(false);

// 패키지 추가 (누적)
const addCredits = (credits: number) => {
  totalCreditsToCharge.value += credits;
};

// 초기화
const resetSelection = () => {
  totalCreditsToCharge.value = 0;
};

// 총 금액 계산
const totalPrice = computed(() => {
  return totalCreditsToCharge.value * 100;
});

// 충전할 크레딧 수
const creditsToCharge = computed(() => {
  return totalCreditsToCharge.value;
});

// 충전 실행
const handlePurchase = async () => {
  if (creditsToCharge.value <= 0) {
    toast.add({
      title: '오류',
      description: '충전할 크레딧 수량을 선택해주세요.',
      color: 'error',
    });
    return;
  }

  isPurchasing.value = true;
  try {
    const result = await useApi('/credits/purchase', {
      method: 'POST',
      body: {
        amount: creditsToCharge.value,
      },
    });

    toast.add({
      title: '충전 완료',
      description: `${creditsToCharge.value}개의 크레딧이 충전되었습니다.`,
      color: 'success',
    });

    // 잔액 새로고침
    await refreshBalance();

    // 선택 초기화
    resetSelection();
  } catch (error: any) {
    const errorMessage = useApiError(error, '크레딧 충전에 실패했습니다.');
    toast.add({
      title: '충전 실패',
      description: errorMessage,
      color: 'error',
    });
  } finally {
    isPurchasing.value = false;
  }
};

// 포맷팅 함수
const formatNumber = (num: number) => {
  return new Intl.NumberFormat('ko-KR').format(num);
};
</script>

<template>
  <div class="container mx-auto px-4 py-8 max-w-6xl">
    <!-- 헤더 -->
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-neutral-900 dark:text-white mb-2">
        BloC 충전
      </h1>
      <p class="text-neutral-600 dark:text-neutral-400">
        BloC(크레딧)을 충전하여 다양한 서비스를 이용하세요
      </p>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- 왼쪽: 충전 옵션 -->
      <div class="lg:col-span-2 space-y-6">
        <!-- 현재 잔액 -->
        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon
                name="i-heroicons-wallet"
                class="text-primary"
                :size="24"
              />
              <h2 class="text-xl font-semibold">현재 BloC 잔액</h2>
            </div>
          </template>

          <div class="text-center py-6">
            <div class="flex justify-center gap-x-4 items-end">
              <div class="text-5xl font-bold text-primary">
                {{ formatNumber(balance?.totalCredits || 0) }}
              </div>
              <div class="text-neutral-600 dark:text-neutral-400 mb-1">
                BloC
              </div>
            </div>
            <div class="mt-4 grid grid-cols-3 gap-4 text-sm">
              <div
                class="p-3 bg-neutral-50 dark:bg-neutral-900 rounded-lg text-center"
              >
                <div class="font-semibold text-neutral-900 dark:text-white">
                  {{ formatNumber(balance?.subscriptionCredits || 0) }}
                </div>
                <div class="text-xs text-neutral-500 mt-1">구독</div>
              </div>
              <div
                class="p-3 bg-neutral-50 dark:bg-neutral-900 rounded-lg text-center"
              >
                <div class="font-semibold text-neutral-900 dark:text-white">
                  {{ formatNumber(balance?.purchasedCredits || 0) }}
                </div>
                <div class="text-xs text-neutral-500 mt-1">구매</div>
              </div>
              <div
                class="p-3 bg-neutral-50 dark:bg-neutral-900 rounded-lg text-center"
              >
                <div class="font-semibold text-neutral-900 dark:text-white">
                  {{ formatNumber(balance?.bonusCredits || 0) }}
                </div>
                <div class="text-xs text-neutral-500 mt-1">보너스</div>
              </div>
            </div>
          </div>
        </UCard>

        <!-- 충전 패키지 -->
        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-heroicons-gift" class="text-primary" :size="24" />
              <h2 class="text-xl font-semibold">충전 패키지</h2>
            </div>
          </template>

          <div class="space-y-4">
            <!-- 패키지 버튼들 -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                v-for="pkg in creditPackages"
                :key="pkg.credits"
                class="relative p-6 border-2 rounded-lg transition-all hover:shadow-lg border-neutral-200 dark:border-neutral-800 hover:border-primary/50 active:scale-95"
                @click="addCredits(pkg.credits)"
              >
                <!-- 인기 뱃지 -->
                <div
                  v-if="pkg.popular"
                  class="absolute -top-2 right-4 px-2 py-1 bg-primary text-white text-xs font-semibold rounded-full"
                >
                  인기
                </div>

                <div class="text-center">
                  <div class="flex items-center justify-center gap-2 mb-2">
                    <UIcon
                      name="i-heroicons-plus-circle"
                      class="text-primary"
                      :size="24"
                    />
                    <div class="text-3xl font-bold text-primary">
                      {{ formatNumber(pkg.credits) }}
                    </div>
                    <div
                      class="text-sm text-neutral-600 dark:text-neutral-400 mt-1"
                    >
                      BloC
                    </div>
                  </div>
                  <div
                    class="text-2xl font-bold text-neutral-900 dark:text-white"
                  >
                    {{ formatNumber(pkg.price) }}원
                  </div>
                </div>
              </button>
            </div>

            <!-- 현재 선택된 수량 표시 -->
            <div
              v-if="totalCreditsToCharge > 0"
              class="p-4 bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-lg"
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <UIcon
                    name="i-heroicons-shopping-cart"
                    class="text-primary"
                    :size="20"
                  />
                  <span class="font-semibold text-neutral-900 dark:text-white">
                    선택된 수량
                  </span>
                </div>
                <div class="flex items-center gap-3">
                  <span class="text-2xl font-bold text-primary">
                    {{ formatNumber(totalCreditsToCharge) }} BloC
                  </span>
                  <UButton
                    color="neutral"
                    variant="outline"
                    size="sm"
                    @click="resetSelection"
                    icon="i-heroicons-arrow-path"
                  >
                    초기화
                  </UButton>
                </div>
              </div>
              <div class="mt-2 text-right">
                <span class="text-sm text-neutral-600 dark:text-neutral-400">
                  총 금액:
                </span>
                <span class="ml-2 text-xl font-bold text-primary">
                  {{ formatNumber(totalPrice) }}원
                </span>
              </div>
            </div>

            <!-- 안내 -->
            <UAlert
              color="warning"
              variant="subtle"
              title="원하는 패키지를 클릭하여 수량을 추가하세요 (1 BloC = 100원)"
              icon="i-heroicons-information-circle"
            />
          </div>
        </UCard>
      </div>

      <!-- 오른쪽: 주문 요약 -->
      <div class="lg:col-span-1">
        <UCard class="sticky top-4">
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon
                name="i-heroicons-shopping-cart"
                class="text-primary"
                :size="24"
              />
              <h2 class="text-xl font-semibold">주문 요약</h2>
            </div>
          </template>

          <div class="space-y-4">
            <!-- 선택된 항목 -->
            <div
              v-if="creditsToCharge > 0"
              class="p-4 bg-neutral-50 dark:bg-neutral-900 rounded-lg"
            >
              <div class="flex justify-between items-center mb-2">
                <span class="text-neutral-600 dark:text-neutral-400">
                  충전 BloC
                </span>
                <span class="font-semibold text-neutral-900 dark:text-white">
                  {{ formatNumber(creditsToCharge) }} BloC
                </span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-neutral-600 dark:text-neutral-400">금액</span>
                <span class="font-semibold text-neutral-900 dark:text-white">
                  {{ formatNumber(totalPrice) }}원
                </span>
              </div>
            </div>

            <div
              v-else
              class="p-4 bg-neutral-50 dark:bg-neutral-900 rounded-lg text-center text-neutral-500"
            >
              충전할 패키지를 선택해주세요
            </div>

            <div
              class="border-t border-neutral-200 dark:border-neutral-800 pt-4"
            >
              <div class="flex justify-between items-center mb-4">
                <span
                  class="text-lg font-semibold text-neutral-900 dark:text-white"
                >
                  총 결제 금액
                </span>
                <span class="text-2xl font-bold text-primary">
                  {{ formatNumber(totalPrice) }}원
                </span>
              </div>

              <UButton
                color="primary"
                size="lg"
                block
                :disabled="creditsToCharge <= 0 || isPurchasing"
                :loading="isPurchasing"
                @click="handlePurchase"
              >
                <template v-if="isPurchasing">충전 중...</template>
                <template v-else>
                  {{ formatNumber(creditsToCharge) }} BloC 충전하기
                </template>
              </UButton>
            </div>

            <!-- 안내사항 -->
            <div
              class="p-3 bg-info/5 dark:bg-info/10 border border-info/20 rounded-lg text-xs text-neutral-600 dark:text-neutral-400"
            >
              <div class="flex items-start gap-2">
                <UIcon
                  name="i-heroicons-information-circle"
                  class="text-info shrink-0 mt-0.5"
                  :size="16"
                />
                <div class="space-y-1">
                  <p>• 충전된 BloC는 환불이 불가능합니다.</p>
                  <p>• 소모 순서: 보너스 → 구독 → 구매 BloC</p>
                  <p>• 결제는 안전하게 암호화되어 처리됩니다.</p>
                </div>
              </div>
            </div>
          </div>
        </UCard>
      </div>
    </div>
  </div>
</template>
