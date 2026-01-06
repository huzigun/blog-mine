<script lang="ts" setup>
import { UButton, UIcon, USlideover, UTextarea, UBadge } from '#components';

const MAX_EDITS = 3;

const props = defineProps<{
  post: AIPost;
  blogPostId: number;
}>();

const emit = defineEmits<{
  close: [updated: boolean];
  updated: [post: AIPost];
}>();

const toast = useToast();
const [isPending, startTransition] = useTransition();

// 스크롤 영역 ref
const historyContainer = ref<HTMLElement | null>(null);

// 스크롤을 맨 아래로 이동
const scrollToBottom = () => {
  nextTick(() => {
    if (historyContainer.value) {
      historyContainer.value.scrollTop = historyContainer.value.scrollHeight;
    }
  });
};

// 수정 요청 입력
const editRequest = ref('');

// 카드 접기/펼치기 상태 (index 기반, 기본값: 접힘)
const expandedCards = ref<Set<number>>(new Set());

// 카드 접기/펼치기 토글
const toggleCardExpand = (index: number) => {
  if (expandedCards.value.has(index)) {
    expandedCards.value.delete(index);
  } else {
    expandedCards.value.add(index);
  }
};

// 카드가 펼쳐져 있는지 확인
const isCardExpanded = (index: number) => {
  return expandedCards.value.has(index);
};

// 텍스트 미리보기 (HTML 태그 제거 후 일부만 표시)
const getTextPreview = (html: string | undefined, maxLength = 150): string => {
  if (!html) return '';
  const text = html.replace(/<[^>]*>/g, '').trim();
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

// 버전 히스토리 (원본 + 수정 요청 + 수정본 순서로 표시)
interface VersionHistoryItem {
  type: 'original' | 'request' | 'edited' | 'error';
  version?: number;
  title?: string;
  content?: string;
  message?: string;
  timestamp: Date;
}

const versionHistory = ref<VersionHistoryItem[]>([]);

// 버전 목록
const versions = ref<AIPostVersion[]>([]);
const isLoadingVersions = ref(false);

// 원본 콘텐츠 (v1)
const originalContent = ref<{ title: string | null; content: string } | null>(null);

// 남은 수정 횟수
const remainingEdits = computed(() => MAX_EDITS - props.post.editCount);

// 수정 가능 여부
const canEdit = computed(() => remainingEdits.value > 0);

// 버전 히스토리 구성
const buildVersionHistory = () => {
  const history: VersionHistoryItem[] = [];

  // 1. 원본 (v1) 추가
  if (originalContent.value) {
    history.push({
      type: 'original',
      version: 1,
      title: originalContent.value.title || '제목 없음',
      content: originalContent.value.content,
      timestamp: new Date(props.post.createdAt),
    });
  }

  // 2. 각 버전별로 요청 → 수정본 순서로 추가
  versions.value.forEach((v) => {
    // 수정 요청
    if (v.editRequest) {
      history.push({
        type: 'request',
        version: v.version,
        message: v.editRequest,
        timestamp: new Date(v.createdAt),
      });
    }

    // 수정된 원고
    history.push({
      type: 'edited',
      version: v.version,
      title: v.title || '제목 없음',
      content: v.content,
      timestamp: new Date(v.createdAt),
    });
  });

  versionHistory.value = history;
};

// 버전 목록 로드
const loadVersions = async () => {
  isLoadingVersions.value = true;
  try {
    const data = await useApi<AIPostVersionListResponse>(
      `/blog-posts/${props.blogPostId}/posts/${props.post.id}/versions`,
    );

    // 원본 저장 (v1)
    const v1 = data.versions.find((v) => v.version === 1);
    if (v1) {
      originalContent.value = {
        title: v1.title,
        content: v1.content,
      };
    } else {
      // v1이 없으면 현재 post가 원본
      originalContent.value = {
        title: props.post.title,
        content: props.post.content,
      };
    }

    // v2 이상만 versions에 저장
    versions.value = data.versions.filter((v) => v.version > 1);

    // 히스토리 구성
    buildVersionHistory();
  } catch (err: any) {
    toast.add({
      title: '버전 목록 조회 실패',
      description: err.message || '버전 목록을 가져오는데 실패했습니다.',
      color: 'error',
    });
  } finally {
    isLoadingVersions.value = false;
  }
};

// 컴포넌트 마운트 시 버전 목록 로드 및 스크롤
onMounted(async () => {
  await loadVersions();
  scrollToBottom();
});

// 수정 요청 제출
const submitEditRequest = async () => {
  if (!editRequest.value.trim() || !canEdit.value) return;

  const request = editRequest.value.trim();
  editRequest.value = '';

  // 히스토리에 요청 추가
  versionHistory.value.push({
    type: 'request',
    message: request,
    timestamp: new Date(),
  });

  // 요청 추가 후 스크롤
  scrollToBottom();

  await startTransition(async () => {
    try {
      const result = await useApi<EditAIPostResponse>(
        `/blog-posts/${props.blogPostId}/posts/${props.post.id}/edit`,
        {
          method: 'POST',
          body: { request },
        },
      );

      if (result.success && result.data) {
        // 수정된 원고를 히스토리에 추가
        versionHistory.value.push({
          type: 'edited',
          version: result.data.version,
          title: result.data.title,
          content: result.data.content,
          timestamp: new Date(),
        });

        // 버전 목록 업데이트
        versions.value.push({
          version: result.data.version,
          title: result.data.title,
          content: result.data.content,
          editRequest: request,
          promptTokens: null,
          completionTokens: null,
          totalTokens: null,
          createdAt: new Date().toISOString(),
        });

        // 부모 컴포넌트에 업데이트 알림
        emit('updated', {
          ...props.post,
          title: result.data.title,
          content: result.data.content,
          currentVersion: result.data.version,
          editCount: MAX_EDITS - result.data.remainingEdits,
        });

        toast.add({
          title: '수정 완료',
          description: result.message,
          color: 'success',
        });

        // 수정 완료 후 스크롤
        scrollToBottom();
      } else {
        // 유효하지 않은 요청 (수정 요청이 아님)
        versionHistory.value.push({
          type: 'error',
          message: result.message,
          timestamp: new Date(),
        });

        // editCount 업데이트 (실패해도 1회 차감)
        emit('updated', {
          ...props.post,
          editCount: props.post.editCount + 1,
        });

        toast.add({
          title: '수정 불가',
          description: result.message,
          color: 'warning',
        });

        // 에러 추가 후 스크롤
        scrollToBottom();
      }
    } catch (err: any) {
      versionHistory.value.push({
        type: 'error',
        message: err.message || '수정 요청 중 오류가 발생했습니다.',
        timestamp: new Date(),
      });

      toast.add({
        title: '수정 요청 실패',
        description: err.message || '수정 요청 중 오류가 발생했습니다.',
        color: 'error',
      });

      // 에러 추가 후 스크롤
      scrollToBottom();
    }
  });
};

// Enter 키로 제출 (Shift+Enter는 줄바꿈)
const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    submitEditRequest();
  }
};

// 시간 포맷
const formatTime = (date: Date) => {
  return date.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

// 날짜 포맷
const formatDate = (date: Date) => {
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

// 텍스트 복사 (HTML 태그 제거)
const copyTextToClipboard = async (html: string | undefined) => {
  if (!html) return;
  try {
    let text = html
      .replace(/<\/(p|h[1-6]|li)>/gi, '\n\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    await navigator.clipboard.writeText(text);
    toast.add({
      title: '텍스트 복사 완료',
      description: '텍스트 형식으로 클립보드에 복사되었습니다.',
      color: 'success',
    });
  } catch (error) {
    toast.add({
      title: '복사 실패',
      description: '클립보드 복사에 실패했습니다.',
      color: 'error',
    });
  }
};

// HTML 복사
const copyHtmlToClipboard = async (html: string | undefined) => {
  if (!html) return;
  try {
    await navigator.clipboard.writeText(html);
    toast.add({
      title: 'HTML 복사 완료',
      description: 'HTML 형식으로 클립보드에 복사되었습니다.',
      color: 'success',
    });
  } catch (error) {
    toast.add({
      title: '복사 실패',
      description: '클립보드 복사에 실패했습니다.',
      color: 'error',
    });
  }
};
</script>

<template>
  <USlideover
    :open="true"
    side="right"
    class="max-w-xl"
    @update:open="(open: boolean) => !open && emit('close', false)"
  >
    <template #header>
      <div class="flex items-center justify-between w-full">
        <div class="flex items-center gap-2">
          <UIcon name="i-heroicons-pencil-square" class="w-5 h-5 text-primary" />
          <span class="font-bold">원고 수정</span>
        </div>
        <div class="flex items-center gap-2">
          <UBadge
            :color="canEdit ? 'primary' : 'neutral'"
            variant="soft"
            size="sm"
          >
            {{ remainingEdits }}/{{ MAX_EDITS }} 남음
          </UBadge>
        </div>
      </div>
    </template>

    <template #body>
      <div class="flex flex-col h-full">
        <!-- 수정 안내 배너 -->
        <div class="mb-4 p-3 rounded-lg bg-warning-50 dark:bg-warning-950/30 border border-warning-200 dark:border-warning-800">
          <div class="flex items-start gap-2">
            <UIcon name="i-heroicons-exclamation-triangle" class="w-4 h-4 text-warning-600 dark:text-warning-400 mt-0.5 shrink-0" />
            <div class="text-xs text-warning-800 dark:text-warning-200">
              <p class="font-medium mb-1">수정 안내</p>
              <ul class="list-disc list-inside space-y-0.5 text-warning-700 dark:text-warning-300">
                <li>원고 수정은 <strong>최대 {{ MAX_EDITS }}회</strong>까지 가능합니다.</li>
                <li>수정과 관련 없는 요청(질문, 인사 등)은 거부되며, <strong>횟수가 차감</strong>됩니다.</li>
              </ul>
            </div>
          </div>
        </div>

        <!-- 버전 히스토리 (원본 → 요청 → 수정본 순서) -->
        <div ref="historyContainer" class="flex-1 overflow-y-auto mb-4 space-y-4">
          <!-- 로딩 상태 -->
          <div
            v-if="isLoadingVersions"
            class="flex items-center justify-center h-full text-neutral-500 text-sm"
          >
            <div class="flex items-center gap-2">
              <UIcon name="i-heroicons-arrow-path" class="w-5 h-5 animate-spin" />
              <span>버전 히스토리 로딩 중...</span>
            </div>
          </div>

          <!-- 히스토리 아이템들 -->
          <template v-else>
            <div
              v-for="(item, index) in versionHistory"
              :key="index"
              class="version-item"
            >
              <!-- 원본 원고 (v1) -->
              <div
                v-if="item.type === 'original'"
                class="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700"
              >
                <div class="flex items-center justify-between mb-2">
                  <div class="flex items-center gap-2">
                    <UIcon name="i-heroicons-document" class="w-4 h-4 text-neutral-500" />
                    <UBadge color="neutral" variant="soft" size="xs">
                      v1 (원본)
                    </UBadge>
                    <span class="text-xs text-neutral-400">
                      {{ formatDate(item.timestamp) }}
                    </span>
                  </div>
                  <div class="flex items-center gap-1">
                    <UButton
                      icon="i-heroicons-document-text"
                      variant="ghost"
                      size="xs"
                      color="neutral"
                      @click="copyTextToClipboard(item.content)"
                    >
                      텍스트
                    </UButton>
                    <UButton
                      icon="i-heroicons-code-bracket"
                      variant="ghost"
                      size="xs"
                      color="neutral"
                      @click="copyHtmlToClipboard(item.content)"
                    >
                      HTML
                    </UButton>
                  </div>
                </div>
                <h4 class="text-base font-bold text-neutral-900 dark:text-white mb-2">
                  {{ item.title }}
                </h4>
                <!-- 접힌 상태: 미리보기 -->
                <div
                  v-if="!isCardExpanded(index)"
                  class="text-sm text-neutral-600 dark:text-neutral-400 line-clamp-2 cursor-pointer"
                  @click="toggleCardExpand(index)"
                >
                  {{ getTextPreview(item.content) }}
                </div>
                <!-- 펼친 상태: 전체 콘텐츠 -->
                <div
                  v-else
                  class="version-content text-sm text-neutral-700 dark:text-neutral-300"
                  v-html="item.content"
                />
                <!-- 접기/펼치기 버튼 -->
                <button
                  class="mt-2 text-xs text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 flex items-center gap-1"
                  @click="toggleCardExpand(index)"
                >
                  <UIcon
                    :name="isCardExpanded(index) ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'"
                    class="w-3.5 h-3.5"
                  />
                  {{ isCardExpanded(index) ? '접기' : '펼치기' }}
                </button>
              </div>

              <!-- 수정 요청 (사용자 채팅) -->
              <div
                v-else-if="item.type === 'request'"
                class="flex justify-end"
              >
                <div class="max-w-[85%] p-3 rounded-xl bg-primary-500 text-white">
                  <div class="flex items-center gap-2 mb-1">
                    <UIcon name="i-heroicons-chat-bubble-left" class="w-3.5 h-3.5" />
                    <span class="text-xs opacity-80">수정 요청</span>
                  </div>
                  <p class="text-sm">{{ item.message }}</p>
                  <p class="text-xs mt-1 opacity-70 text-right">
                    {{ formatTime(item.timestamp) }}
                  </p>
                </div>
              </div>

              <!-- 수정된 원고 (v2+) -->
              <div
                v-else-if="item.type === 'edited'"
                class="p-4 rounded-xl bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-800"
              >
                <div class="flex items-center justify-between mb-2">
                  <div class="flex items-center gap-2">
                    <UIcon name="i-heroicons-check-circle" class="w-4 h-4 text-success-600" />
                    <UBadge color="success" variant="soft" size="xs">
                      v{{ item.version }} (수정본)
                    </UBadge>
                    <span class="text-xs text-neutral-400">
                      {{ formatTime(item.timestamp) }}
                    </span>
                  </div>
                  <div class="flex items-center gap-1">
                    <UButton
                      icon="i-heroicons-document-text"
                      variant="ghost"
                      size="xs"
                      color="success"
                      @click="copyTextToClipboard(item.content)"
                    >
                      텍스트
                    </UButton>
                    <UButton
                      icon="i-heroicons-code-bracket"
                      variant="ghost"
                      size="xs"
                      color="success"
                      @click="copyHtmlToClipboard(item.content)"
                    >
                      HTML
                    </UButton>
                  </div>
                </div>
                <h4 class="text-base font-bold text-neutral-900 dark:text-white mb-2">
                  {{ item.title }}
                </h4>
                <!-- 접힌 상태: 미리보기 -->
                <div
                  v-if="!isCardExpanded(index)"
                  class="text-sm text-neutral-600 dark:text-neutral-400 line-clamp-2 cursor-pointer"
                  @click="toggleCardExpand(index)"
                >
                  {{ getTextPreview(item.content) }}
                </div>
                <!-- 펼친 상태: 전체 콘텐츠 -->
                <div
                  v-else
                  class="version-content text-sm text-neutral-700 dark:text-neutral-300"
                  v-html="item.content"
                />
                <!-- 접기/펼치기 버튼 -->
                <button
                  class="mt-2 text-xs text-success-600 hover:text-success-700 dark:text-success-400 dark:hover:text-success-300 flex items-center gap-1"
                  @click="toggleCardExpand(index)"
                >
                  <UIcon
                    :name="isCardExpanded(index) ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'"
                    class="w-3.5 h-3.5"
                  />
                  {{ isCardExpanded(index) ? '접기' : '펼치기' }}
                </button>
              </div>

              <!-- 에러 메시지 -->
              <div
                v-else-if="item.type === 'error'"
                class="flex justify-start"
              >
                <div class="max-w-[85%] p-3 rounded-xl bg-error-100 dark:bg-error-900/30 text-error-800 dark:text-error-200">
                  <div class="flex items-center gap-2 mb-1">
                    <UIcon name="i-heroicons-exclamation-triangle" class="w-3.5 h-3.5" />
                    <span class="text-xs opacity-80">오류</span>
                  </div>
                  <p class="text-sm">{{ item.message }}</p>
                  <p class="text-xs mt-1 opacity-70">
                    {{ formatTime(item.timestamp) }}
                  </p>
                </div>
              </div>
            </div>

            <!-- 로딩 중 (수정 요청 처리 중) -->
            <div v-if="isPending" class="flex justify-start">
              <div class="p-3 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                <div class="flex items-center gap-2">
                  <UIcon name="i-heroicons-arrow-path" class="w-4 h-4 animate-spin" />
                  <span class="text-sm">원고 수정 중...</span>
                </div>
              </div>
            </div>

            <!-- 빈 상태 (히스토리 없을 때) -->
            <div
              v-if="versionHistory.length === 0 && !isLoadingVersions"
              class="flex items-center justify-center h-full text-neutral-500 text-sm py-12"
            >
              <div class="text-center">
                <UIcon
                  name="i-heroicons-document-text"
                  class="w-10 h-10 mx-auto mb-3 opacity-40"
                />
                <p class="font-medium">원고 히스토리가 없습니다</p>
                <p class="text-xs mt-1 text-neutral-400">
                  수정 요청을 입력하면 히스토리가 표시됩니다
                </p>
              </div>
            </div>
          </template>
        </div>

        <!-- 수정 요청 입력 -->
        <div class="border-t border-neutral-200 dark:border-neutral-700 pt-4 mt-auto">
          <div
            v-if="!canEdit"
            class="mb-3 p-3 rounded-lg bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800"
          >
            <div class="flex items-center gap-2 text-warning-700 dark:text-warning-300">
              <UIcon name="i-heroicons-exclamation-triangle" class="w-4 h-4" />
              <span class="text-sm font-medium">
                수정 횟수를 모두 사용했습니다
              </span>
            </div>
          </div>

          <div class="flex gap-2">
            <UTextarea
              v-model="editRequest"
              :disabled="!canEdit || isPending"
              placeholder="수정 요청을 입력하세요... (예: 제목을 더 흥미롭게 바꿔줘)"
              :rows="2"
              class="flex-1"
              @keydown="handleKeydown"
            />
            <UButton
              color="primary"
              :disabled="!editRequest.trim() || !canEdit || isPending"
              :loading="isPending"
              @click="submitEditRequest"
              class="self-end"
            >
              <UIcon name="i-heroicons-paper-airplane" class="w-4 h-4" />
            </UButton>
          </div>
          <p class="text-xs text-neutral-500 mt-2">
            Enter로 전송, Shift+Enter로 줄바꿈
          </p>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex gap-3 w-full">
        <UButton
          color="neutral"
          variant="outline"
          size="lg"
          block
          @click="emit('close', false)"
        >
          닫기
        </UButton>
      </div>
    </template>
  </USlideover>
</template>

<style scoped>
/* 버전 콘텐츠 HTML 스타일 */
.version-content {
  line-height: 1.625;
}

.version-content :deep(h1) {
  font-size: 1.25rem;
  font-weight: 700;
  margin-top: 1rem;
  margin-bottom: 0.75rem;
}

.version-content :deep(h1:first-child) {
  margin-top: 0;
}

.version-content :deep(h2) {
  font-size: 1.125rem;
  font-weight: 700;
  margin-top: 1rem;
  margin-bottom: 0.5rem;
}

.version-content :deep(h2:first-child) {
  margin-top: 0;
}

.version-content :deep(h3) {
  font-size: 1rem;
  font-weight: 600;
  margin-top: 0.75rem;
  margin-bottom: 0.5rem;
}

.version-content :deep(h3:first-child) {
  margin-top: 0;
}

.version-content :deep(p) {
  margin-bottom: 0.75rem;
  line-height: 1.75;
}

.version-content :deep(p:last-child) {
  margin-bottom: 0;
}

.version-content :deep(ol) {
  list-style-type: decimal;
  list-style-position: inside;
  padding-left: 1rem;
  margin-bottom: 0.75rem;
}

.version-content :deep(ul) {
  list-style-type: disc;
  list-style-position: inside;
  padding-left: 1rem;
  margin-bottom: 0.75rem;
}

.version-content :deep(li) {
  margin-bottom: 0.25rem;
  line-height: 1.625;
}

.version-content :deep(br) {
  display: block;
  content: "";
  margin-top: 0.5rem;
}

/* 버전 히스토리 아이템 간격 */
.version-item + .version-item {
  margin-top: 1rem;
}
</style>
