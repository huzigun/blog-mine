<script setup lang="ts">
import { useAdminApiFetch, useAdminApi } from '~/composables/useAdminApi';
import { AdminPostPromptLogModal } from '#components';

interface AIPost {
  id: number;
  title: string | null;
  content: string;
  retryCount: number;
  lastError: string | null;
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
  createdAt: string;
}

interface PostDetail {
  id: number;
  displayId: string;
  keyword: string;
  persona: any;
  postType: string;
  subKeywords: string[];
  length: number;
  count: number;
  additionalFields: any;
  status: string;
  completedCount: number;
  targetCount: number;
  creditCost: number | null;
  lastError: string | null;
  errorAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: number;
    email: string;
    name: string | null;
  };
  posts: AIPost[];
}

definePageMeta({
  layout: 'admin',
  middleware: ['admin'],
});

const { hasMinRole } = useAdminAuth();
const route = useRoute();
const toast = useToast();
const overlay = useOverlay();

// 권한 체크
if (!hasMinRole('VIEWER')) {
  throw createError({
    statusCode: 403,
    statusMessage: '접근 권한이 없습니다.',
  });
}

const postId = computed(() => Number(route.params.id));

const { data: post, status, refresh } = await useAdminApiFetch<PostDetail>(
  `/admin/posts/${postId.value}`,
);

if (!post.value) {
  throw createError({
    statusCode: 404,
    statusMessage: '포스트를 찾을 수 없습니다.',
  });
}

const isLoading = computed(() => status.value === 'pending');

// 날짜 포맷
const formatDate = (dateString: string | null) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

// 상태 뱃지 색상
const getStatusColor = (status: string) => {
  switch (status) {
    case 'COMPLETED':
      return 'success';
    case 'IN_PROGRESS':
      return 'info';
    case 'PENDING':
      return 'warning';
    case 'FAILED':
      return 'error';
    default:
      return 'neutral';
  }
};

// 상태 라벨
const getStatusLabel = (status: string) => {
  switch (status) {
    case 'COMPLETED':
      return '완료';
    case 'IN_PROGRESS':
      return '진행중';
    case 'PENDING':
      return '대기중';
    case 'FAILED':
      return '실패';
    default:
      return status;
  }
};

// 재시도 처리
const isRetrying = ref(false);
const handleRetry = async () => {
  if (!hasMinRole('ADMIN')) {
    toast.add({
      title: '권한 없음',
      description: '재시도 권한이 없습니다.',
      color: 'error',
    });
    return;
  }

  isRetrying.value = true;
  try {
    await useAdminApi(`/admin/posts/${postId.value}/retry`, {
      method: 'POST',
    });

    toast.add({
      title: '재시도 성공',
      description: '포스트가 대기 상태로 변경되었습니다.',
      color: 'success',
    });

    await refresh();
  } catch (error: any) {
    toast.add({
      title: '재시도 실패',
      description: error.data?.message || '재시도에 실패했습니다.',
      color: 'error',
    });
  } finally {
    isRetrying.value = false;
  }
};

// 선택된 AI 포스트 인덱스
const selectedPostIndex = ref(0);
const selectedAIPost = computed(() => post.value?.posts[selectedPostIndex.value]);

// 프롬프트 로그 모달
const promptLogModal = overlay.create(AdminPostPromptLogModal);
const openPromptLogModal = (aiPostId: number) => {
  promptLogModal.open({ aiPostId });
};
</script>

<template>
  <div class="space-y-6">
    <!-- 페이지 헤더 -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-4">
        <UButton
          color="neutral"
          variant="ghost"
          icon="i-heroicons-arrow-left"
          to="/admin/posts"
        />
        <div>
          <h1 class="text-2xl font-bold text-neutral-900 dark:text-white">
            포스트 상세
          </h1>
          <p class="mt-1 text-sm text-neutral-500">
            {{ post?.displayId }}
          </p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <UBadge
          v-if="post"
          :color="getStatusColor(post.status)"
          size="lg"
        >
          {{ getStatusLabel(post.status) }}
        </UBadge>
        <UButton
          v-if="post?.status === 'FAILED' && hasMinRole('ADMIN')"
          color="warning"
          icon="i-heroicons-arrow-path"
          :loading="isRetrying"
          @click="handleRetry"
        >
          재시도
        </UButton>
      </div>
    </div>

    <div v-if="post" class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- 좌측: 포스트 정보 -->
      <div class="lg:col-span-1 space-y-6">
        <!-- 기본 정보 -->
        <UCard>
          <template #header>
            <h3 class="font-semibold">기본 정보</h3>
          </template>
          <dl class="space-y-4">
            <div>
              <dt class="text-sm text-neutral-500">키워드</dt>
              <dd class="font-medium">{{ post.keyword }}</dd>
            </div>
            <div v-if="post.subKeywords.length > 0">
              <dt class="text-sm text-neutral-500">서브 키워드</dt>
              <dd class="flex flex-wrap gap-1 mt-1">
                <UBadge
                  v-for="kw in post.subKeywords"
                  :key="kw"
                  color="neutral"
                  variant="subtle"
                >
                  {{ kw }}
                </UBadge>
              </dd>
            </div>
            <div>
              <dt class="text-sm text-neutral-500">포스트 유형</dt>
              <dd>{{ post.postType }}</dd>
            </div>
            <div>
              <dt class="text-sm text-neutral-500">글자수</dt>
              <dd>{{ post.length.toLocaleString() }}자</dd>
            </div>
            <div>
              <dt class="text-sm text-neutral-500">생성 개수</dt>
              <dd>{{ post.count }}개</dd>
            </div>
            <div v-if="post.creditCost">
              <dt class="text-sm text-neutral-500">소비 크레딧</dt>
              <dd class="font-medium text-primary-600">
                {{ post.creditCost.toLocaleString() }}
              </dd>
            </div>
          </dl>
        </UCard>

        <!-- 사용자 정보 -->
        <UCard>
          <template #header>
            <h3 class="font-semibold">사용자</h3>
          </template>
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
              <UIcon name="i-heroicons-user" class="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <NuxtLink
                :to="`/admin/users/${post.user.id}`"
                class="font-medium text-primary-600 hover:underline"
              >
                {{ post.user.email }}
              </NuxtLink>
              <p class="text-sm text-neutral-500">
                {{ post.user.name || '-' }}
              </p>
            </div>
          </div>
        </UCard>

        <!-- 진행 상태 -->
        <UCard>
          <template #header>
            <h3 class="font-semibold">진행 상태</h3>
          </template>
          <div class="space-y-4">
            <div>
              <div class="flex justify-between text-sm mb-1">
                <span class="text-neutral-500">완료율</span>
                <span class="font-medium">
                  {{ post.completedCount }}/{{ post.targetCount }}
                </span>
              </div>
              <div class="w-full h-3 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                <div
                  class="h-full bg-primary-500 transition-all"
                  :style="{
                    width: `${(post.completedCount / post.targetCount) * 100}%`,
                  }"
                />
              </div>
            </div>
            <dl class="space-y-2 text-sm">
              <div class="flex justify-between">
                <dt class="text-neutral-500">생성일</dt>
                <dd>{{ formatDate(post.createdAt) }}</dd>
              </div>
              <div v-if="post.startedAt" class="flex justify-between">
                <dt class="text-neutral-500">시작일</dt>
                <dd>{{ formatDate(post.startedAt) }}</dd>
              </div>
              <div v-if="post.completedAt" class="flex justify-between">
                <dt class="text-neutral-500">완료일</dt>
                <dd>{{ formatDate(post.completedAt) }}</dd>
              </div>
            </dl>
          </div>
        </UCard>

        <!-- 에러 정보 -->
        <UCard v-if="post.lastError">
          <template #header>
            <h3 class="font-semibold text-error-600">에러 정보</h3>
          </template>
          <div class="space-y-2">
            <p class="text-sm text-error-600 break-all">
              {{ post.lastError }}
            </p>
            <p v-if="post.errorAt" class="text-xs text-neutral-500">
              발생일: {{ formatDate(post.errorAt) }}
            </p>
          </div>
        </UCard>

        <!-- 페르소나 정보 -->
        <UCard v-if="post.persona">
          <template #header>
            <h3 class="font-semibold">페르소나</h3>
          </template>
          <pre class="text-xs bg-neutral-100 dark:bg-neutral-800 p-3 rounded-lg overflow-auto max-h-48">{{ JSON.stringify(post.persona, null, 2) }}</pre>
        </UCard>
      </div>

      <!-- 우측: AI 생성 포스트 -->
      <div class="lg:col-span-2">
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="font-semibold">생성된 원고 ({{ post.posts.length }}개)</h3>
              <div v-if="post.posts.length > 1" class="flex items-center gap-2">
                <UButton
                  color="neutral"
                  variant="ghost"
                  size="sm"
                  icon="i-heroicons-chevron-left"
                  :disabled="selectedPostIndex === 0"
                  @click="selectedPostIndex--"
                />
                <span class="text-sm text-neutral-500">
                  {{ selectedPostIndex + 1 }} / {{ post.posts.length }}
                </span>
                <UButton
                  color="neutral"
                  variant="ghost"
                  size="sm"
                  icon="i-heroicons-chevron-right"
                  :disabled="selectedPostIndex >= post.posts.length - 1"
                  @click="selectedPostIndex++"
                />
              </div>
            </div>
          </template>

          <div v-if="selectedAIPost" class="space-y-4">
            <!-- 원고 메타 정보 -->
            <div class="flex items-center justify-between">
              <div class="flex flex-wrap gap-4 text-sm text-neutral-500">
                <span v-if="selectedAIPost.totalTokens">
                  토큰: {{ selectedAIPost.totalTokens.toLocaleString() }}
                </span>
                <span v-if="selectedAIPost.retryCount > 0">
                  재시도: {{ selectedAIPost.retryCount }}회
                </span>
                <span>
                  생성일: {{ formatDate(selectedAIPost.createdAt) }}
                </span>
              </div>
              <UButton
                color="neutral"
                variant="outline"
                size="sm"
                icon="i-heroicons-code-bracket"
                @click="openPromptLogModal(selectedAIPost.id)"
              >
                프롬프트 보기
              </UButton>
            </div>

            <!-- 제목 -->
            <div v-if="selectedAIPost.title">
              <h4 class="font-semibold text-lg mb-2">{{ selectedAIPost.title }}</h4>
            </div>

            <!-- 내용 -->
            <div
              class="prose prose-neutral dark:prose-invert max-w-none bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-lg max-h-[600px] overflow-y-auto"
              v-html="selectedAIPost.content.replace(/\n/g, '<br>')"
            />

            <!-- 에러 정보 -->
            <div
              v-if="selectedAIPost.lastError"
              class="bg-error-50 dark:bg-error-900/20 text-error-600 p-3 rounded-lg text-sm"
            >
              {{ selectedAIPost.lastError }}
            </div>
          </div>

          <div
            v-else
            class="flex flex-col items-center justify-center py-12 text-neutral-500"
          >
            <UIcon
              name="i-heroicons-document-text"
              class="w-12 h-12 mb-4"
            />
            <p>생성된 원고가 없습니다.</p>
          </div>
        </UCard>
      </div>
    </div>
  </div>
</template>
