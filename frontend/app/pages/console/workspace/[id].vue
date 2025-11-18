<script lang="ts" setup>
import {
  UBadge,
  UButton,
  UCard,
  UProgress,
  UIcon,
  USkeleton,
  UPagination,
} from '#components';

definePageMeta({
  middleware: ['auth'],
});

const route = useRoute();
const blogPostId = computed(() => Number(route.params.id));

// Fetch blog post detail with generated posts
const {
  data: blogPost,
  status,
  refresh,
} = await useApiFetch<BlogPost>(`/blog-posts/${blogPostId.value}`);

// Auto-refresh every 5 seconds if status is IN_PROGRESS
const refreshInterval = ref<NodeJS.Timeout | null>(null);

watchEffect(() => {
  if (blogPost.value?.status === 'IN_PROGRESS') {
    if (!refreshInterval.value) {
      refreshInterval.value = setInterval(() => {
        refresh();
      }, 5000); // 5초마다 갱신
    }
  } else {
    if (refreshInterval.value) {
      clearInterval(refreshInterval.value);
      refreshInterval.value = null;
    }
  }
});

// Cleanup on unmount
onUnmounted(() => {
  if (refreshInterval.value) {
    clearInterval(refreshInterval.value);
  }
});

// Status badge color mapping
const getStatusColor = (
  status: BlogPost['status'],
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
  if (!blogPost.value) return 0;
  return Math.round(
    (blogPost.value.completedCount / blogPost.value.targetCount) * 100,
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

// Copy HTML to clipboard
const copyHtmlToClipboard = async (html: string) => {
  try {
    await navigator.clipboard.writeText(html);
    useToast().add({
      title: 'HTML 복사 완료',
      description: 'HTML 형식으로 클립보드에 복사되었습니다.',
      color: 'success',
    });
  } catch (error) {
    useToast().add({
      title: '복사 실패',
      description: '클립보드 복사에 실패했습니다.',
      color: 'error',
    });
  }
};

// Copy as plain text (remove tags and add line breaks)
const copyTextToClipboard = async (html: string) => {
  try {
    // HTML을 텍스트로 변환: 태그 제거하고 각 태그 종료마다 줄바꿈
    let text = html
      // p, h1-h6, li 태그 종료 후 줄바꿈 2개
      .replace(/<\/(p|h[1-6]|li)>/gi, '\n\n')
      // br 태그를 줄바꿈으로
      .replace(/<br\s*\/?>/gi, '\n')
      // 나머지 모든 HTML 태그 제거
      .replace(/<[^>]*>/g, '')
      // HTML 엔티티 디코딩
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      // 연속된 줄바꿈을 2개로 제한
      .replace(/\n{3,}/g, '\n\n')
      // 앞뒤 공백 제거
      .trim();

    await navigator.clipboard.writeText(text);
    useToast().add({
      title: '텍스트 복사 완료',
      description: '텍스트 형식으로 클립보드에 복사되었습니다.',
      color: 'success',
    });
  } catch (error) {
    useToast().add({
      title: '복사 실패',
      description: '클립보드 복사에 실패했습니다.',
      color: 'error',
    });
  }
};

// Pagination
const currentPage = ref(1);
const itemsPerPage = 10;

const paginatedPosts = computed(() => {
  if (!blogPost.value?.posts) return [];
  const start = (currentPage.value - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  return blogPost.value.posts.slice(start, end);
});

const totalPages = computed(() => {
  if (!blogPost.value?.posts) return 0;
  return Math.ceil(blogPost.value.posts.length / itemsPerPage);
});

</script>

<template>
  <section class="container mx-auto max-w-6xl">
    <!-- Header -->
    <div class="flex items-center gap-4 mb-6">
      <UButton
        icon="i-heroicons-arrow-left"
        variant="ghost"
        color="neutral"
        @click="navigateTo('/console/workspace')"
      >
        목록으로
      </UButton>
      <ConsoleTitle
        title="원고 상세"
        :description="
          blogPost
            ? `${blogPost.keyword} 키워드로 생성된 원고`
            : '원고를 불러오는 중...'
        "
      />
    </div>

    <!-- Loading State -->
    <div v-if="status === 'pending'" class="space-y-6">
      <UCard>
        <USkeleton class="h-8 w-48 mb-4" />
        <USkeleton class="h-4 w-full mb-2" />
        <USkeleton class="h-4 w-3/4" />
      </UCard>
    </div>

    <!-- Error State -->
    <div v-else-if="!blogPost" class="text-center py-12">
      <UIcon
        name="i-heroicons-exclamation-triangle"
        class="w-12 h-12 text-error mx-auto mb-4"
      />
      <p
        class="text-lg font-semibold text-neutral-700 dark:text-neutral-300 mb-2"
      >
        원고를 찾을 수 없습니다
      </p>
      <p class="text-sm text-neutral-500 mb-6">
        존재하지 않거나 접근 권한이 없는 원고입니다.
      </p>
      <UButton color="primary" @click="navigateTo('/console/workspace')">
        목록으로 돌아가기
      </UButton>
    </div>

    <!-- Content -->
    <div v-else class="space-y-6">
      <!-- Settings Card -->
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h2
              class="text-xl font-bold text-neutral-900 dark:text-neutral-100"
            >
              원고 설정 정보
            </h2>
            <UBadge :color="getStatusColor(blogPost.status)" size="lg">
              {{ getStatusText(blogPost.status) }}
            </UBadge>
          </div>
        </template>

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
            <div>
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
          <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
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
            <div v-if="blogPost.persona.blogStyle">
              <span class="text-neutral-500">스타일:</span>
              <span class="ml-2 text-neutral-900 dark:text-neutral-100">
                {{ blogPost.persona.blogStyle }}
              </span>
            </div>
          </div>
        </div>
      </UCard>

      <!-- Generated Posts Card -->
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h2
              class="text-xl font-bold text-neutral-900 dark:text-neutral-100"
            >
              생성된 원고 목록
              <span class="ml-2 text-base font-normal text-neutral-500">
                ({{ blogPost.posts?.length || 0 }}개)
              </span>
            </h2>
            <UButton
              v-if="blogPost.status === 'IN_PROGRESS'"
              icon="i-heroicons-arrow-path"
              variant="soft"
              size="sm"
              @click="() => refresh()"
            >
              새로고침
            </UButton>
          </div>
        </template>

        <!-- Empty State -->
        <div
          v-if="!blogPost.posts || blogPost.posts.length === 0"
          class="text-center py-12"
        >
          <UIcon
            name="i-heroicons-document-text"
            class="w-12 h-12 text-neutral-400 mx-auto mb-4"
          />
          <p class="text-neutral-600 dark:text-neutral-400">
            생성된 원고가 없습니다.
          </p>
          <p
            v-if="blogPost.status === 'IN_PROGRESS'"
            class="text-sm text-neutral-500 mt-2"
          >
            원고를 생성하는 중입니다. 잠시만 기다려주세요...
          </p>
        </div>

        <!-- Posts List -->
        <div v-else>
          <div class="space-y-4">
            <BlogPostItem
              v-for="(post, index) in paginatedPosts"
              :key="post.id"
              :post="post"
              :index="(currentPage - 1) * itemsPerPage + index"
              @copy-text="copyTextToClipboard"
              @copy-html="copyHtmlToClipboard"
            />
          </div>

          <!-- Pagination -->
          <div
            v-if="totalPages > 1"
            class="flex justify-center mt-6"
          >
            <UPagination
              v-model="currentPage"
              :total="blogPost.posts.length"
              :page-count="itemsPerPage"
            />
          </div>
        </div>
      </UCard>
    </div>
  </section>
</template>
