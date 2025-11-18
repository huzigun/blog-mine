<script lang="ts" setup>
import { UButton, UBadge, UIcon } from '#components';

const props = defineProps<{
  post: AIPost;
  index: number;
}>();

const emit = defineEmits<{
  copyText: [content: string];
  copyHtml: [content: string];
}>();

// Expand/collapse state
const isExpanded = ref(false);

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
        </div>
        <h3 class="text-lg font-bold text-primary-600 dark:text-primary-400">
          {{ post.title || '제목 없음' }}
        </h3>
      </div>
      <div class="flex gap-2">
        <UButton
          icon="i-heroicons-document-text"
          variant="soft"
          size="sm"
          color="success"
          @click="emit('copyText', post.content)"
        >
          텍스트
        </UButton>
        <UButton
          icon="i-heroicons-code-bracket"
          variant="soft"
          size="sm"
          color="info"
          @click="emit('copyHtml', post.content)"
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
        v-html="post.content"
      />
      <!-- 텍스트 미리보기 (접았을 때) -->
      <div
        v-else
        class="text-sm text-neutral-600 dark:text-neutral-400 line-clamp-3"
      >
        {{ getTextPreview(post.content) }}
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
