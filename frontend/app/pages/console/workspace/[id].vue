<script lang="ts" setup>
import {
  UBadge,
  UButton,
  UCard,
  UIcon,
  USkeleton,
  UPagination,
} from '#components';
import DeployModal from '~/components/order/DeployModal.vue';
import DeployResultModal from '~/components/order/DeployResultModal.vue';

definePageMeta({
  middleware: ['auth'],
});

const route = useRoute();
const toast = useToast();
const overlay = useOverlay();
const deployModal = overlay.create(DeployModal);
const deployResultModal = overlay.create(DeployResultModal);
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

// 원고 생성 완료 여부 (BlogPost status가 COMPLETED 또는 FAILED)
const isGenerationComplete = computed(() => {
  if (!blogPost.value) return false;
  return (
    blogPost.value.status === 'COMPLETED' || blogPost.value.status === 'FAILED'
  );
});

// 성공적으로 생성된 원고 수 (posts 배열에 있는 것이 성공한 원고)
const successPostCount = computed(() => {
  if (!blogPost.value?.posts) return 0;
  return blogPost.value.posts.length;
});

// 이미 배포된 원고인지 확인
const isDeployed = computed(() => !!blogPost.value?.helloPostNo);

// 배포 요청 모달 열기
const openDeployModal = async () => {
  if (successPostCount.value === 0) {
    toast.add({
      title: '배포 불가',
      description: '성공적으로 생성된 원고가 없습니다.',
      color: 'error',
    });
    return;
  }

  const instance = deployModal.open({
    blogPostId: blogPostId.value,
    totalPostCount: successPostCount.value,
  });

  const result = await instance.result;
  if (result) {
    // 배포 요청 성공 시 새로고침
    await refresh();
  }
};

// 배포 결과 확인 모달 열기
const openDeployResultModal = () => {
  if (!blogPost.value?.helloPostNo) {
    toast.add({
      title: '조회 불가',
      description: '배포되지 않은 원고입니다.',
      color: 'error',
    });
    return;
  }

  deployResultModal.open({
    blogPostId: blogPostId.value,
    helloPostNo: blogPost.value.helloPostNo,
  });
};
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
      <BlogPostSummaryCard :blog-post="blogPost" />

      <!-- 배포 신청 완료 상태 (이미 배포된 경우) -->
      <div
        v-if="isDeployed"
        class="p-4 rounded-xl bg-linear-to-r from-success-50 to-emerald-50 dark:from-success-950/30 dark:to-emerald-950/30 border border-success-200 dark:border-success-800"
      >
        <div class="flex items-center justify-between">
          <div>
            <h3
              class="font-semibold text-neutral-900 dark:text-white flex items-center gap-2"
            >
              <UIcon
                name="i-heroicons-check-circle"
                class="w-5 h-5 text-success-600"
              />
              배포 신청 완료
            </h3>
            <p class="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
              배포번호: #{{ blogPost.helloPostNo }}
              <span v-if="blogPost.deployedAt" class="ml-2">
                ({{
                  new Date(blogPost.deployedAt).toLocaleDateString('ko-KR')
                }})
              </span>
            </p>
          </div>
          <UButton
            color="success"
            size="lg"
            @click="openDeployResultModal"
            class="shrink-0"
          >
            <UIcon name="i-heroicons-chart-bar-square" class="w-5 h-5 mr-2" />
            배포 결과 확인
          </UButton>
        </div>
      </div>

      <!-- 배포 요청 버튼 (원고 생성 완료 시에만 표시, 아직 배포 안 된 경우) -->
      <div
        v-else-if="isGenerationComplete && successPostCount > 0"
        class="p-4 rounded-xl bg-linear-to-r from-primary-50 to-blue-50 dark:from-primary-950/30 dark:to-blue-950/30 border border-primary-200 dark:border-primary-800"
      >
        <div class="flex items-center justify-between">
          <div>
            <h3 class="font-semibold text-neutral-900 dark:text-white">
              원고 생성 완료
            </h3>
            <p class="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
              {{ successPostCount }}개의 원고가 준비되었습니다. 블로그에
              배포하시겠습니까?
            </p>
          </div>
          <UButton
            color="primary"
            size="lg"
            @click="openDeployModal"
            class="shrink-0"
          >
            <UIcon name="i-heroicons-rocket-launch" class="w-5 h-5 mr-2" />
            배포 요청
          </UButton>
        </div>
      </div>

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
          <div v-if="totalPages > 1" class="flex justify-center mt-6">
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
