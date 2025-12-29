<script lang="ts" setup>
interface Props {
  blogPost: BlogPost;
  showProgress?: boolean;
  compact?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  showProgress: true,
  compact: false,
});

// Status badge color mapping
const getStatusColor = (
  status: BlogPost['status']
): 'neutral' | 'primary' | 'success' | 'error' => {
  switch (status) {
    case 'PENDING':
      return 'neutral';
    case 'IN_PROGRESS':
      return 'primary';
    case 'COMPLETED':
      return 'success';
    case 'FAILED':
      return 'error';
    default:
      return 'neutral';
  }
};

// Status text mapping
const getStatusText = (status: BlogPost['status']): string => {
  switch (status) {
    case 'PENDING':
      return '대기중';
    case 'IN_PROGRESS':
      return '생성중';
    case 'COMPLETED':
      return '완료';
    case 'FAILED':
      return '실패';
    default:
      return status;
  }
};

// Progress calculation
const progress = computed(() => {
  if (!props.blogPost) return 0;
  return Math.round(
    (props.blogPost.completedCount / props.blogPost.targetCount) * 100
  );
});

// Progress color
const progressColor = computed<'neutral' | 'primary' | 'success'>(() => {
  if (progress.value >= 100) return 'success';
  if (progress.value >= 50) return 'primary';
  return 'neutral';
});

// Format date
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <h2 class="text-xl font-bold text-neutral-900 dark:text-neutral-100">
          {{ compact ? '원고 정보' : '원고 설정 정보' }}
        </h2>
        <UBadge :color="getStatusColor(blogPost.status)" size="lg">
          {{ getStatusText(blogPost.status) }}
        </UBadge>
      </div>
    </template>

    <!-- Compact Mode -->
    <div v-if="compact" class="flex items-center gap-6">
      <!-- 키워드 & 포스트 유형 -->
      <div class="flex-1">
        <div class="flex items-center gap-3 mb-2">
          <span class="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            {{ blogPost.keyword }}
          </span>
          <UBadge color="neutral" variant="soft">
            {{ blogPost.postType }}
          </UBadge>
        </div>
        <div class="flex items-center gap-4 text-sm text-neutral-500">
          <span>{{ blogPost.length.toLocaleString() }}자</span>
          <span>{{ formatDate(blogPost.createdAt) }}</span>
        </div>
      </div>

      <!-- 진행 상황 -->
      <div v-if="showProgress" class="w-48">
        <div class="flex items-center justify-between mb-1">
          <span class="text-sm text-neutral-600 dark:text-neutral-400">
            {{ blogPost.completedCount }} / {{ blogPost.targetCount }} 완료
          </span>
          <span
            class="text-sm font-semibold"
            :class="{
              'text-success': progress >= 100,
              'text-primary': progress >= 50 && progress < 100,
              'text-neutral-600': progress < 50,
            }"
          >
            {{ progress }}%
          </span>
        </div>
        <UProgress :model-value="progress" :color="progressColor" size="md" />
      </div>
    </div>

    <!-- Full Mode -->
    <template v-else>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Left Column -->
        <div class="space-y-4">
          <div>
            <label
              class="text-sm font-medium text-neutral-600 dark:text-neutral-400"
            >
              키워드
            </label>
            <p
              class="mt-1 text-base font-semibold text-neutral-900 dark:text-neutral-100"
            >
              {{ blogPost.keyword }}
            </p>
          </div>

          <div>
            <label
              class="text-sm font-medium text-neutral-600 dark:text-neutral-400"
            >
              포스트 유형
            </label>
            <p class="mt-1 text-base text-neutral-900 dark:text-neutral-100">
              {{ blogPost.postType }}
            </p>
          </div>

          <div v-if="blogPost.subKeywords && blogPost.subKeywords.length > 0">
            <label
              class="text-sm font-medium text-neutral-600 dark:text-neutral-400"
            >
              서브 키워드
            </label>
            <div class="mt-2 flex flex-wrap gap-2">
              <UBadge
                v-for="(keyword, index) in blogPost.subKeywords"
                :key="index"
                color="neutral"
                variant="soft"
              >
                {{ keyword }}
              </UBadge>
            </div>
          </div>

          <div>
            <label
              class="text-sm font-medium text-neutral-600 dark:text-neutral-400"
            >
              글자 수
            </label>
            <p class="mt-1 text-base text-neutral-900 dark:text-neutral-100">
              {{ blogPost.length.toLocaleString() }}자
            </p>
          </div>
        </div>

        <!-- Right Column -->
        <div class="space-y-4">
          <div v-if="showProgress">
            <label
              class="text-sm font-medium text-neutral-600 dark:text-neutral-400"
            >
              진행 상황
            </label>
            <div class="mt-2">
              <div class="flex items-center justify-between mb-2">
                <span class="text-sm text-neutral-600 dark:text-neutral-400">
                  {{ blogPost.completedCount }} /
                  {{ blogPost.targetCount }} 완료
                </span>
                <span
                  class="text-sm font-semibold"
                  :class="{
                    'text-success': progress >= 100,
                    'text-primary': progress >= 50 && progress < 100,
                    'text-neutral-600': progress < 50,
                  }"
                >
                  {{ progress }}%
                </span>
              </div>
              <UProgress
                :model-value="progress"
                :color="progressColor"
                size="md"
              />
            </div>
          </div>

          <div>
            <label
              class="text-sm font-medium text-neutral-600 dark:text-neutral-400"
            >
              생성일
            </label>
            <p class="mt-1 text-base text-neutral-900 dark:text-neutral-100">
              {{ formatDate(blogPost.createdAt) }}
            </p>
          </div>
        </div>
      </div>

      <!-- Persona Info (if available) -->
      <div
        v-if="blogPost.persona && Object.keys(blogPost.persona).length > 0"
        class="mt-6 pt-6 border-t border-neutral-200 dark:border-neutral-700"
      >
        <h3
          class="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-3"
        >
          사용된 페르소나 정보
        </h3>

        <!-- Random Persona Display -->
        <div v-if="blogPost.persona.isRandom" class="text-sm">
          <UBadge color="primary" variant="soft" size="lg">
            <UIcon name="i-heroicons-sparkles" class="mr-1" />
            랜덤 페르소나
          </UBadge>
          <p class="mt-2 text-neutral-500">
            각 원고마다 랜덤하게 생성된 페르소나가 사용되었습니다.
          </p>
        </div>

        <!-- Fixed Persona Display -->
        <div v-else class="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div v-if="blogPost.persona.gender">
            <span class="text-neutral-500">성별:</span>
            <span class="ml-2 text-neutral-900 dark:text-neutral-100">
              {{ blogPost.persona.gender }}
            </span>
          </div>
          <div v-if="blogPost.persona.age">
            <span class="text-neutral-500">나이:</span>
            <span class="ml-2 text-neutral-900 dark:text-neutral-100">
              {{ blogPost.persona.age }}대
            </span>
          </div>
          <div v-if="blogPost.persona.occupation">
            <span class="text-neutral-500">직업:</span>
            <span class="ml-2 text-neutral-900 dark:text-neutral-100">
              {{ blogPost.persona.occupation }}
            </span>
          </div>
        </div>
      </div>
    </template>
  </UCard>
</template>
