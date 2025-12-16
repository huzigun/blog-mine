<script lang="ts" setup>
import { CardForm, PaymentConfirmModal } from '#components';

definePageMeta({
  middleware: 'auth',
});

const route = useRoute();
const auth = useAuth();
const toast = useToast();
const overlay = useOverlay();

// 크레딧 잔액 타입 정의
interface CreditBalance {
  totalCredits: number;
  subscriptionCredits: number;
  purchasedCredits: number;
  bonusCredits: number;
}

// 크레딧 잔액 조회
const { data: creditBalance } = await useApiFetch<CreditBalance>(
  '/credits/balance',
);

// 쿼리 파라미터에서 플랜 정보 가져오기
const planId = computed(() => Number(route.query.planId));
const billingPeriod = computed(
  () => (route.query.period as 'monthly' | 'yearly') || 'monthly',
);

// 플랜이 없으면 pricing 페이지로 리다이렉트
if (!planId.value) {
  navigateTo('/pricing');
}

// 선택한 플랜 정보 조회
interface Plan {
  id: number;
  name: string;
  displayName: string;
  description: string | null;
  price: number;
  yearlyPrice: number | null;
  monthlyCredits: number;
  sortOrder: number;
  maxBlogPostsPerMonth: number | null;
  maxPostLength: number | null;
  maxKeywordTrackings: number | null;
  maxPersonas: number | null;
  hasPriorityQueue: boolean;
  hasAdvancedAnalytics: boolean;
  hasApiAccess: boolean;
  hasCustomPersonas: boolean;
  isActive: boolean;
}

// 업그레이드 가격 정보 타입
interface UpgradePriceInfo {
  currentPlan: (Plan & { monthlyCredits?: number }) | null;
  targetPlan: Plan;
  isUpgrade: boolean;
  isNewSubscription: boolean;
  isTrial: boolean;
  remainingDays: number | null;
  totalDays: number | null;
  currentPlanCredit: number;
  targetPlanPrice: number;
  proratedAmount: number;
  // BloC 일할 계산 정보
  currentPlanRemainingCredits?: number;
  targetPlanMonthlyCredits?: number;
  proratedCredits?: number;
  message: string;
}

const { data: selectedPlan, pending: planLoading } = await useApiFetch<Plan>(
  `/subscriptions/plans/${planId.value}`,
);

// 업그레이드 가격 계산 정보 조회
const {
  data: upgradeInfo,
  pending: upgradeInfoLoading,
  error: upgradeError,
} = await useApiFetch<UpgradePriceInfo>(
  `/subscriptions/upgrade-price/${planId.value}`,
  {
    key: `upgrade-price-${planId.value}`,
  },
);

// 업그레이드 여부
const isUpgrade = computed(() => {
  if (!upgradeInfo.value) return false;
  return !upgradeInfo.value.isNewSubscription && !upgradeInfo.value.isTrial;
});

// 하위 플랜으로 변경 시도 여부
const isDowngradeAttempt = computed(() => {
  return !!upgradeError.value;
});

// 실제 결제 금액 (업그레이드 시 차액, 신규/체험 시 전액)
const actualPaymentAmount = computed(() => {
  if (upgradeInfo.value) {
    return upgradeInfo.value.proratedAmount;
  }
  return totalPrice.value;
});

// 등록된 카드 목록 조회
interface Card {
  id: number;
  cardCompany: string | null;
  cardType: string | null; // 'credit' 또는 'check'
  number: string | null; // 마스킹된 카드번호
  isDefault: boolean;
  isAuthenticated: boolean;
}

const {
  data: cards,
  pending: cardsLoading,
  refresh: refreshCards,
} = await useApiFetch<Card[]>('/cards');

// 선택된 카드
const selectedCardId = ref<number | null>(null);

// 기본 카드를 자동 선택
watchEffect(() => {
  if (cards.value && cards.value.length > 0 && !selectedCardId.value) {
    const defaultCard = cards.value.find((c) => c.isDefault);
    selectedCardId.value = defaultCard?.id ?? cards.value[0]?.id ?? null;
  }
});

// 가격 계산
const totalPrice = computed(() => {
  if (!selectedPlan.value) return 0;
  if (billingPeriod.value === 'yearly' && selectedPlan.value.yearlyPrice) {
    return selectedPlan.value.yearlyPrice;
  }
  return selectedPlan.value.price;
});

// 할인 금액 계산
const discountAmount = computed(() => {
  if (!selectedPlan.value) return 0;
  if (billingPeriod.value === 'yearly' && selectedPlan.value.yearlyPrice) {
    const monthlyTotal = selectedPlan.value.price * 12;
    return monthlyTotal - selectedPlan.value.yearlyPrice;
  }
  return 0;
});

// 할인율 계산
const discountRate = computed(() => {
  if (!selectedPlan.value || discountAmount.value === 0) return 0;
  const monthlyTotal = selectedPlan.value.price * 12;
  return Math.round((discountAmount.value / monthlyTotal) * 100);
});

// 자동 갱신 설정
const autoRenewal = ref(true);

// 약관 동의
const termsAgreed = ref(false);

// 결제 진행 중
const isProcessing = ref(false);

// 결제 확인 모달
const paymentConfirmModal = overlay.create(PaymentConfirmModal);

// 선택된 카드 정보
const selectedCardInfo = computed(() => {
  if (!selectedCardId.value || !cards.value) return '';
  const card = cards.value.find((c) => c.id === selectedCardId.value);
  if (!card) return '';
  return `${card.cardCompany || ''} ${card.number || ''}`.trim();
});

// 결제 처리
const handleCheckout = async () => {
  // 하위 플랜으로 변경 시도 시 차단
  if (isDowngradeAttempt.value) {
    toast.add({
      title: '플랜 변경 불가',
      description: '현재 플랜보다 상위 플랜만 선택할 수 있습니다.',
      color: 'error',
    });
    return;
  }

  if (!selectedCardId.value) {
    toast.add({
      title: '카드 선택 필요',
      description: '결제할 카드를 선택해주세요.',
      color: 'warning',
    });
    return;
  }

  if (!termsAgreed.value) {
    toast.add({
      title: '약관 동의 필요',
      description: '이용약관 및 개인정보처리방침에 동의해주세요.',
      color: 'warning',
    });
    return;
  }

  // 결제 확인 모달 표시
  const itemName = isUpgrade.value
    ? `${upgradeInfo.value?.currentPlan?.displayName} → ${selectedPlan.value?.displayName} 업그레이드`
    : `${selectedPlan.value?.displayName} 플랜 (${billingPeriod.value === 'yearly' ? '연간' : '월간'})`;

  // 지급될 BloC 계산 (업그레이드 시 일할 계산, 신규 시 전액)
  const creditsToAdd = isUpgrade.value && upgradeInfo.value?.proratedCredits !== undefined
    ? upgradeInfo.value.proratedCredits
    : selectedPlan.value?.monthlyCredits ?? 0;

  const instance = paymentConfirmModal.open({
    amount: actualPaymentAmount.value,
    description: isUpgrade.value
      ? `${selectedPlan.value?.displayName} 플랜 업그레이드`
      : `${selectedPlan.value?.displayName} 플랜 구독`,
    itemName,
    cardInfo: selectedCardInfo.value,
    currentCredits: creditBalance.value?.totalCredits ?? 0,
    creditsToAdd,
  });

  const confirmed = await instance.result;
  if (!confirmed) return;

  isProcessing.value = true;

  try {
    // 업그레이드인 경우 upgrade API, 아니면 start API 사용
    const endpoint = isUpgrade.value
      ? '/subscriptions/upgrade'
      : '/subscriptions/start';

    await useApiFetch(endpoint, {
      method: 'POST',
      body: {
        planId: planId.value,
        paymentMethodId: selectedCardId.value,
        autoRenewal: autoRenewal.value,
      },
    });

    // 구독 정보 및 사용자 정보 갱신
    await auth.fetchUser();

    toast.add({
      title: isUpgrade.value ? '업그레이드 완료' : '구독 완료',
      description: isUpgrade.value
        ? `${selectedPlan.value?.displayName} 플랜으로 업그레이드되었습니다!`
        : `${selectedPlan.value?.displayName} 플랜 구독이 완료되었습니다!`,
      color: 'success',
    });

    // 성공 페이지로 이동
    await navigateTo('/console/checkout/success');
  } catch (error: any) {
    console.error('Checkout error:', error);
    toast.add({
      title: '결제 실패',
      description: error.data?.message || '결제 처리 중 오류가 발생했습니다.',
      color: 'error',
    });
  } finally {
    isProcessing.value = false;
  }
};

// 카드 등록 모달
const cardFormModal = overlay.create(CardForm);

const openCardModal = async () => {
  // 카드 개수 제한 체크 (최대 3개)
  const MAX_CARDS = 3;
  if (cards.value && cards.value.length >= MAX_CARDS) {
    toast.add({
      title: '카드 등록 제한',
      description: `최대 ${MAX_CARDS}개의 카드만 등록할 수 있습니다.`,
      color: 'warning',
    });
    return;
  }

  const instance = cardFormModal.open({
    existingCardsCount: cards.value?.length || 0,
  });

  const result = (await instance.result) as boolean;

  if (result) {
    // 등록 성공 시 카드 목록 새로고침
    await refreshCards();

    toast.add({
      title: '카드 등록 완료',
      description: '새 카드가 등록되었습니다.',
      color: 'success',
    });
  }
};
</script>

<template>
  <section class="container mx-auto max-w-6xl py-12 px-4">
    <!-- 헤더 -->
    <div class="mb-8">
      <h1 class="text-3xl font-bold mb-2">결제하기</h1>
      <p class="text-neutral-600 dark:text-neutral-400">
        선택하신 플랜의 결제 정보를 확인하고 결제를 완료하세요.
      </p>
    </div>

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
          <span class="font-semibold text-warning">
            매일 밤 11시에 자동으로 환불
          </span>
          됩니다.
        </p>
      </template>
    </UAlert>

    <!-- 하위 플랜 선택 에러 -->
    <UAlert
      v-if="isDowngradeAttempt"
      color="error"
      variant="subtle"
      icon="i-heroicons-exclamation-circle"
      class="mb-6"
    >
      <template #title>
        <span class="font-semibold">플랜 변경 불가</span>
      </template>
      <template #description>
        <p>
          현재 구독 중인 플랜보다 상위 플랜만 선택할 수 있습니다.
          <NuxtLink
            to="/pricing"
            class="text-primary hover:underline font-medium"
          >
            다른 플랜 보기
          </NuxtLink>
        </p>
      </template>
    </UAlert>

    <!-- 업그레이드 안내 -->
    <UAlert
      v-if="isUpgrade && upgradeInfo"
      color="info"
      variant="subtle"
      icon="i-heroicons-arrow-trending-up"
      class="mb-6"
    >
      <template #title>
        <span class="font-semibold">플랜 업그레이드</span>
      </template>
      <template #description>
        <div class="space-y-1">
          <p>
            {{ upgradeInfo.currentPlan?.displayName }}에서
            <span class="font-semibold">
              {{ upgradeInfo.targetPlan.displayName }}
            </span>
            으로 업그레이드합니다.
          </p>
          <p class="text-sm">
            현재 플랜 잔여 기간({{ upgradeInfo.remainingDays }}일)에 대한 차액이
            적용됩니다.
          </p>
        </div>
      </template>
    </UAlert>

    <!-- 로딩 상태 -->
    <div
      v-if="planLoading || cardsLoading || upgradeInfoLoading"
      class="space-y-4"
    >
      <USkeleton class="h-64" />
      <USkeleton class="h-96" />
    </div>

    <!-- 메인 콘텐츠 -->
    <div v-else class="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <!-- 주문 정보 (왼쪽) -->
      <div class="xl:col-span-2 space-y-6">
        <!-- 플랜 정보 -->
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h2 class="text-xl font-bold">선택한 플랜</h2>
              <UButton
                size="sm"
                variant="ghost"
                color="neutral"
                icon="i-heroicons-arrow-path"
                to="/pricing"
              >
                플랜 변경
              </UButton>
            </div>
          </template>

          <div v-if="selectedPlan" class="space-y-4">
            <div class="flex items-start justify-between">
              <div class="space-y-2">
                <div class="flex items-center gap-2">
                  <h3 class="text-lg font-semibold">
                    {{ selectedPlan.displayName }}
                  </h3>
                  <UBadge
                    v-if="billingPeriod === 'yearly' && discountRate > 0"
                    color="success"
                    variant="soft"
                  >
                    {{ discountRate }}% 할인
                  </UBadge>
                </div>
                <p
                  v-if="selectedPlan.description"
                  class="text-sm text-neutral-600 dark:text-neutral-400"
                >
                  {{ selectedPlan.description }}
                </p>
              </div>
              <div class="text-right">
                <div class="text-2xl font-bold text-primary">
                  {{ totalPrice.toLocaleString() }}원
                </div>
                <div
                  class="text-xs text-neutral-500 dark:text-neutral-400 mt-1"
                >
                  / {{ billingPeriod === 'yearly' ? '년' : '월' }}
                </div>
              </div>
            </div>

            <!-- 플랜 특징 -->
            <div
              class="pt-4 border-t border-neutral-200 dark:border-neutral-800"
            >
              <h4 class="text-sm font-semibold mb-3">포함된 혜택</h4>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                <div class="flex items-center gap-2">
                  <div class="i-heroicons-check-circle-solid text-success" />
                  <span>
                    월 {{ selectedPlan.monthlyCredits.toLocaleString() }} BloC
                  </span>
                </div>
                <div
                  v-if="selectedPlan.maxBlogPostsPerMonth"
                  class="flex items-center gap-2"
                >
                  <div class="i-heroicons-check-circle-solid text-success" />
                  <span>
                    월 최대 {{ selectedPlan.maxBlogPostsPerMonth }}개 원고
                  </span>
                </div>
                <div v-else class="flex items-center gap-2">
                  <div class="i-heroicons-check-circle-solid text-success" />
                  <span>무제한 원고 생성</span>
                </div>
                <div
                  v-if="selectedPlan.hasPriorityQueue"
                  class="flex items-center gap-2"
                >
                  <div class="i-heroicons-check-circle-solid text-success" />
                  <span>우선 처리 큐</span>
                </div>
                <div
                  v-if="selectedPlan.hasAdvancedAnalytics"
                  class="flex items-center gap-2"
                >
                  <div class="i-heroicons-check-circle-solid text-success" />
                  <span>고급 분석 기능</span>
                </div>
              </div>
            </div>
          </div>
        </UCard>

        <!-- 결제 수단 선택 -->
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h2 class="text-xl font-bold">결제 수단</h2>
              <UButton
                size="sm"
                variant="soft"
                icon="i-heroicons-plus"
                :disabled="cards && cards.length >= 3"
                @click="openCardModal"
              >
                카드 추가 ({{ cards?.length || 0 }}/3)
              </UButton>
            </div>
          </template>

          <div v-if="cards && cards.length > 0" class="space-y-3">
            <div
              v-for="card in cards"
              :key="card.id"
              :class="[
                'p-4 rounded-lg border-2 cursor-pointer transition-all',
                selectedCardId === card.id
                  ? 'border-primary bg-primary/5'
                  : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700',
              ]"
              @click="selectedCardId = card.id"
            >
              <div class="flex items-center gap-3">
                <div
                  :class="[
                    'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',
                    selectedCardId === card.id
                      ? 'border-primary bg-primary'
                      : 'border-neutral-300 dark:border-neutral-600',
                  ]"
                >
                  <div
                    v-if="selectedCardId === card.id"
                    class="w-2 h-2 rounded-full bg-white"
                  />
                </div>
                <div class="flex-1">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <div
                        class="i-heroicons-credit-card text-lg text-neutral-500"
                      />
                      <div>
                        <div class="flex items-center gap-2">
                          <span class="font-medium">
                            {{ card.cardCompany || '카드사 정보 없음' }}
                          </span>
                          <UBadge
                            v-if="card.isDefault"
                            color="primary"
                            variant="soft"
                            size="sm"
                          >
                            기본
                          </UBadge>
                        </div>
                        <div
                          v-if="card.number"
                          class="text-sm text-neutral-600 dark:text-neutral-400 mt-0.5 font-mono"
                        >
                          {{ card.number }}
                        </div>
                        <div
                          v-else
                          class="text-sm text-neutral-400 dark:text-neutral-500 mt-0.5 italic"
                        >
                          카드번호 없음
                        </div>
                      </div>
                    </div>
                    <UBadge
                      :color="
                        card.cardType?.toLowerCase() === 'credit'
                          ? 'info'
                          : 'success'
                      "
                      variant="soft"
                      size="sm"
                    >
                      {{
                        card.cardType?.toLowerCase() === 'credit'
                          ? '신용'
                          : '체크'
                      }}
                    </UBadge>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 카드 없음 -->
          <div v-else class="text-center py-8">
            <div
              class="i-heroicons-credit-card text-4xl text-neutral-400 mx-auto mb-3"
            />
            <p class="text-neutral-600 dark:text-neutral-400 mb-4">
              등록된 카드가 없습니다.
            </p>
            <UButton
              color="primary"
              icon="i-heroicons-plus"
              @click="openCardModal"
            >
              카드 추가하기
            </UButton>
          </div>
        </UCard>

        <!-- 자동 갱신 설정 -->
        <UCard>
          <template #header>
            <h2 class="text-xl font-bold">결제 옵션</h2>
          </template>

          <div class="space-y-4">
            <div class="flex items-start gap-3">
              <UCheckbox v-model="autoRenewal" />
              <div class="flex-1">
                <label
                  class="font-medium cursor-pointer"
                  @click="autoRenewal = !autoRenewal"
                >
                  자동 갱신
                </label>
                <p class="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                  구독 기간이 만료되면 자동으로 갱신됩니다. 언제든지 해지할 수
                  있습니다.
                </p>
              </div>
            </div>
          </div>
        </UCard>
      </div>

      <!-- 주문 요약 (오른쪽) -->
      <div class="xl:col-span-1">
        <UCard class="sticky top-20">
          <template #header>
            <h2 class="text-xl font-bold">주문 요약</h2>
          </template>

          <div v-if="selectedPlan" class="space-y-4">
            <!-- 가격 상세 -->
            <div class="space-y-3">
              <!-- 업그레이드 시 차액 계산 표시 -->
              <template v-if="isUpgrade && upgradeInfo">
                <div class="flex items-center justify-between text-sm">
                  <span class="text-neutral-600 dark:text-neutral-400">
                    {{ upgradeInfo.targetPlan.displayName }} 플랜 가격
                  </span>
                  <span class="font-medium">
                    {{ upgradeInfo.targetPlanPrice.toLocaleString() }}원
                  </span>
                </div>

                <div class="flex items-center justify-between text-sm">
                  <span class="text-success">
                    현재 플랜 잔여 가치 ({{ upgradeInfo.remainingDays }}일)
                  </span>
                  <span class="font-medium text-success">
                    -{{ upgradeInfo.currentPlanCredit.toLocaleString() }}원
                  </span>
                </div>
              </template>

              <!-- 신규 구독 시 표시 -->
              <template v-else>
                <div class="flex items-center justify-between text-sm">
                  <span class="text-neutral-600 dark:text-neutral-400">
                    {{ selectedPlan.displayName }} ({{
                      billingPeriod === 'yearly' ? '연간' : '월간'
                    }})
                  </span>
                  <span class="font-medium">
                    {{
                      (billingPeriod === 'yearly'
                        ? selectedPlan.price * 12
                        : selectedPlan.price
                      ).toLocaleString()
                    }}원
                  </span>
                </div>

                <div
                  v-if="discountAmount > 0"
                  class="flex items-center justify-between text-sm"
                >
                  <span class="text-success">
                    연간 구독 할인 ({{ discountRate }}%)
                  </span>
                  <span class="font-medium text-success">
                    -{{ discountAmount.toLocaleString() }}원
                  </span>
                </div>
              </template>

              <div
                class="pt-3 border-t border-neutral-200 dark:border-neutral-800"
              >
                <div class="flex items-center justify-between">
                  <span class="font-semibold">
                    {{ isUpgrade ? '업그레이드 차액' : '총 결제 금액' }}
                  </span>
                  <div class="text-right">
                    <div class="text-2xl font-bold text-primary">
                      {{ actualPaymentAmount.toLocaleString() }}원
                    </div>
                    <div
                      class="text-xs text-neutral-500 dark:text-neutral-400 mt-1"
                    >
                      부가세 포함
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 약관 동의 -->
            <div
              class="pt-4 border-t border-neutral-200 dark:border-neutral-800"
            >
              <div class="flex items-start gap-3">
                <UCheckbox v-model="termsAgreed" />
                <div class="flex-1 text-sm">
                  <label
                    class="cursor-pointer"
                    @click="termsAgreed = !termsAgreed"
                  >
                    <NuxtLink
                      to="https://atomosads.notion.site/_BlogMine_v1-0-2b13f8c41f088166aaebcae54bd460f4"
                      class="text-primary hover:underline"
                      target="_blank"
                    >
                      이용약관
                    </NuxtLink>
                    및
                    <NuxtLink
                      to="https://atomosads.notion.site/_BlogMine_v1-0-2b13f8c41f088178a1aeef9df3fbab5b"
                      class="text-primary hover:underline"
                      target="_blank"
                    >
                      개인정보처리방침
                    </NuxtLink>
                    에 동의합니다.
                  </label>
                </div>
              </div>
            </div>

            <!-- 결제 버튼 -->
            <UButton
              color="primary"
              size="xl"
              block
              :icon="
                isUpgrade
                  ? 'i-heroicons-arrow-trending-up'
                  : 'i-heroicons-credit-card'
              "
              :loading="isProcessing"
              :disabled="
                !selectedCardId ||
                !termsAgreed ||
                isProcessing ||
                isDowngradeAttempt
              "
              @click="handleCheckout"
            >
              {{ actualPaymentAmount.toLocaleString() }}원
              {{ isUpgrade ? '업그레이드' : '결제하기' }}
            </UButton>

            <!-- 안내 메시지 -->
            <div
              class="text-xs text-neutral-500 dark:text-neutral-400 space-y-1"
            >
              <p>• 결제는 안전하게 암호화되어 처리됩니다.</p>
              <p>• 구독은 언제든지 해지할 수 있습니다.</p>
              <p>• 환불 정책은 이용약관을 참고해주세요.</p>
            </div>
          </div>
        </UCard>
      </div>
    </div>
  </section>
</template>
