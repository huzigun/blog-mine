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
  <section class="py-16 md:py-24 space-y-16">
    <!-- 헤더 -->
    <div class="text-center space-y-6 px-4">
      <UBadge color="primary" variant="soft" size="lg" class="px-4 py-1">
        가격 정책
      </UBadge>
      <h1 class="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
        비즈니스에 맞는 플랜을
        <br class="hidden md:block" />
        선택하세요
      </h1>
      <p
        class="text-lg md:text-xl text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto"
      >
        AI 기반 블로그 원고 생성으로 콘텐츠 제작을 자동화하세요.
        <br class="hidden sm:block" />
        언제든지 플랜을 변경할 수 있습니다.
      </p>
    </div>

    <!-- 플랜 카드 그리드 -->
    <div class="px-4 md:px-8 pt-4">
      <div
        v-if="plansLoading"
        class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 lg:gap-8 max-w-7xl mx-auto pt-6"
      >
        <USkeleton v-for="i in 4" :key="i" class="h-[600px] rounded-2xl" />
      </div>

      <div
        v-else-if="sortedPlans.length > 0"
        class="flex flex-col xl:flex-row justify-center items-center xl:items-stretch gap-6 lg:gap-8 max-w-7xl mx-auto pt-6 pb-4 px-2"
      >
        <UCard
          v-for="plan in sortedPlans"
          :key="plan.id"
          :class="[
            'relative w-full max-w-sm xl:w-[280px] xl:max-w-none transition-all duration-300 overflow-visible ring-2',
            isPopularPlan(plan.name)
              ? 'ring-primary shadow-2xl xl:-mt-4 xl:mb-4 xl:scale-105 z-10'
              : 'hover:shadow-xl hover:-translate-y-1',
            plan.id === currentPlanId ? 'ring-success' : '',
          ]"
        >
          <!-- 인기 플랜 배지 -->
          <div
            v-if="isPopularPlan(plan.name)"
            class="absolute -top-4 left-1/2 -translate-x-1/2 z-10"
          >
            <UBadge
              color="primary"
              size="lg"
              class="px-4 py-1.5 shadow-lg font-semibold"
            >
              <UIcon name="i-heroicons-star-solid" class="mr-1" />
              추천
            </UBadge>
          </div>

          <!-- 현재 플랜 배지 -->
          <div
            v-if="plan.id === currentPlanId"
            class="absolute -top-4 right-4 z-10"
          >
            <UBadge color="success" size="sm" class="px-3 py-1 shadow">
              <UIcon name="i-heroicons-check-circle-solid" class="mr-1" />
              현재 플랜
            </UBadge>
          </div>

          <template #header>
            <div class="space-y-4 pt-4">
              <!-- 플랜 이름 -->
              <div class="flex items-center gap-2">
                <div
                  :class="[
                    'w-3 h-3 rounded-full',
                    {
                      'bg-neutral-400': plan.name === 'FREE',
                      'bg-info': plan.name === 'BASIC',
                      'bg-primary': plan.name === 'PRO',
                      'bg-success': plan.name === 'ENTERPRISE',
                    },
                  ]"
                />
                <h3 class="text-xl font-bold">{{ plan.displayName }}</h3>
              </div>

              <!-- 가격 -->
              <div class="space-y-2">
                <div class="flex items-baseline gap-1">
                  <span class="text-4xl font-bold tracking-tight">
                    {{
                      plan.price === 0
                        ? '무료'
                        : plan.price.toLocaleString() + '원'
                    }}
                  </span>
                  <span
                    v-if="plan.price > 0"
                    class="text-neutral-500 dark:text-neutral-400"
                  >
                    / 월
                  </span>
                </div>
              </div>

              <!-- 설명 -->
              <p
                v-if="plan.description"
                class="text-sm text-neutral-600 dark:text-neutral-400 min-h-12 leading-relaxed"
              >
                {{ plan.description }}
              </p>
            </div>
          </template>

          <!-- 특징 목록 -->
          <div class="space-y-3 py-4">
            <div
              v-for="(feature, index) in getPlanFeatures(plan)"
              :key="index"
              class="flex items-start gap-3 text-sm"
            >
              <UIcon
                name="i-heroicons-check-circle-solid"
                class="text-success shrink-0 mt-0.5 size-5"
              />
              <span class="text-neutral-700 dark:text-neutral-300">
                {{ feature }}
              </span>
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
              class="font-semibold"
              @click="handleSelectPlan(plan)"
            >
              {{ getButtonText(plan) }}
            </UButton>
          </template>
        </UCard>
      </div>
    </div>

    <!-- FAQ 섹션 -->
    <div class="max-w-3xl mx-auto px-4 pt-8 space-y-8">
      <div class="text-center space-y-3">
        <UBadge color="neutral" variant="soft" size="lg" class="px-4 py-1">
          FAQ
        </UBadge>
        <h2 class="text-3xl md:text-4xl font-bold">자주 묻는 질문</h2>
      </div>

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
    <div class="max-w-4xl mx-auto px-4">
      <UCard
        class="bg-linear-to-br from-primary/5 via-transparent to-success/5 border border-primary/20 overflow-hidden"
      >
        <div class="relative text-center space-y-8 py-10 md:py-14">
          <!-- 배경 장식 -->
          <div
            class="absolute -top-20 -right-20 w-40 h-40 bg-primary/10 rounded-full blur-3xl"
          />
          <div
            class="absolute -bottom-20 -left-20 w-40 h-40 bg-success/10 rounded-full blur-3xl"
          />

          <div class="relative space-y-4">
            <h2 class="text-3xl md:text-4xl font-bold">
              아직 고민 중이신가요?
            </h2>
            <p
              class="text-lg md:text-xl text-neutral-600 dark:text-neutral-400 max-w-xl mx-auto"
            >
              FREE 플랜으로 시작하여 서비스를 직접 체험해보세요.
              <br class="hidden sm:block" />
              언제든지 업그레이드할 수 있습니다.
            </p>
          </div>

          <div
            class="relative flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <UButton
              v-if="!auth.isAuthenticated"
              color="primary"
              size="xl"
              icon="i-heroicons-rocket-launch"
              to="/auth/register"
              class="font-semibold px-8"
            >
              무료로 시작하기
            </UButton>
            <UButton
              v-else-if="currentSubscription?.plan?.name === 'FREE'"
              color="primary"
              size="xl"
              icon="i-heroicons-arrow-up-circle"
              class="font-semibold px-8"
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
              class="font-semibold px-8"
            >
              문의하기
            </UButton>
          </div>
        </div>
      </UCard>
    </div>
  </section>
</template>
