<script lang="ts" setup>
definePageMeta({
  layout: 'landing',
});

const auth = useAuth();
const toast = useToast();

const { data: plans, pending: plansLoading } = await useApiFetch<Plan[]>(
  '/subscriptions/plans',
);

// 현재 구독 정보 (auth store에서 가져옴)
const currentSubscription = computed(() => auth.subscription);
const currentPlanId = computed(() => currentSubscription.value?.planId);

// 연간/월간 토글
const billingPeriod = ref<'monthly' | 'yearly'>('monthly');

// 플랜 가격 계산
const getPlanPrice = (plan: Plan) => {
  if (billingPeriod.value === 'yearly' && plan.yearlyPrice) {
    return plan.yearlyPrice;
  }
  return plan.price;
};

// 연간 할인율 계산
const getYearlyDiscount = (plan: Plan) => {
  if (!plan.yearlyPrice || plan.price === 0) return 0;
  const monthlyTotal = plan.price * 12;
  const discount = ((monthlyTotal - plan.yearlyPrice) / monthlyTotal) * 100;
  return Math.round(discount);
};

// 플랜 선택 처리
const selectingPlanId = ref<number | null>(null);

const handleSelectPlan = async (plan: Plan) => {
  if (!auth.isAuthenticated) {
    toast.add({
      title: '로그인 필요',
      description: '플랜을 선택하려면 먼저 로그인해주세요.',
      color: 'warning',
    });
    return navigateTo('/auth/login');
  }

  // 현재 플랜과 동일한 경우
  if (plan.id === currentPlanId.value) {
    toast.add({
      title: '알림',
      description: '이미 사용 중인 플랜입니다.',
      color: 'info',
    });
    return;
  }

  selectingPlanId.value = plan.id;

  try {
    // FREE 플랜은 즉시 전환
    if (plan.name === 'FREE') {
      toast.add({
        title: '안내',
        description:
          'FREE 플랜으로는 다운그레이드할 수 없습니다. 현재 구독을 취소해주세요.',
        color: 'warning',
      });
      return;
    }

    // 유료 플랜 - 결제 페이지로 이동
    await navigateTo({
      path: '/console/checkout',
      query: {
        planId: plan.id,
        period: billingPeriod.value,
      },
    });
  } catch (error) {
    toast.add({
      title: '오류',
      description: '플랜 선택 중 오류가 발생했습니다.',
      color: 'error',
    });
  } finally {
    selectingPlanId.value = null;
  }
};

// 플랜 특징 목록
const getPlanFeatures = (plan: Plan): string[] => {
  const features: string[] = [];

  // BloC
  if (plan.monthlyCredits > 0) {
    features.push(`월 ${plan.monthlyCredits.toLocaleString()} BloC`);
  }

  // 원고 생성 한도
  if (plan.maxBlogPostsPerMonth) {
    features.push(`월 최대 ${plan.maxBlogPostsPerMonth}개 원고 생성`);
  } else if (plan.name !== 'FREE') {
    features.push('무제한 원고 생성');
  }

  // 원고 길이
  if (plan.maxPostLength) {
    features.push(`최대 ${plan.maxPostLength}자 원고`);
  } else if (plan.name !== 'FREE') {
    features.push('무제한 원고 길이');
  }

  // 키워드 추적
  if (plan.maxKeywordTrackings) {
    features.push(`${plan.maxKeywordTrackings}개 키워드 추적`);
  } else if (plan.name !== 'FREE') {
    features.push('무제한 키워드 추적');
  }

  // 페르소나
  if (plan.maxPersonas) {
    features.push(`${plan.maxPersonas}개 페르소나`);
  } else if (plan.name !== 'FREE') {
    features.push('무제한 페르소나');
  }

  // 고급 기능
  if (plan.hasPriorityQueue) {
    features.push('우선 처리 큐');
  }
  if (plan.hasAdvancedAnalytics) {
    features.push('고급 분석 기능');
  }
  if (plan.hasApiAccess) {
    features.push('API 액세스');
  }
  if (plan.hasCustomPersonas) {
    features.push('커스텀 페르소나');
  }

  return features;
};

// 플랜 순서 정의 (FREE, BASIC, PRO, ENTERPRISE)
const planOrder = ['FREE', 'BASIC', 'PRO', 'ENTERPRISE'];
const sortedPlans = computed(() => {
  if (!plans.value) return [];
  return [...plans.value].sort((a, b) => {
    return planOrder.indexOf(a.name) - planOrder.indexOf(b.name);
  });
});

// 플랜별 색상 테마
const getPlanColor = (planName: string) => {
  switch (planName) {
    case 'FREE':
      return 'neutral';
    case 'BASIC':
      return 'info';
    case 'PRO':
      return 'primary';
    case 'ENTERPRISE':
      return 'success';
    default:
      return 'neutral';
  }
};

// 인기 플랜 여부
const isPopularPlan = (planName: string) => {
  return planName === 'PRO';
};

// CTA 버튼 텍스트
const getButtonText = (plan: Plan) => {
  if (plan.id === currentPlanId.value) {
    return '현재 플랜';
  }
  if (plan.name === 'FREE') {
    return 'FREE 시작하기';
  }
  return '선택하기';
};
</script>

<template>
  <section class="container mx-auto max-w-7xl py-12 space-y-12">
    <!-- 헤더 -->
    <div class="text-center space-y-4">
      <h1 class="text-4xl md:text-5xl font-bold">
        비즈니스에 맞는 플랜을 선택하세요
      </h1>
      <p
        class="text-lg text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto"
      >
        AI 기반 블로그 원고 생성으로 콘텐츠 제작을 자동화하세요. 언제든지 플랜을
        변경할 수 있습니다.
      </p>
    </div>

    <!-- 결제 주기 토글 -->
    <div class="flex items-center justify-center gap-4">
      <span
        :class="[
          'text-base font-medium transition-colors',
          billingPeriod === 'monthly'
            ? 'text-neutral-900 dark:text-neutral-100'
            : 'text-neutral-500 dark:text-neutral-400',
        ]"
      >
        월간 결제
      </span>
      <USwitch
        :model-value="billingPeriod === 'yearly'"
        checked-icon="i-heroicons-calendar"
        unchecked-icon="i-heroicons-calendar"
        @update:model-value="
          (val: boolean) => (billingPeriod = val ? 'yearly' : 'monthly')
        "
      />
      <div class="flex items-center gap-2">
        <span
          :class="[
            'text-base font-medium transition-colors',
            billingPeriod === 'yearly'
              ? 'text-neutral-900 dark:text-neutral-100'
              : 'text-neutral-500 dark:text-neutral-400',
          ]"
        >
          연간 결제
        </span>
        <UBadge color="success" variant="soft" size="sm">최대 20% 할인</UBadge>
      </div>
    </div>

    <!-- 플랜 카드 그리드 -->
    <div
      v-if="plansLoading"
      class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
    >
      <USkeleton v-for="i in 4" :key="i" class="h-[600px]" />
    </div>

    <div
      v-else-if="sortedPlans.length > 0"
      class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
    >
      <UCard
        v-for="plan in sortedPlans"
        :key="plan.id"
        :class="[
          'relative transition-all duration-200',
          isPopularPlan(plan.name)
            ? 'ring-2 ring-primary shadow-xl scale-105'
            : 'hover:shadow-lg',
          plan.id === currentPlanId ? 'ring-2 ring-success' : '',
        ]"
      >
        <!-- 인기 플랜 배지 -->
        <div
          v-if="isPopularPlan(plan.name)"
          class="absolute -top-4 left-1/2 -translate-x-1/2 z-10"
        >
          <UBadge color="primary" size="lg" class="px-4 py-1.5">
            <div class="i-heroicons-star-solid mr-1" />
            인기
          </UBadge>
        </div>

        <!-- 현재 플랜 배지 -->
        <div
          v-if="plan.id === currentPlanId"
          class="absolute -top-4 right-4 z-10"
        >
          <UBadge color="success" size="sm" class="px-3 py-1">
            <div class="i-heroicons-check-circle-solid mr-1" />
            현재 플랜
          </UBadge>
        </div>

        <template #header>
          <div class="space-y-3 pt-4">
            <!-- 플랜 이름 -->
            <div class="flex items-center gap-2">
              <div
                :class="[
                  'w-2 h-2 rounded-full',
                  `bg-${getPlanColor(plan.name)}`,
                ]"
              />
              <h3 class="text-xl font-bold">{{ plan.displayName }}</h3>
            </div>

            <!-- 가격 -->
            <div class="space-y-1">
              <div class="flex items-baseline gap-1">
                <span class="text-3xl font-bold">
                  {{ getPlanPrice(plan).toLocaleString() }}원
                </span>
                <span class="text-neutral-500 dark:text-neutral-400">
                  / {{ billingPeriod === 'yearly' ? '년' : '월' }}
                </span>
              </div>
              <div
                v-if="billingPeriod === 'yearly' && getYearlyDiscount(plan) > 0"
                class="flex items-center gap-2 text-sm"
              >
                <span class="line-through text-neutral-500">
                  {{ (plan.price * 12).toLocaleString() }}원
                </span>
                <UBadge color="success" variant="soft" size="sm">
                  {{ getYearlyDiscount(plan) }}% 할인
                </UBadge>
              </div>
            </div>

            <!-- 설명 -->
            <p
              v-if="plan.description"
              class="text-sm text-neutral-600 dark:text-neutral-400 min-h-[2.5rem]"
            >
              {{ plan.description }}
            </p>
          </div>
        </template>

        <!-- 특징 목록 -->
        <div class="space-y-3 py-6">
          <div
            v-for="(feature, index) in getPlanFeatures(plan)"
            :key="index"
            class="flex items-start gap-2 text-sm"
          >
            <div
              class="i-heroicons-check-circle-solid text-success flex-shrink-0 mt-0.5"
            />
            <span>{{ feature }}</span>
          </div>
        </div>

        <template #footer>
          <UButton
            :color="isPopularPlan(plan.name) ? 'primary' : 'neutral'"
            :variant="plan.id === currentPlanId ? 'soft' : 'solid'"
            size="lg"
            block
            :loading="selectingPlanId === plan.id"
            :disabled="plan.id === currentPlanId || selectingPlanId !== null"
            @click="handleSelectPlan(plan)"
          >
            {{ getButtonText(plan) }}
          </UButton>
        </template>
      </UCard>
    </div>

    <!-- FAQ 섹션 -->
    <div class="max-w-3xl mx-auto pt-12 space-y-6">
      <h2 class="text-3xl font-bold text-center">자주 묻는 질문</h2>

      <UAccordion
        :items="[
          {
            label: '언제든지 플랜을 변경할 수 있나요?',
            content:
              '네, 언제든지 플랜을 업그레이드하거나 다운그레이드할 수 있습니다. 업그레이드 시 즉시 적용되며, 다운그레이드는 현재 결제 주기가 끝난 후 적용됩니다.',
          },
          {
            label: 'BloC은 어떻게 사용되나요?',
            content:
              'BloC은 AI 원고 생성 시 소모됩니다. 원고의 길이와 복잡도에 따라 사용되는 BloC이 달라집니다. 사용하지 않은 BloC은 다음 달로 이월되지 않습니다.',
          },
          {
            label: '무료 체험 기간이 있나요?',
            content:
              '회원가입 시 FREE 플랜으로 시작하여 서비스를 체험해볼 수 있습니다. 유료 플랜으로 전환하면 즉시 해당 플랜의 모든 기능을 이용할 수 있습니다.',
          },
          {
            label: '구독을 취소하면 어떻게 되나요?',
            content:
              '구독 취소 시 현재 결제 주기가 끝날 때까지 서비스를 계속 이용할 수 있습니다. 이후 FREE 플랜으로 자동 전환됩니다.',
          },
          {
            label: '결제 수단은 무엇을 지원하나요?',
            content:
              '신용카드, 체크카드를 지원합니다. 안전한 결제를 위해 나이스페이먼츠 결제 시스템을 사용합니다.',
          },
          {
            label: '환불 정책은 어떻게 되나요?',
            content:
              '서비스 이용 후 7일 이내에 환불을 요청하실 수 있습니다. 단, BloC을 사용한 경우 사용한 만큼을 차감한 금액이 환불됩니다.',
          },
        ]"
      />
    </div>

    <!-- CTA 섹션 -->
    <div class="max-w-4xl mx-auto">
      <UCard
        class="bg-gradient-to-r from-primary/10 to-success/10 border-2 border-primary/20"
      >
        <div class="text-center space-y-6 py-8">
          <div class="space-y-3">
            <h2 class="text-3xl font-bold">아직 고민 중이신가요?</h2>
            <p class="text-lg text-neutral-600 dark:text-neutral-400">
              FREE 플랜으로 시작하여 서비스를 직접 체험해보세요.
            </p>
          </div>
          <div class="flex items-center justify-center gap-4">
            <UButton
              v-if="!auth.isAuthenticated"
              color="primary"
              size="xl"
              icon="i-heroicons-rocket-launch"
              to="/auth/register"
            >
              무료로 시작하기
            </UButton>
            <UButton
              v-else-if="currentSubscription?.plan?.name === 'FREE'"
              color="primary"
              size="xl"
              icon="i-heroicons-arrow-up-circle"
              @click="
                () => {
                  const proPlan = sortedPlans.find((p) => p.name === 'PRO');
                  if (proPlan) handleSelectPlan(proPlan);
                }
              "
            >
              PRO 플랜으로 업그레이드
            </UButton>
            <UButton
              color="neutral"
              variant="outline"
              size="xl"
              icon="i-heroicons-chat-bubble-left-right"
              to="/contact"
            >
              문의하기
            </UButton>
          </div>
        </div>
      </UCard>
    </div>
  </section>
</template>
