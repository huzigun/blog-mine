<script lang="ts" setup>
import { CardForm, PaymentConfirmModal } from '#components';

definePageMeta({
  layout: 'default',
  middleware: ['auth'],
});

const toast = useToast();
const router = useRouter();
const overlay = useOverlay();
const cardFormModal = overlay.create(CardForm);
const paymentConfirmModal = overlay.create(PaymentConfirmModal);

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
const { data: balance, refresh: refreshBalance, pending: balanceLoading } =
  await useAsyncData<CreditBalance>('credit-balance', () =>
    useApi<CreditBalance>('/credits/balance'),
  );

// 등록된 카드 목록 조회
const {
  data: cards,
  refresh: refreshCards,
  pending: cardsLoading,
} = await useApiFetch<Card[]>('/cards', {
  // @ts-ignore
  default: () => [] as Card[],
  lazy: true,
});

// 카드 등록 여부
const hasRegisteredCard = computed(() => cards.value && cards.value.length > 0);

// 충전 중 상태
const isPurchasing = ref(false);

// 카드 등록 모달 열기
const openCardRegistration = async () => {
  const instance = cardFormModal.open({
    existingCardsCount: cards.value?.length || 0,
  });

  const result = (await instance.result) as boolean;

  if (result) {
    // 카드 등록 성공 시 카드 목록 새로고침
    await refreshCards();

    toast.add({
      title: '카드 등록 완료',
      description: '이제 BloC를 충전할 수 있습니다.',
      color: 'success',
    });
  }
};

// 카드 관리 페이지로 이동
const goToCardManagement = () => {
  router.push('/mypage/credits/cards');
};

// 패키지 추가 (누적)
const addCredits = (credits: number) => {
  // 카드 미등록 시 카드 등록 유도
  if (!hasRegisteredCard.value) {
    toast.add({
      title: '카드 등록 필요',
      description: '크레딧 충전을 위해 먼저 카드를 등록해주세요.',
      color: 'warning',
    });

    // 카드 등록 모달 자동 오픈
    openCardRegistration();
    return;
  }

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
  // 카드 미등록 시 카드 등록 유도
  if (!hasRegisteredCard.value) {
    toast.add({
      title: '카드 등록 필요',
      description: '결제를 위해 먼저 카드를 등록해주세요.',
      color: 'warning',
    });

    // 카드 등록 모달 자동 오픈
    openCardRegistration();
    return;
  }

  if (creditsToCharge.value <= 0) {
    toast.add({
      title: '오류',
      description: '충전할 크레딧 수량을 선택해주세요.',
      color: 'error',
    });
    return;
  }

  // 결제 확인 모달 표시
  const instance = paymentConfirmModal.open({
    amount: totalPrice.value,
    description: 'BloC 크레딧 충전',
    itemName: `${formatNumber(creditsToCharge.value)} BloC`,
  });

  const confirmed = await instance.result;
  if (!confirmed) return;

  isPurchasing.value = true;
  try {
    await useApi('/credits/purchase', {
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
  <CreditsLayout>
    <!-- 로딩 스켈레톤 -->
    <CreditsSkeletonCharge v-if="balanceLoading" />

    <!-- 실제 콘텐츠 -->
    <div v-else>
      <!-- 테스트 결제 안내 배너 -->
      <UAlert
        color="warning"
        variant="subtle"
        icon="i-heroicons-exclamation-triangle"
        class="mb-6"
      >
        <template #title>
          <span class="font-semibold">테스트 결제 안내</span>
        </template>
        <template #description>
          <p>
            현재 테스트 모드로 운영 중입니다. 결제된 금액은
            <span class="font-semibold text-warning">매일 밤 11시에 자동으로 환불</span>
            됩니다.
          </p>
        </template>
      </UAlert>

      <!-- 카드 미등록 안내 배너 -->
      <UAlert
        v-if="!hasRegisteredCard && !cardsLoading"
        color="warning"
        variant="subtle"
        title="카드 등록이 필요합니다"
        description="크레딧 충전을 위해 먼저 결제 카드를 등록해주세요."
        icon="i-heroicons-credit-card"
        class="mb-6"
      >
        <template #actions>
          <UButton
            color="warning"
            variant="solid"
            size="sm"
            @click="openCardRegistration"
            icon="i-heroicons-plus"
          >
            카드 등록하기
          </UButton>
          <UButton
            color="neutral"
            variant="outline"
            size="sm"
            @click="goToCardManagement"
            icon="i-heroicons-arrow-right"
          >
            카드 관리 페이지
          </UButton>
        </template>
      </UAlert>

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
                  :class="[
                    'relative p-6 border-2 rounded-lg transition-all hover:shadow-lg active:scale-95',
                    hasRegisteredCard
                      ? 'border-neutral-200 dark:border-neutral-800 hover:border-primary/50'
                      : 'border-neutral-200 dark:border-neutral-800 opacity-60 cursor-not-allowed',
                  ]"
                  :disabled="!hasRegisteredCard"
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
                    <div class="text-2xl font-bold text-neutral-900 dark:text-white">
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
                :color="hasRegisteredCard ? 'info' : 'warning'"
                variant="subtle"
                :title="
                  hasRegisteredCard
                    ? '원하는 패키지를 클릭하여 수량을 추가하세요 (1 BloC = 100원)'
                    : '크레딧 충전을 위해 먼저 카드를 등록해주세요'
                "
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
                  <span class="text-neutral-600 dark:text-neutral-400">
                    금액
                  </span>
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
                  :disabled="
                    creditsToCharge <= 0 || isPurchasing || !hasRegisteredCard
                  "
                  :loading="isPurchasing"
                  @click="handlePurchase"
                >
                  <template v-if="!hasRegisteredCard">
                    카드 등록 후 충전 가능
                  </template>
                  <template v-else-if="isPurchasing">충전 중...</template>
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
  </CreditsLayout>
</template>
