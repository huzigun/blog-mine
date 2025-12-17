<script setup lang="ts">
import { useAdminApi } from '~/composables/useAdminApi';

interface PromptLog {
  id: number;
  userId: number;
  blogPostId: number | null;
  aiPostId: number | null;
  systemPrompt: string;
  userPrompt: string;
  fullPrompt: string | null;
  model: string;
  temperature: number | null;
  maxTokens: number | null;
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
  response: string | null;
  responseTime: number | null;
  success: boolean;
  errorMessage: string | null;
  purpose: string | null;
  metadata: Record<string, any> | null;
  createdAt: string;
}

const props = defineProps<{
  aiPostId: number;
}>();

const emit = defineEmits<{
  close: [];
}>();

const isLoading = ref(true);
const promptLog = ref<PromptLog | null>(null);
const error = ref<string | null>(null);

// 탭 상태
const activeTab = ref<'system' | 'user' | 'full' | 'response'>('system');

// 모달 열릴 때 데이터 로드
onMounted(async () => {
  try {
    const data = await useAdminApi<PromptLog>(
      `/admin/posts/ai-posts/${props.aiPostId}/prompt-log`,
    );
    promptLog.value = data;
  } catch (err: any) {
    error.value =
      err.data?.message || '프롬프트 로그를 불러오는데 실패했습니다.';
  } finally {
    isLoading.value = false;
  }
});

// 날짜 포맷
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

const handleClose = () => {
  emit('close');
};

// 탭 옵션
const tabItems = computed(() => [
  { label: 'System Prompt', value: 'system' },
  { label: 'User Prompt', value: 'user' },
  {
    label: 'Full Prompt',
    value: 'full',
    disabled: !promptLog.value?.fullPrompt,
  },
  {
    label: 'Response',
    value: 'response',
    disabled: !promptLog.value?.response,
  },
]);
</script>

<template>
  <UModal :open="true" @update:open="handleClose">
    <template #content>
      <UCard class="max-w-[90vw]">
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold">프롬프트 로그</h3>
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-heroicons-x-mark"
              @click="handleClose"
            />
          </div>
        </template>

        <!-- 로딩 상태 -->
        <div v-if="isLoading" class="flex items-center justify-center py-12">
          <UIcon
            name="i-heroicons-arrow-path"
            class="w-8 h-8 text-primary-500 animate-spin"
          />
        </div>

        <!-- 에러 상태 -->
        <div
          v-else-if="error"
          class="flex flex-col items-center justify-center py-12 text-error-500"
        >
          <UIcon name="i-heroicons-exclamation-circle" class="w-12 h-12 mb-4" />
          <p>{{ error }}</p>
        </div>

        <!-- 프롬프트 로그 내용 -->
        <div v-else-if="promptLog" class="space-y-4">
          <!-- 메타 정보 -->
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div class="bg-neutral-100 dark:bg-neutral-800 rounded-lg p-3">
              <p class="text-neutral-500">모델</p>
              <p class="font-medium">{{ promptLog.model }}</p>
            </div>
            <div class="bg-neutral-100 dark:bg-neutral-800 rounded-lg p-3">
              <p class="text-neutral-500">토큰 사용량</p>
              <p class="font-medium">
                {{ promptLog.totalTokens?.toLocaleString() || '-' }}
              </p>
            </div>
            <div class="bg-neutral-100 dark:bg-neutral-800 rounded-lg p-3">
              <p class="text-neutral-500">응답 시간</p>
              <p class="font-medium">
                {{
                  promptLog.responseTime ? `${promptLog.responseTime}ms` : '-'
                }}
              </p>
            </div>
            <div class="bg-neutral-100 dark:bg-neutral-800 rounded-lg p-3">
              <p class="text-neutral-500">상태</p>
              <UBadge :color="promptLog.success ? 'success' : 'error'">
                {{ promptLog.success ? '성공' : '실패' }}
              </UBadge>
            </div>
          </div>

          <!-- 토큰 상세 -->
          <div class="flex flex-wrap gap-4 text-xs text-neutral-500">
            <span v-if="promptLog.promptTokens">
              Prompt: {{ promptLog.promptTokens.toLocaleString() }}
            </span>
            <span v-if="promptLog.completionTokens">
              Completion: {{ promptLog.completionTokens.toLocaleString() }}
            </span>
            <span v-if="promptLog.temperature !== null">
              Temperature: {{ promptLog.temperature }}
            </span>
            <span v-if="promptLog.maxTokens">
              Max Tokens: {{ promptLog.maxTokens.toLocaleString() }}
            </span>
            <span>생성일: {{ formatDate(promptLog.createdAt) }}</span>
          </div>

          <!-- 에러 메시지 -->
          <div
            v-if="promptLog.errorMessage"
            class="bg-error-50 dark:bg-error-900/20 text-error-600 p-3 rounded-lg text-sm"
          >
            <p class="font-medium mb-1">에러 메시지</p>
            <p>{{ promptLog.errorMessage }}</p>
          </div>

          <!-- 탭 네비게이션 -->
          <div
            class="flex gap-2 border-b border-neutral-200 dark:border-neutral-700"
          >
            <button
              v-for="tab in tabItems"
              :key="tab.value"
              :disabled="tab.disabled"
              :class="[
                'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                activeTab === tab.value
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-neutral-500 hover:text-neutral-700',
                tab.disabled && 'opacity-50 cursor-not-allowed',
              ]"
              @click="!tab.disabled && (activeTab = tab.value as any)"
            >
              {{ tab.label }}
            </button>
          </div>

          <!-- 탭 내용 -->
          <div
            class="bg-neutral-50 dark:bg-neutral-800/50 rounded-lg p-4 max-h-[400px] overflow-y-auto"
          >
            <pre
              v-if="activeTab === 'system'"
              class="whitespace-pre-wrap wrap-break-word font-mono leading-relaxed text-neutral-700 dark:text-neutral-300"
              style="font-size: 11px"
              >{{ promptLog.systemPrompt }}</pre
            >
            <pre
              v-else-if="activeTab === 'user'"
              class="whitespace-pre-wrap wrap-break-word font-mono leading-relaxed text-neutral-700 dark:text-neutral-300"
              style="font-size: 11px"
              >{{ promptLog.userPrompt }}</pre
            >
            <pre
              v-else-if="activeTab === 'full' && promptLog.fullPrompt"
              class="whitespace-pre-wrap wrap-break-word font-mono leading-relaxed text-neutral-700 dark:text-neutral-300"
              style="font-size: 11px"
              >{{ promptLog.fullPrompt }}</pre
            >
            <pre
              v-else-if="activeTab === 'response' && promptLog.response"
              class="whitespace-pre-wrap wrap-break-word font-mono leading-relaxed text-neutral-700 dark:text-neutral-300"
              style="font-size: 11px"
              >{{ promptLog.response }}</pre
            >
          </div>

          <!-- 메타데이터 -->
          <div v-if="promptLog.metadata">
            <p class="text-sm font-medium text-neutral-500 mb-2">메타데이터</p>
            <pre
              class="text-xs bg-neutral-100 dark:bg-neutral-800 p-3 rounded-lg overflow-auto max-h-32"
              >{{ JSON.stringify(promptLog.metadata, null, 2) }}</pre
            >
          </div>
        </div>

        <template #footer>
          <div class="flex justify-end">
            <UButton color="neutral" variant="outline" @click="handleClose">
              닫기
            </UButton>
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>
