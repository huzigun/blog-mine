<script setup lang="ts">
definePageMeta({
  layout: 'landing',
});

// 통계 데이터
const stats = [
  { label: '생성된 원고', value: '10,000+', icon: 'i-heroicons-document-text' },
  { label: '활성 사용자', value: '1,200+', icon: 'i-heroicons-users' },
  { label: '평균 만족도', value: '4.8/5', icon: 'i-heroicons-star' },
  { label: '시간 절감', value: '80%', icon: 'i-heroicons-clock' },
];

// 주요 기능
const features = [
  {
    icon: 'i-heroicons-sparkles',
    title: 'AI 기반 원고 생성',
    description:
      '키워드만 입력하면 SEO 최적화된 고품질 블로그 원고를 자동으로 생성합니다.',
    color: 'primary',
  },
  {
    icon: 'i-heroicons-user-circle',
    title: '페르소나 관리',
    description:
      '브랜드 톤앤매너에 맞는 페르소나를 생성하고 관리할 수 있습니다.',
    color: 'success',
  },
  {
    icon: 'i-heroicons-chart-bar',
    title: '키워드 추적',
    description:
      '네이버 검색 순위를 추적하고 SEO 성과를 실시간으로 분석합니다.',
    color: 'info',
  },
  {
    icon: 'i-heroicons-credit-card',
    title: '유연한 크레딧 시스템',
    description:
      '사용한 만큼만 지불하는 BloC 크레딧으로 효율적인 비용 관리가 가능합니다.',
    color: 'warning',
  },
  {
    icon: 'i-heroicons-document-duplicate',
    title: '원고 워크스페이스',
    description:
      '생성된 원고를 체계적으로 관리하고 언제든지 확인할 수 있습니다.',
    color: 'error',
  },
  {
    icon: 'i-heroicons-bolt',
    title: '빠른 생성 속도',
    description:
      '최신 AI 기술로 몇 초 만에 완성도 높은 블로그 원고를 생성합니다.',
    color: 'neutral',
  },
];

// 사용 방법
const howItWorks = [
  {
    step: 1,
    title: '페르소나 생성',
    description: '브랜드 특성에 맞는 페르소나를 설정합니다.',
    icon: 'i-heroicons-user-plus',
  },
  {
    step: 2,
    title: '키워드 입력',
    description: '원하는 주제의 키워드를 입력합니다.',
    icon: 'i-heroicons-magnifying-glass',
  },
  {
    step: 3,
    title: 'AI 원고 생성',
    description: 'AI가 자동으로 SEO 최적화 원고를 생성합니다.',
    icon: 'i-heroicons-sparkles',
  },
  {
    step: 4,
    title: '검토 및 발행',
    description: '원고를 검토하고 블로그에 발행합니다.',
    icon: 'i-heroicons-rocket-launch',
  },
];

// 고객 후기
const testimonials = [
  {
    name: '김마케터',
    role: '마케팅팀 리더',
    company: '테크스타트업',
    content:
      'Blog Mine을 사용한 후 블로그 운영 시간이 80% 단축되었습니다. SEO 순위도 크게 개선되어 유입이 2배 이상 증가했어요.',
    avatar: '👨‍💼',
    rating: 5,
  },
  {
    name: '이콘텐츠',
    role: '콘텐츠 마케터',
    company: '이커머스 회사',
    content:
      '페르소나 기능이 정말 유용해요. 브랜드 톤을 일관되게 유지하면서도 다양한 주제의 원고를 빠르게 생성할 수 있습니다.',
    avatar: '👩‍💻',
    rating: 5,
  },
  {
    name: '박블로거',
    role: '1인 블로거',
    company: '개인 블로그',
    content:
      '크레딧 시스템 덕분에 부담 없이 시작할 수 있었어요. 필요한 만큼만 충전해서 사용하니 경제적이에요.',
    avatar: '✍️',
    rating: 4,
  },
];

// 플랜 비교 (간단 버전)
const planComparison = [
  {
    name: 'FREE',
    price: 0,
    credits: 10,
    features: ['월 10 BloC', '기본 페르소나', '키워드 추적 3개'],
    highlighted: false,
  },
  {
    name: 'PRO',
    price: 29000,
    credits: 100,
    features: [
      '월 100 BloC',
      '무제한 페르소나',
      '무제한 키워드 추적',
      '우선 처리',
    ],
    highlighted: true,
  },
  {
    name: 'ENTERPRISE',
    price: 99000,
    credits: 500,
    features: [
      '월 500 BloC',
      '무제한 페르소나',
      '무제한 키워드 추적',
      'API 액세스',
      '전담 지원',
    ],
    highlighted: false,
  },
];
</script>

<template>
  <div>
    <!-- Hero Section -->
    <section
      class="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-linear-to-br from-primary/5 via-white to-success/5 dark:from-primary/10 dark:via-neutral-950 dark:to-success/10"
    >
      <!-- 배경 그래디언트 효과 -->
      <div
        class="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(99,102,241,0.1),transparent_50%),radial-gradient(circle_at_70%_80%,rgba(34,197,94,0.1),transparent_50%)]"
      />

      <div
        class="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10"
      >
        <div class="text-center space-y-8 py-20">
          <!-- Badge -->
          <div class="flex justify-center">
            <UBadge color="primary" size="lg" variant="soft" class="px-4 py-2">
              <UIcon name="i-heroicons-sparkles" class="mr-2" />
              AI 기반 블로그 자동화 플랫폼
            </UBadge>
          </div>

          <!-- Headline -->
          <h1
            class="text-4xl md:text-6xl lg:text-7xl font-bold text-neutral-900 dark:text-neutral-100 leading-tight"
          >
            블로그 원고 생성,
            <br />
            <span
              class="bg-linear-to-r from-primary to-success bg-clip-text text-transparent"
            >
              이제 AI가 해결합니다
            </span>
          </h1>

          <!-- Subheadline -->
          <p
            class="text-lg md:text-xl text-neutral-600 dark:text-neutral-400 max-w-3xl mx-auto"
          >
            키워드만 입력하면 SEO 최적화된 고품질 블로그 원고를 자동으로
            생성합니다.
            <br class="hidden md:block" />
            콘텐츠 제작 시간을 80% 단축하고, 검색 순위를 높이세요.
          </p>

          <!-- CTA Buttons -->
          <div
            class="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <UButton
              to="/auth/register"
              color="primary"
              size="xl"
              icon="i-heroicons-rocket-launch"
              class="px-8"
            >
              무료로 시작하기
            </UButton>
            <UButton
              to="/#demo"
              color="neutral"
              variant="outline"
              size="xl"
              icon="i-heroicons-play-circle"
            >
              사용 방법 보기
            </UButton>
          </div>

          <!-- Stats -->
          <div
            class="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 pt-12 max-w-4xl mx-auto"
          >
            <div
              v-for="stat in stats"
              :key="stat.label"
              class="text-center space-y-2"
            >
              <div class="flex items-center justify-center">
                <UIcon :name="stat.icon" class="text-3xl text-primary" />
              </div>
              <div
                class="text-2xl md:text-3xl font-bold text-neutral-900 dark:text-neutral-100"
              >
                {{ stat.value }}
              </div>
              <div class="text-sm text-neutral-600 dark:text-neutral-400">
                {{ stat.label }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Scroll Indicator -->
      <div
        class="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce text-neutral-400"
      >
        <UIcon name="i-heroicons-chevron-down" class="text-2xl" />
      </div>
    </section>

    <!-- Features Section -->
    <section id="features" class="py-20 bg-white dark:bg-neutral-950">
      <div class="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="text-center space-y-4 mb-16">
          <UBadge color="primary" size="lg" variant="soft">주요 기능</UBadge>
          <h2
            class="text-3xl md:text-4xl font-bold text-neutral-900 dark:text-neutral-100"
          >
            강력한 기능으로 블로그 운영을 자동화하세요
          </h2>
          <p
            class="text-lg text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto"
          >
            Blog Mine은 AI 기반 원고 생성부터 SEO 분석까지 블로그 운영에 필요한
            모든 기능을 제공합니다.
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <UCard
            v-for="feature in features"
            :key="feature.title"
            class="hover:shadow-lg transition-shadow duration-200"
          >
            <div class="space-y-4">
              <div
                :class="[
                  'w-12 h-12 rounded-lg flex items-center justify-center',
                  `bg-${feature.color}/10`,
                ]"
              >
                <UIcon
                  :name="feature.icon"
                  :class="`text-${feature.color}`"
                  class="text-2xl"
                />
              </div>
              <h3
                class="text-xl font-bold text-neutral-900 dark:text-neutral-100"
              >
                {{ feature.title }}
              </h3>
              <p class="text-neutral-600 dark:text-neutral-400">
                {{ feature.description }}
              </p>
            </div>
          </UCard>
        </div>
      </div>
    </section>

    <!-- How It Works Section -->
    <section id="demo" class="py-20 bg-neutral-50 dark:bg-neutral-900">
      <div class="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="text-center space-y-4 mb-16">
          <UBadge color="success" size="lg" variant="soft">사용 방법</UBadge>
          <h2
            class="text-3xl md:text-4xl font-bold text-neutral-900 dark:text-neutral-100"
          >
            4단계로 간단하게 시작하세요
          </h2>
          <p
            class="text-lg text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto"
          >
            복잡한 설정 없이 바로 시작할 수 있습니다. 몇 분이면 첫 번째 원고를
            생성할 수 있어요.
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div v-for="step in howItWorks" :key="step.step" class="relative">
            <!-- 연결선 (데스크톱) -->
            <div
              v-if="step.step < howItWorks.length"
              class="hidden lg:block absolute top-16 left-[60%] w-[80%] h-0.5 bg-linear-to-r from-primary/50 to-transparent"
            />

            <div class="text-center space-y-4">
              <!-- Step Number -->
              <div
                class="w-16 h-16 mx-auto rounded-full bg-linear-to-br from-primary to-success flex items-center justify-center text-white text-2xl font-bold"
              >
                {{ step.step }}
              </div>

              <!-- Icon -->
              <div class="flex items-center justify-center">
                <div
                  class="w-20 h-20 rounded-2xl bg-white dark:bg-neutral-800 shadow-lg flex items-center justify-center"
                >
                  <UIcon :name="step.icon" class="text-primary text-3xl" />
                </div>
              </div>

              <!-- Content -->
              <h3
                class="text-xl font-bold text-neutral-900 dark:text-neutral-100"
              >
                {{ step.title }}
              </h3>
              <p class="text-neutral-600 dark:text-neutral-400">
                {{ step.description }}
              </p>
            </div>
          </div>
        </div>

        <!-- CTA -->
        <div class="text-center mt-12">
          <UButton
            to="/auth/register"
            color="primary"
            size="xl"
            icon="i-heroicons-arrow-right-circle"
          >
            지금 바로 시작하기
          </UButton>
        </div>
      </div>
    </section>

    <!-- Testimonials Section -->
    <section class="py-20 bg-white dark:bg-neutral-950">
      <div class="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="text-center space-y-4 mb-16">
          <UBadge color="warning" size="lg" variant="soft">고객 후기</UBadge>
          <h2
            class="text-3xl md:text-4xl font-bold text-neutral-900 dark:text-neutral-100"
          >
            실제 사용자들의 생생한 후기
          </h2>
          <p
            class="text-lg text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto"
          >
            다양한 분야의 고객들이 Blog Mine으로 블로그 운영 효율을 높이고
            있습니다.
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          <UCard
            v-for="testimonial in testimonials"
            :key="testimonial.name"
            class="hover:shadow-xl transition-shadow duration-200"
          >
            <div class="space-y-4">
              <!-- Rating -->
              <div class="flex items-center gap-1">
                <UIcon
                  v-for="i in testimonial.rating"
                  :key="i"
                  name="i-heroicons-star-solid"
                  class="text-warning text-lg"
                />
              </div>

              <!-- Content -->
              <p class="text-neutral-700 dark:text-neutral-300 leading-relaxed">
                "{{ testimonial.content }}"
              </p>

              <!-- Author -->
              <div
                class="flex items-center gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-800"
              >
                <div class="text-4xl">{{ testimonial.avatar }}</div>
                <div>
                  <div
                    class="font-semibold text-neutral-900 dark:text-neutral-100"
                  >
                    {{ testimonial.name }}
                  </div>
                  <div class="text-sm text-neutral-600 dark:text-neutral-400">
                    {{ testimonial.role }} · {{ testimonial.company }}
                  </div>
                </div>
              </div>
            </div>
          </UCard>
        </div>
      </div>
    </section>

    <!-- Pricing Preview Section -->
    <section class="py-20 bg-neutral-50 dark:bg-neutral-900">
      <div class="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="text-center space-y-4 mb-16">
          <UBadge color="info" size="lg" variant="soft">요금제</UBadge>
          <h2
            class="text-3xl md:text-4xl font-bold text-neutral-900 dark:text-neutral-100"
          >
            비즈니스에 맞는 플랜을 선택하세요
          </h2>
          <p
            class="text-lg text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto"
          >
            무료로 시작하고, 필요에 따라 언제든지 업그레이드할 수 있습니다.
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <UCard
            v-for="plan in planComparison"
            :key="plan.name"
            :class="[
              'relative transition-all duration-200',
              plan.highlighted
                ? 'ring-2 ring-primary shadow-xl scale-105'
                : 'hover:shadow-lg',
            ]"
          >
            <!-- Popular Badge -->
            <div
              v-if="plan.highlighted"
              class="absolute -top-4 left-1/2 -translate-x-1/2 z-10"
            >
              <UBadge color="primary" size="lg" class="px-4 py-1.5">
                <UIcon name="i-heroicons-star-solid" class="mr-1" />
                인기
              </UBadge>
            </div>

            <template #header>
              <div class="space-y-3 pt-4">
                <h3
                  class="text-xl font-bold text-neutral-900 dark:text-neutral-100"
                >
                  {{ plan.name }}
                </h3>
                <div class="flex items-baseline gap-1">
                  <span class="text-3xl font-bold">
                    {{ plan.price.toLocaleString() }}원
                  </span>
                  <span class="text-neutral-500 dark:text-neutral-400">
                    / 월
                  </span>
                </div>
                <div class="text-sm text-neutral-600 dark:text-neutral-400">
                  월 {{ plan.credits }} BloC 제공
                </div>
              </div>
            </template>

            <div class="space-y-3 py-6">
              <div
                v-for="(feature, index) in plan.features"
                :key="index"
                class="flex items-start gap-2 text-sm"
              >
                <UIcon
                  name="i-heroicons-check-circle-solid"
                  class="text-success shrink-0 mt-0.5"
                />
                <span>{{ feature }}</span>
              </div>
            </div>

            <template #footer>
              <UButton
                :to="plan.name === 'FREE' ? '/auth/register' : '/pricing'"
                :color="plan.highlighted ? 'primary' : 'neutral'"
                :variant="plan.highlighted ? 'solid' : 'outline'"
                size="lg"
                block
              >
                {{ plan.name === 'FREE' ? '무료 시작' : '자세히 보기' }}
              </UButton>
            </template>
          </UCard>
        </div>

        <div class="text-center mt-12">
          <UButton
            to="/pricing"
            color="neutral"
            variant="outline"
            size="lg"
            icon="i-heroicons-arrow-right-circle"
          >
            모든 플랜 비교하기
          </UButton>
        </div>
      </div>
    </section>

    <!-- CTA Section -->
    <section class="py-20 bg-linear-to-br from-primary to-success text-white">
      <div class="container mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div class="text-center space-y-8">
          <h2 class="text-3xl md:text-5xl font-bold">지금 바로 시작하세요</h2>
          <p class="text-lg md:text-xl text-white/90 max-w-2xl mx-auto">
            무료 플랜으로 Blog Mine의 강력한 기능을 경험해보세요.
            <br class="hidden md:block" />
            신용카드 없이 즉시 시작할 수 있습니다.
          </p>

          <div
            class="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <UButton
              to="/auth/register"
              color="neutral"
              size="xl"
              icon="i-heroicons-rocket-launch"
            >
              무료로 시작하기
            </UButton>
            <UButton
              to="/pricing"
              color="neutral"
              variant="outline"
              size="xl"
              icon="i-heroicons-currency-dollar"
            >
              요금제 확인하기
            </UButton>
          </div>

          <!-- Trust Signals -->
          <div
            class="pt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-white/80"
          >
            <div class="flex items-center gap-2">
              <UIcon name="i-heroicons-check-circle-solid" />
              <span>신용카드 불필요</span>
            </div>
            <div class="flex items-center gap-2">
              <UIcon name="i-heroicons-check-circle-solid" />
              <span>언제든지 취소 가능</span>
            </div>
            <div class="flex items-center gap-2">
              <UIcon name="i-heroicons-check-circle-solid" />
              <span>24시간 고객 지원</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
