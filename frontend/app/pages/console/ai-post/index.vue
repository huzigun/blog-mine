<script lang="ts" setup>
definePageMeta({
  middleware: 'auth',
});

// 원고 타입 정의
interface PostType {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  gradient: string;
  path: string;
  category: 'review' | 'info';
}

const postTypes: PostType[] = [
  // 후기 카테고리
  {
    id: 'restaurant',
    title: '맛집 후기',
    description: '실제로 방문한 음식점에 대한 경험과 느낌을 공유하는 글',
    icon: 'i-heroicons-cake',
    color: 'text-orange-600',
    gradient: 'from-orange-500 to-red-500',
    path: '/console/ai-post/restaurant',
    category: 'review',
  },
  {
    id: 'product',
    title: '제품 후기',
    description: '실제로 사용한 제품에 대한 경험과 느낌을 공유하는 글',
    icon: 'i-heroicons-shopping-bag',
    color: 'text-pink-600',
    gradient: 'from-pink-500 to-rose-500',
    path: '/console/ai-post/product',
    category: 'review',
  },
  {
    id: 'travel',
    title: '여행 후기',
    description: '실제로 방문한 여행지에 대한 경험과 느낌을 공유하는 글',
    icon: 'i-heroicons-map',
    color: 'text-emerald-600',
    gradient: 'from-emerald-500 to-teal-500',
    path: '/console/ai-post/travel',
    category: 'review',
  },
  // 정보성 카테고리
  {
    id: 'general',
    title: '일반 키워드 정보성',
    description: '키워드에 대한 정보와 설명을 제공하는 글',
    icon: 'i-heroicons-document-text',
    color: 'text-blue-600',
    gradient: 'from-blue-500 to-indigo-500',
    path: '/console/ai-post/general',
    category: 'info',
  },
  {
    id: 'medical',
    title: '병/의원 의료상식 정보성',
    description: '병원 및 의료 관련 상식을 제공하는 글',
    icon: 'i-heroicons-heart',
    color: 'text-red-600',
    gradient: 'from-red-500 to-pink-500',
    path: '/console/ai-post/medical',
    category: 'info',
  },
  {
    id: 'legal',
    title: '법률상식 정보성',
    description: '법률 관련 상식을 제공하는 글',
    icon: 'i-heroicons-scale',
    color: 'text-purple-600',
    gradient: 'from-purple-500 to-violet-500',
    path: '/console/ai-post/legal',
    category: 'info',
  },
];

const reviewTypes = computed(() =>
  postTypes.filter((t) => t.category === 'review'),
);
const infoTypes = computed(() =>
  postTypes.filter((t) => t.category === 'info'),
);
</script>

<template>
  <SubscriptionGuard>
    <section class="container mx-auto max-w-5xl">
      <ConsoleTitle
        title="스마트 원고 생성"
        description="AI를 활용한 포스트 작성을 도와드립니다. 원고 유형을 선택해주세요."
      />

      <!-- 후기 카테고리 -->
      <div class="mb-10">
        <div class="flex items-center gap-2 mb-4">
          <div class="w-1 h-6 bg-primary-600 rounded-full" />
          <h2 class="text-lg font-bold text-neutral-900 dark:text-white">
            후기 원고
          </h2>
          <span class="text-sm text-neutral-500"
            >실제 경험을 바탕으로 한 리뷰 콘텐츠</span
          >
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <NuxtLink
            v-for="type in reviewTypes"
            :key="type.id"
            :to="type.path"
            class="group relative block p-6 rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:border-primary-300 dark:hover:border-primary-700 hover:shadow-lg transition-all duration-200"
          >
            <!-- 아이콘 -->
            <div
              class="w-14 h-14 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110"
              :class="`bg-linear-to-br ${type.gradient}`"
            >
              <UIcon :name="type.icon" class="w-7 h-7 text-white" />
            </div>

            <!-- 제목 -->
            <h3
              class="text-lg font-bold text-neutral-900 dark:text-white mb-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors"
            >
              {{ type.title }}
            </h3>

            <!-- 설명 -->
            <p
              class="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed"
            >
              {{ type.description }}
            </p>

            <!-- 화살표 -->
            <div
              class="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <UIcon
                name="i-heroicons-arrow-right"
                class="w-5 h-5 text-primary-600"
              />
            </div>
          </NuxtLink>
        </div>
      </div>

      <!-- 정보성 카테고리 -->
      <div>
        <div class="flex items-center gap-2 mb-4">
          <div class="w-1 h-6 bg-blue-600 rounded-full" />
          <h2 class="text-lg font-bold text-neutral-900 dark:text-white">
            정보성 원고
          </h2>
          <span class="text-sm text-neutral-500"
            >전문 지식과 정보를 전달하는 콘텐츠</span
          >
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <NuxtLink
            v-for="type in infoTypes"
            :key="type.id"
            :to="type.path"
            class="group relative block p-6 rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:border-primary-300 dark:hover:border-primary-700 hover:shadow-lg transition-all duration-200"
          >
            <!-- 아이콘 -->
            <div
              class="w-14 h-14 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110"
              :class="`bg-linear-to-br ${type.gradient}`"
            >
              <UIcon :name="type.icon" class="w-7 h-7 text-white" />
            </div>

            <!-- 제목 -->
            <h3
              class="text-lg font-bold text-neutral-900 dark:text-white mb-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors"
            >
              {{ type.title }}
            </h3>

            <!-- 설명 -->
            <p
              class="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed"
            >
              {{ type.description }}
            </p>

            <!-- 화살표 -->
            <div
              class="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <UIcon
                name="i-heroicons-arrow-right"
                class="w-5 h-5 text-primary-600"
              />
            </div>
          </NuxtLink>
        </div>
      </div>

      <!-- 안내 카드 -->
      <UCard
        variant="soft"
        class="mt-10 bg-primary-50 dark:bg-primary-950/20 border border-primary-200 dark:border-primary-800"
      >
        <div class="flex gap-3">
          <UIcon
            name="i-heroicons-light-bulb"
            class="w-5 h-5 text-primary-600 shrink-0 mt-0.5"
          />
          <div>
            <h4 class="font-semibold text-primary-900 dark:text-primary-100 mb-1">
              어떤 유형을 선택해야 할지 모르겠다면?
            </h4>
            <p
              class="text-sm text-primary-700 dark:text-primary-300 leading-relaxed"
            >
              <strong>후기 원고</strong>는 실제 경험을 바탕으로 한 리뷰에
              적합하고, <strong>정보성 원고</strong>는 전문 지식이나 정보 전달에
              적합합니다. 맛집, 제품, 여행 경험을 공유하고 싶다면 후기 원고를,
              특정 주제에 대한 설명이나 안내가 필요하다면 정보성 원고를
              선택하세요.
            </p>
          </div>
        </div>
      </UCard>
    </section>
  </SubscriptionGuard>
</template>
