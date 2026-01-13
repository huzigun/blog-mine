<script lang="ts" setup>
import { UButton, UBadge, UIcon } from '#components';

const MAX_EDITS = 3;

const props = defineProps<{
  post: AIPost;
  index: number;
  blogPostId: number;
  defaultExpanded?: boolean;
}>();

const emit = defineEmits<{
  copyText: [content: string];
  copyHtml: [content: string];
  edit: [post: AIPost];
}>();

const toast = useToast();

// 남은 수정 횟수
const remainingEdits = computed(() => MAX_EDITS - (props.post.editCount || 0));

// 수정 가능 여부
const canEdit = computed(() => remainingEdits.value > 0);

// Expand/collapse state
const isExpanded = ref(props.defaultExpanded ?? false);

// 버전 선택 상태
const selectedVersion = ref(props.post.currentVersion || 1);
const versions = ref<AIPostVersion[]>([]);
const isLoadingVersions = ref(false);
const versionContent = ref<{ title: string | null; content: string } | null>(null);

// 버전 데이터가 수정된 경우 동기화
watch(
  () => props.post.currentVersion,
  (newVersion) => {
    if (newVersion && newVersion !== selectedVersion.value) {
      selectedVersion.value = newVersion;
      // 버전 목록 새로고침
      if (props.post.editCount && props.post.editCount > 0) {
        loadVersions();
      }
    }
  },
);

// 버전 옵션 목록
const versionOptions = computed(() => {
  const options = [{ value: 1, label: 'v1 (원본)' }];
  versions.value.forEach((v) => {
    const label = v.editRequest
      ? `v${v.version} - ${v.editRequest.substring(0, 15)}${v.editRequest.length > 15 ? '...' : ''}`
      : `v${v.version}`;
    options.push({ value: v.version, label });
  });
  return options;
});

// 현재 표시할 콘텐츠 (선택된 버전의 콘텐츠)
const displayContent = computed(() => {
  // 현재 버전이 선택된 경우 post의 내용 사용
  if (selectedVersion.value === props.post.currentVersion) {
    return {
      title: props.post.title,
      content: props.post.content,
    };
  }
  // 다른 버전이 선택된 경우 versionContent 사용
  if (versionContent.value) {
    return versionContent.value;
  }
  // 기본값
  return {
    title: props.post.title,
    content: props.post.content,
  };
});

// 수정 기록이 있는 경우에만 버전 선택 표시
const hasVersionHistory = computed(() => {
  return props.post.editCount && props.post.editCount > 0;
});

// 버전 목록 로드
const loadVersions = async () => {
  if (isLoadingVersions.value) return;
  isLoadingVersions.value = true;
  try {
    const data = await useApi<AIPostVersionListResponse>(
      `/blog-posts/${props.blogPostId}/posts/${props.post.id}/versions`,
    );
    versions.value = data.versions.filter((v) => v.version > 1);
  } catch (err: any) {
    console.error('Failed to load versions:', err);
  } finally {
    isLoadingVersions.value = false;
  }
};

// 특정 버전 콘텐츠 로드
const loadVersionContent = async (version: number) => {
  // 현재 버전이면 로드 불필요
  if (version === props.post.currentVersion) {
    versionContent.value = null;
    return;
  }

  try {
    const data = await useApi<AIPostVersion>(
      `/blog-posts/${props.blogPostId}/posts/${props.post.id}/versions/${version}`,
    );
    versionContent.value = {
      title: data.title,
      content: data.content,
    };
  } catch (err: any) {
    toast.add({
      title: '버전 조회 실패',
      description: err.message || '해당 버전을 불러올 수 없습니다.',
      color: 'error',
    });
    // 실패 시 현재 버전으로 되돌림
    selectedVersion.value = props.post.currentVersion || 1;
    versionContent.value = null;
  }
};

// 버전 변경 핸들러
const handleVersionChange = (event: Event) => {
  const target = event.target as HTMLSelectElement;
  const newVersion = parseInt(target.value, 10);
  selectedVersion.value = newVersion;
  loadVersionContent(newVersion);
};

// 컴포넌트 마운트 시 버전 목록 로드 (수정 기록이 있는 경우)
onMounted(() => {
  if (hasVersionHistory.value) {
    loadVersions();
  }
});

const toggleExpand = () => {
  isExpanded.value = !isExpanded.value;
};

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

// Extract text from HTML for preview
const getTextPreview = (htmlContent: string, maxLength = 200): string => {
  const text = htmlContent.replace(/<[^>]*>/g, '').trim();
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};
</script>

<template>
  <div
    class="border border-neutral-200 dark:border-neutral-700 rounded-lg p-4 hover:border-primary-300 dark:hover:border-primary-700 transition-colors"
  >
    <!-- Post Header -->
    <div class="flex items-start justify-between mb-3">
      <div class="flex-1">
        <div class="flex items-center gap-2 mb-1">
          <span class="text-xs font-semibold text-neutral-500">
            #{{ index + 1 }}
          </span>
          <span class="text-xs text-neutral-400">
            {{ formatDate(post.createdAt) }}
          </span>
          <!-- 버전 선택 드롭다운 (수정 기록이 있는 경우) -->
          <select
            v-if="hasVersionHistory"
            :value="selectedVersion"
            class="text-xs px-2 py-0.5 border border-neutral-300 dark:border-neutral-600 rounded bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
            @change="handleVersionChange"
          >
            <option
              v-for="option in versionOptions"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
          <!-- 버전 배지 (드롭다운이 없을 때 현재 버전 표시) -->
          <UBadge
            v-else-if="post.currentVersion && post.currentVersion > 1"
            color="primary"
            variant="soft"
            size="xs"
          >
            v{{ post.currentVersion }}
          </UBadge>
          <!-- 수정 횟수 표시 -->
          <UBadge
            v-if="post.editCount !== undefined"
            :color="canEdit ? 'neutral' : 'warning'"
            variant="soft"
            size="xs"
          >
            수정 {{ post.editCount || 0 }}/{{ MAX_EDITS }}
          </UBadge>
          <!-- 현재 버전이 아닌 경우 표시 -->
          <UBadge
            v-if="selectedVersion !== post.currentVersion"
            color="warning"
            variant="soft"
            size="xs"
          >
            이전 버전 보기
          </UBadge>
        </div>
        <h3 class="text-lg font-bold text-primary-600 dark:text-primary-400">
          {{ displayContent.title || '제목 없음' }}
        </h3>
      </div>
      <div class="flex gap-2">
        <UButton
          icon="i-heroicons-sparkles"
          size="sm"
          :disabled="!canEdit"
          :class="canEdit
            ? 'bg-linear-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold'
            : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-400 cursor-not-allowed'"
          @click="emit('edit', post)"
        >
          AI 수정
        </UButton>
        <UButton
          icon="i-heroicons-document-text"
          variant="soft"
          size="sm"
          color="success"
          @click="emit('copyText', displayContent.content)"
        >
          텍스트
        </UButton>
        <UButton
          icon="i-heroicons-code-bracket"
          variant="soft"
          size="sm"
          color="info"
          @click="emit('copyHtml', displayContent.content)"
        >
          HTML
        </UButton>
        <UButton
          :icon="isExpanded ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'"
          variant="ghost"
          size="sm"
          color="neutral"
          @click="toggleExpand"
        >
          {{ isExpanded ? '접기' : '펼치기' }}
        </UButton>
      </div>
    </div>

    <!-- Post Content Preview/Full -->
    <div class="mt-3">
      <!-- HTML 렌더링 (펼쳤을 때) -->
      <div
        v-if="isExpanded"
        class="blog-content"
        v-html="displayContent.content"
      />
      <!-- 텍스트 미리보기 (접았을 때) -->
      <div
        v-else
        class="text-sm text-neutral-600 dark:text-neutral-400 line-clamp-3"
      >
        {{ getTextPreview(displayContent.content) }}
      </div>
    </div>

    <!-- Error Indicator (if exists) -->
    <div
      v-if="post.lastError"
      class="mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center gap-2 text-xs text-error"
    >
      <UIcon name="i-heroicons-exclamation-triangle" class="inline w-3.5 h-3.5" />
      <span>생성 중 오류가 발생했습니다</span>
    </div>
  </div>
</template>

<style scoped>
.blog-content {
  line-height: 1.625;
}

/* 제목 스타일 - 콘텐츠 내부 */
.blog-content :deep(h1) {
  font-size: 1.5rem;
  font-weight: 700;
  margin-top: 1.5rem;
  margin-bottom: 1rem;
  color: rgb(23 23 23); /* neutral-900 */
}

.dark .blog-content :deep(h1) {
  color: rgb(250 250 250); /* neutral-50 */
}

.blog-content :deep(h1:first-child) {
  margin-top: 0;
}

.blog-content :deep(h2) {
  font-size: 1.125rem; /* h3보다 작게 조정 */
  font-weight: 700;
  margin-top: 1.25rem;
  margin-bottom: 0.75rem;
  color: rgb(64 64 64); /* neutral-700 */
}

.dark .blog-content :deep(h2) {
  color: rgb(212 212 212); /* neutral-300 */
}

.blog-content :deep(h2:first-child) {
  margin-top: 0;
}

.blog-content :deep(h3) {
  font-size: 1rem;
  font-weight: 600;
  margin-top: 1rem;
  margin-bottom: 0.75rem;
  color: rgb(82 82 82); /* neutral-600 */
}

.dark .blog-content :deep(h3) {
  color: rgb(212 212 212); /* neutral-300 */
}

.blog-content :deep(h3:first-child) {
  margin-top: 0;
}

.blog-content :deep(h4) {
  font-size: 1rem;
  font-weight: 600;
  margin-top: 1rem;
  margin-bottom: 0.5rem;
}

.blog-content :deep(h4:first-child) {
  margin-top: 0;
}

.blog-content :deep(h5) {
  font-size: 0.875rem;
  font-weight: 600;
  margin-top: 0.75rem;
  margin-bottom: 0.5rem;
}

.blog-content :deep(h5:first-child) {
  margin-top: 0;
}

.blog-content :deep(h6) {
  font-size: 0.875rem;
  font-weight: 500;
  margin-top: 0.75rem;
  margin-bottom: 0.5rem;
}

.blog-content :deep(h6:first-child) {
  margin-top: 0;
}

/* 문단 스타일 */
.blog-content :deep(p) {
  font-size: 1rem;
  margin-bottom: 1rem;
  line-height: 1.75;
}

.blog-content :deep(p:last-child) {
  margin-bottom: 0;
}

/* 순서 있는 목록 */
.blog-content :deep(ol) {
  list-style-type: decimal;
  list-style-position: inside;
  padding-left: 1.5rem;
  margin-bottom: 1rem;
}

.blog-content :deep(ol li) {
  margin-bottom: 0.5rem;
}

/* 순서 없는 목록 */
.blog-content :deep(ul) {
  list-style-type: disc;
  list-style-position: inside;
  padding-left: 1.5rem;
  margin-bottom: 1rem;
}

.blog-content :deep(ul li) {
  margin-bottom: 0.5rem;
}

/* 목록 항목 */
.blog-content :deep(li) {
  font-size: 1rem;
  line-height: 1.625;
}

/* 중첩된 목록 */
.blog-content :deep(ol ol),
.blog-content :deep(ol ul),
.blog-content :deep(ul ol),
.blog-content :deep(ul ul) {
  margin-top: 0.5rem;
  margin-bottom: 0;
}
</style>
