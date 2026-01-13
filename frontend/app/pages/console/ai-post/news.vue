<script lang="ts" setup>
import { writingToneOptions, type WritingTone } from '~/schemas/post';

definePageMeta({
  middleware: 'auth',
});

const [isPending, startTransition] = useTransition();
const auth = useAuth();
const overlay = useOverlay();
const toast = useToast();

// 원고 요청 완료 모달
const PostRequestCompleteModal = defineAsyncComponent(
  () => import('~/components/console/PostRequestCompleteModal.vue'),
);
const postCompleteModal = overlay.create(PostRequestCompleteModal);

interface SimplePersona extends Pick<Persona, 'id' | 'blogTopic' | 'gender'> {}

// 특별한 값으로 "임의 생성" 옵션 구분
const RANDOM_PERSONA_VALUE = -1;

const { data: personas } = await useApiFetch<
  {
    label: string;
    value: number;
  }[]
>('/personas/my/simple', {
  method: 'GET',
  lazy: true,
  transform: (data: any) => {
    const personaList = data.map((item: SimplePersona) => ({
      label: `${item.blogTopic} (${item.gender})`,
      value: item.id,
    }));

    // "임의 생성" 옵션을 맨 위에 추가
    return [
      { label: '✨ 임의 생성', value: RANDOM_PERSONA_VALUE },
      ...personaList,
    ];
  },
});

// BloC 비용 계산 (원고당 고정 비용)
const CREDIT_COST_PER_POST = 5; // 원고 1개당 5 BloC

// 뉴스 URL 체크 상태
const isCheckingUrl = ref(false);
const newsUrlChecked = ref(false);
const newsUrlValid = ref(false);
const newsUrlError = ref<string | null>(null);
const newsUrlTouched = ref(false);

// 폼 상태
const state = reactive<{
  personaId: number | undefined;
  keyword: string;
  length: number;
  count: number;
  writingTone: WritingTone;
  newsUrl: string;
  extra: string;
}>({
  personaId: undefined,
  keyword: '',
  length: 1500,
  count: 1,
  writingTone: 'casual',
  newsUrl: '',
  extra: '',
});

// 총 BloC 비용 계산
const totalCost = computed(() => {
  return CREDIT_COST_PER_POST * state.count;
});

// BloC 잔액 부족 여부
const isInsufficientBalance = computed(() => {
  return (
    !!auth.creditBalance && auth.creditBalance.totalCredits < totalCost.value
  );
});

// 뉴스 URL 유효성 검사 (기본 URL 형식)
const isValidNewsUrl = (url: string): boolean => {
  if (!url || url.trim() === '') return false;
  try {
    new URL(url.trim());
    return true;
  } catch {
    return false;
  }
};

// URL 에러 메시지
const urlErrorMessage = computed((): string | undefined => {
  if (!newsUrlTouched.value) return undefined;
  if (!state.newsUrl || state.newsUrl.trim() === '') {
    return '뉴스 URL을 입력해주세요.';
  }
  if (!isValidNewsUrl(state.newsUrl)) {
    return '올바른 URL 형식을 입력해주세요.';
  }
  if (newsUrlError.value) {
    return newsUrlError.value;
  }
  return undefined;
});

// 뉴스 URL 체크 함수
const checkNewsUrl = async () => {
  if (!state.newsUrl || state.newsUrl.trim() === '') {
    toast.add({
      title: '뉴스 URL을 입력해주세요',
      color: 'warning',
    });
    return;
  }

  if (!isValidNewsUrl(state.newsUrl)) {
    toast.add({
      title: '올바른 URL 형식을 입력해주세요',
      color: 'warning',
    });
    return;
  }

  isCheckingUrl.value = true;
  newsUrlChecked.value = false;
  newsUrlValid.value = false;
  newsUrlError.value = null;

  try {
    const result = await useApi<{
      isSupported: boolean;
      sourceName?: string;
      message: string;
    }>('/blog-posts/news/check-url', {
      method: 'GET',
      params: { url: state.newsUrl.trim() },
    });

    newsUrlChecked.value = true;
    newsUrlValid.value = result.isSupported;

    if (result.isSupported) {
      toast.add({
        title: '뉴스 URL 확인 완료',
        description: `${result.sourceName}의 뉴스 기사를 가져올 수 있습니다.`,
        color: 'success',
      });
    } else {
      newsUrlError.value = result.message || '지원하지 않는 뉴스 사이트입니다.';
      toast.add({
        title: '지원하지 않는 뉴스 사이트',
        description: newsUrlError.value,
        color: 'warning',
      });
    }
  } catch (err: any) {
    newsUrlError.value = err.message || '뉴스 URL 확인 중 오류가 발생했습니다.';
    toast.add({
      title: '뉴스 URL 확인 실패',
      description: newsUrlError.value || undefined,
      color: 'error',
    });
  } finally {
    isCheckingUrl.value = false;
  }
};

// URL 변경 시 체크 상태 초기화
watch(
  () => state.newsUrl,
  () => {
    newsUrlChecked.value = false;
    newsUrlValid.value = false;
    newsUrlError.value = null;
  },
);

// 제출 가능 여부
const canSubmit = computed(() => {
  // 페르소나 선택 필수
  if (state.personaId === undefined) return false;
  // 키워드 입력 필수
  if (!state.keyword || state.keyword.trim() === '') return false;
  // 뉴스 URL 필수
  if (!state.newsUrl || state.newsUrl.trim() === '') return false;
  // URL이 유효한 형식이어야 함
  if (!isValidNewsUrl(state.newsUrl)) return false;
  // URL 체크가 완료되고 유효해야 함
  if (!newsUrlChecked.value || !newsUrlValid.value) return false;
  // BloC 잔액 충분해야 함
  if (isInsufficientBalance.value) return false;

  return true;
});

// 제출 불가 사유
const submitBlockReason = computed(() => {
  if (state.personaId === undefined) return '페르소나를 선택해주세요';
  if (!state.keyword || state.keyword.trim() === '') return '희망 키워드를 입력해주세요';
  if (!state.newsUrl || state.newsUrl.trim() === '') return '뉴스 URL을 입력해주세요';
  if (!isValidNewsUrl(state.newsUrl)) return '올바른 URL 형식을 입력해주세요';
  if (!newsUrlChecked.value) return '뉴스 URL 확인이 필요합니다';
  if (!newsUrlValid.value) return '지원하지 않는 뉴스 사이트입니다';
  if (isInsufficientBalance.value) return 'BloC 부족 - 충전 필요';
  return null;
});

// 원고 생성 요청
const postRequest = async () => {
  // 페르소나 처리
  let personaId = state.personaId;
  let useRandomPersona = false;

  if (personaId === RANDOM_PERSONA_VALUE) {
    useRandomPersona = true;
    personaId = undefined;
  }

  // additionalFields 구성
  const additionalFields: Record<string, any> = {};
  if (state.extra && state.extra.trim() !== '') {
    additionalFields.extra = state.extra.trim();
  }

  const finalData = {
    keyword: state.keyword.trim(),
    length: state.length,
    count: state.count,
    writingTone: state.writingTone,
    blogIndex: 'optimal', // 뉴스 원고는 최적 고정
    personaId,
    useRandomPersona,
    newsUrl: state.newsUrl.trim(),
    recommendedKeyword: state.keyword.trim(), // 뉴스 원고는 희망 키워드 사용
    additionalFields: Object.keys(additionalFields).length > 0 ? additionalFields : null,
  };

  await startTransition(async () => {
    try {
      const result = await useApi<{ id: number }>('/blog-posts/news', {
        method: 'POST',
        body: finalData,
      });

      if (!result.id) {
        throw new Error('원고 생성 요청에 실패했습니다.');
      }

      await auth.fetchUser();

      // 모달 열기
      const action = await postCompleteModal.open({ count: finalData.count });

      if (action === 'navigate') {
        return navigateTo('/console/workspace');
      }
      return resetForm();
    } catch (err: any) {
      toast.add({
        title: '원고 생성 실패',
        description: err.message || '원고 생성 요청 중 오류가 발생했습니다.',
        color: 'error',
      });
    }
  });
};

// 폼 초기화
const resetForm = () => {
  state.personaId = undefined;
  state.keyword = '';
  state.length = 1500;
  state.count = 1;
  state.writingTone = 'casual';
  state.newsUrl = '';
  state.extra = '';
  newsUrlChecked.value = false;
  newsUrlValid.value = false;
  newsUrlError.value = null;
  newsUrlTouched.value = false;
};

const onSubmit = async () => {
  newsUrlTouched.value = true;

  if (!canSubmit.value) {
    toast.add({
      title: '입력 확인 필요',
      description: submitBlockReason.value || '필수 입력 항목을 확인해주세요.',
      color: 'warning',
    });
    return;
  }

  await postRequest();
};
</script>

<template>
  <SubscriptionGuard>
    <section class="container mx-auto max-w-5xl">
      <!-- 뒤로가기 + 제목 -->
      <div class="flex items-center gap-4 mb-6">
        <UButton
          icon="i-heroicons-arrow-left"
          variant="ghost"
          color="neutral"
          to="/console/ai-post"
        >
          목록으로
        </UButton>
      </div>

      <ConsoleTitle
        title="뉴스 기반 원고 생성"
        description="뉴스 기사를 참고하여 SEO에 최적화된 블로그 원고를 생성합니다."
      />

      <div class="grid grid-cols-2 gap-x-5 items-start">
        <article>
          <div class="flex flex-col gap-y-4 mb-8">
            <h4 class="font-bold">원고 개요</h4>

            <!-- 페르소나 선택 -->
            <UFormField
              label="페르소나"
              name="personaId"
              required
              :description="
                state.personaId === RANDOM_PERSONA_VALUE
                  ? '각 원고마다 임의의 다른 페르소나가 자동으로 설정됩니다.'
                  : undefined
              "
            >
              <USelect
                v-model="state.personaId"
                name="personaId"
                :items="personas ?? []"
                variant="soft"
                class="w-full"
                size="xl"
                placeholder="페르소나를 선택해 주세요."
              />
              <template #hint>
                <UButton
                  size="xs"
                  color="neutral"
                  to="/console/personas/create"
                >
                  새 페르소나 추가
                </UButton>
              </template>
            </UFormField>

            <!-- 희망 키워드 -->
            <UFormField label="희망 키워드" name="keyword" required>
              <UInput
                v-model.trim="state.keyword"
                name="keyword"
                type="text"
                placeholder="예: 경제 뉴스, IT 트렌드, 정치 이슈 등"
                size="xl"
                class="w-full"
                variant="soft"
              />
              <template #description>
                <span class="text-xs text-neutral-500">
                  원고에 최적화할 키워드를 입력해주세요. 이 키워드로 상위 블로그를 분석합니다.
                </span>
              </template>
            </UFormField>

            <!-- 글자 수 -->
            <UFormField label="글자 수" name="length" required>
              <input type="hidden" name="length" :value="state.length" />
              <div class="flex justify-between py-1 gap-x-2.5">
                <UButton
                  v-for="len in [1000, 1500, 2000]"
                  :key="`len-${len.toString()}`"
                  size="lg"
                  :color="state.length === len ? 'primary' : 'neutral'"
                  :variant="state.length === len ? 'solid' : 'soft'"
                  class="rounded-full"
                  @click="state.length = len"
                  block
                >
                  {{ len.toLocaleString() }}자
                </UButton>
              </div>
            </UFormField>

            <!-- 원고 수 -->
            <UFormField label="원고 수" name="count" required>
              <UInput
                v-model.number="state.count"
                name="count"
                type="number"
                min="1"
                max="100"
                placeholder="생성할 원고 수를 입력해주세요 (최대 100개)"
                size="xl"
                class="w-full"
                variant="soft"
              />
            </UFormField>

            <!-- 원고 말투 -->
            <UFormField label="원고 말투" name="writingTone" required>
              <URadioGroup
                v-model="state.writingTone"
                :items="
                  writingToneOptions.map((opt) => ({
                    value: opt.value,
                    label: `${opt.label} (${opt.description})`,
                  }))
                "
                orientation="vertical"
              />
            </UFormField>
          </div>

          <!-- 뉴스 URL 입력 -->
          <div class="flex flex-col gap-y-4 mb-8">
            <div>
              <h4 class="font-bold mb-1">뉴스 기사 정보</h4>
              <p class="text-[13px] text-muted dark:text-gray-400">
                참고할 뉴스 기사의 URL을 입력해주세요. 지원되는 뉴스 사이트인지 확인이 필요합니다.
              </p>
            </div>

            <UFormField
              label="뉴스 URL"
              name="newsUrl"
              :error="urlErrorMessage"
              required
            >
              <div class="flex gap-2">
                <UInput
                  v-model.trim="state.newsUrl"
                  name="newsUrl"
                  type="url"
                  placeholder="예: https://news.naver.com/article/xxx/xxx"
                  size="xl"
                  class="flex-1"
                  variant="soft"
                  :color="urlErrorMessage ? 'error' : undefined"
                  @blur="newsUrlTouched = true"
                  @keyup.enter="checkNewsUrl"
                />
                <UButton
                  color="neutral"
                  variant="soft"
                  size="xl"
                  :loading="isCheckingUrl"
                  @click="checkNewsUrl"
                >
                  <UIcon name="i-heroicons-magnifying-glass" class="w-5 h-5" />
                  확인
                </UButton>
              </div>
              <template #description>
                <span class="text-xs text-neutral-500">
                  네이버 뉴스, 주요 언론사 등 다양한 뉴스 사이트를 지원합니다.
                </span>
              </template>
            </UFormField>

            <!-- URL 체크 결과 표시 -->
            <div
              v-if="newsUrlChecked && newsUrlValid"
              class="flex items-center gap-3 p-3 rounded-lg bg-success-50 dark:bg-success-950/20 border border-success-200 dark:border-success-800"
            >
              <UIcon
                name="i-heroicons-check-circle"
                class="w-5 h-5 text-success-600 shrink-0"
              />
              <div class="flex-1">
                <p class="text-sm font-medium text-success-700 dark:text-success-400">
                  뉴스 URL 확인 완료
                </p>
                <p class="text-xs text-success-600 dark:text-success-500 mt-0.5">
                  이 뉴스 기사를 기반으로 원고를 생성할 수 있습니다.
                </p>
              </div>
            </div>
          </div>

          <!-- 추가 정보 입력 -->
          <div class="flex flex-col gap-y-4">
            <div>
              <h4 class="font-bold mb-1">추가 정보 입력</h4>
              <p class="text-[13px] text-muted dark:text-gray-400">
                원고에 반영할 추가 정보나 특별히 강조할 내용을 입력해주세요.
              </p>
            </div>

            <UFormField label="추가 정보" name="extra">
              <UTextarea
                v-model.trim="state.extra"
                name="extra"
                :rows="6"
                placeholder="원고에 반영할 정보를 자유롭게 작성해주세요.

예시:
- 글의 관점: 긍정적/비판적/중립적
- 타겟 독자: 일반인, 전문가, 투자자 등
- 강조 포인트: 특정 내용 강조, 추가 설명
- 광고주: OO기업 (협찬/홍보 목적인 경우)"
                size="xl"
                class="w-full"
                variant="soft"
              />
            </UFormField>
          </div>

          <!-- BloC 정보 및 제출 버튼 -->
          <div class="space-y-3 mt-6">
            <!-- BloC 잔액 표시 -->
            <div
              v-if="auth.creditBalance"
              class="flex items-center justify-between p-4 rounded-xl bg-neutral-50 dark:bg-neutral-900"
            >
              <div class="flex items-center gap-2">
                <UIcon
                  name="i-heroicons-bolt"
                  class="w-5 h-5 text-primary-600"
                />
                <span class="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  보유 BloC
                </span>
              </div>
              <div class="flex items-center gap-2">
                <span
                  class="text-lg font-bold"
                  :class="isInsufficientBalance ? 'text-error' : 'text-primary-600'"
                >
                  {{ auth.creditBalance.totalCredits.toLocaleString() }}
                </span>
                <span class="text-sm text-neutral-500">BloC</span>
              </div>
            </div>

            <!-- 예상 비용 표시 -->
            <div
              class="flex items-center justify-between p-4 rounded-xl bg-primary-50 dark:bg-primary-950/20 border border-primary-200 dark:border-primary-800"
            >
              <div class="flex items-center gap-2">
                <UIcon
                  name="i-heroicons-calculator"
                  class="w-5 h-5 text-primary-600"
                />
                <span class="text-sm font-medium text-primary-700 dark:text-primary-400">
                  예상 비용
                </span>
              </div>
              <div class="flex items-center gap-1.5">
                <span class="text-xs text-primary-600 dark:text-primary-500">
                  {{ CREDIT_COST_PER_POST }} BloC × {{ state.count }}개 =
                </span>
                <span class="text-lg font-bold text-primary-600">
                  {{ totalCost.toLocaleString() }}
                </span>
                <span class="text-sm text-primary-500">BloC</span>
              </div>
            </div>

            <!-- 잔액 부족 경고 -->
            <div
              v-if="isInsufficientBalance"
              class="flex items-start gap-3 p-3 rounded-lg bg-error-50 dark:bg-error-950/20 border border-error-200 dark:border-error-800"
            >
              <UIcon
                name="i-heroicons-exclamation-triangle"
                class="w-5 h-5 text-error-600 shrink-0 mt-0.5"
              />
              <div class="flex-1">
                <p class="text-sm font-semibold text-error-700 dark:text-error-400 mb-1">
                  BloC이 부족합니다
                </p>
                <p class="text-xs text-error-600 dark:text-error-500">
                  BloC을 충전하거나 원고 수를 줄여주세요.
                </p>
              </div>
              <UButton size="xs" color="error" variant="outline" to="/pricing">
                BloC 충전
              </UButton>
            </div>

            <UButton
              type="button"
              size="xl"
              block
              color="primary"
              :loading="isPending"
              :disabled="!canSubmit"
              class="bg-linear-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 font-bold mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
              @click="onSubmit"
            >
              <template v-if="submitBlockReason">
                {{ submitBlockReason }}
              </template>
              <template v-else>
                뉴스 원고 생성 시작 ({{ totalCost.toLocaleString() }} BloC 사용)
              </template>
            </UButton>
          </div>
        </article>

        <!-- 오른쪽 사이드바 -->
        <article class="space-y-4 sticky top-24">
          <!-- Hero Card -->
          <UCard variant="soft" class="relative overflow-hidden">
            <div
              class="absolute inset-0 bg-linear-to-br from-orange-500/10 via-red-500/5 to-pink-500/10 pointer-events-none"
            />

            <div class="relative">
              <div class="flex items-start gap-4 mb-3">
                <div
                  class="shrink-0 w-14 h-14 rounded-2xl bg-linear-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg shadow-orange-500/30"
                >
                  <UIcon
                    name="i-heroicons-newspaper"
                    class="w-7 h-7 text-white"
                  />
                </div>
                <div class="flex-1 pt-1">
                  <h3
                    class="text-xl font-bold text-neutral-900 dark:text-white mb-2"
                  >
                    뉴스 기반 원고 생성
                  </h3>
                  <p
                    class="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed"
                  >
                    뉴스 기사의 내용을 바탕으로 SEO에 최적화된 블로그 원고를 자동으로 생성합니다.
                  </p>
                </div>
              </div>
            </div>
          </UCard>

          <!-- Process Steps Card -->
          <UCard variant="soft">
            <div class="space-y-4">
              <div class="flex items-center gap-2">
                <div class="w-1 h-5 bg-orange-600 rounded-full" />
                <h4 class="font-bold text-neutral-900 dark:text-white">
                  생성 프로세스
                </h4>
              </div>

              <div class="space-y-3">
                <!-- Step 1 -->
                <div
                  class="group flex items-start gap-3 p-3 rounded-xl hover:bg-orange-500/5 transition-colors"
                >
                  <div
                    class="shrink-0 w-10 h-10 rounded-lg bg-linear-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-sm"
                  >
                    <UIcon
                      name="i-heroicons-link"
                      class="w-5 h-5 text-white"
                    />
                  </div>
                  <div class="flex-1 pt-1">
                    <h5
                      class="text-sm font-semibold text-neutral-900 dark:text-white mb-1"
                    >
                      뉴스 URL 확인
                    </h5>
                    <p
                      class="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed"
                    >
                      입력한 뉴스 URL이 지원되는 사이트인지 확인합니다.
                    </p>
                  </div>
                </div>

                <!-- Step 2 -->
                <div
                  class="group flex items-start gap-3 p-3 rounded-xl hover:bg-orange-500/5 transition-colors"
                >
                  <div
                    class="shrink-0 w-10 h-10 rounded-lg bg-linear-to-br from-red-500 to-red-600 flex items-center justify-center shadow-sm"
                  >
                    <UIcon
                      name="i-heroicons-document-magnifying-glass"
                      class="w-5 h-5 text-white"
                    />
                  </div>
                  <div class="flex-1 pt-1">
                    <h5
                      class="text-sm font-semibold text-neutral-900 dark:text-white mb-1"
                    >
                      뉴스 내용 분석
                    </h5>
                    <p
                      class="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed"
                    >
                      뉴스 기사의 제목과 내용을 자동으로 파싱합니다.
                    </p>
                  </div>
                </div>

                <!-- Step 3 -->
                <div
                  class="group flex items-start gap-3 p-3 rounded-xl hover:bg-orange-500/5 transition-colors"
                >
                  <div
                    class="shrink-0 w-10 h-10 rounded-lg bg-linear-to-br from-pink-500 to-pink-600 flex items-center justify-center shadow-sm"
                  >
                    <UIcon
                      name="i-heroicons-magnifying-glass"
                      class="w-5 h-5 text-white"
                    />
                  </div>
                  <div class="flex-1 pt-1">
                    <h5
                      class="text-sm font-semibold text-neutral-900 dark:text-white mb-1"
                    >
                      상위 블로그 학습
                    </h5>
                    <p
                      class="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed"
                    >
                      희망 키워드로 상위 블로그를 분석하여 SEO 패턴을 학습합니다.
                    </p>
                  </div>
                </div>

                <!-- Step 4 -->
                <div
                  class="group flex items-start gap-3 p-3 rounded-xl hover:bg-orange-500/5 transition-colors"
                >
                  <div
                    class="shrink-0 w-10 h-10 rounded-lg bg-linear-to-br from-green-500 to-green-600 flex items-center justify-center shadow-sm"
                  >
                    <UIcon
                      name="i-heroicons-pencil-square"
                      class="w-5 h-5 text-white"
                    />
                  </div>
                  <div class="flex-1 pt-1">
                    <h5
                      class="text-sm font-semibold text-neutral-900 dark:text-white mb-1"
                    >
                      원고 생성
                    </h5>
                    <p
                      class="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed"
                    >
                      뉴스 내용과 SEO 패턴을 결합하여 최적화된 원고를 생성합니다.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </UCard>

          <!-- Supported Sites Card -->
          <UCard
            variant="soft"
            class="bg-linear-to-br from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20"
          >
            <div class="space-y-3">
              <div class="flex items-center gap-2">
                <div class="w-1 h-5 bg-orange-600 rounded-full" />
                <h4 class="font-bold text-neutral-900 dark:text-white">
                  지원 뉴스 사이트
                  <span class="text-xs font-normal text-neutral-500 ml-1">(37개)</span>
                </h4>
              </div>

              <div class="flex flex-wrap gap-1.5">
                <span
                  v-for="site in [
                    '네이버', '다음', '네이트', '연합뉴스', '연합뉴스TV',
                    '조선일보', 'TV조선', '중앙일보', '채널A', '동아일보',
                    '경향신문', '한겨레', '한국일보', '세계일보', '서울신문',
                    '문화일보', '국민일보', '국제신문', '강원도민일보',
                    'KBS', 'MBC', 'SBS', 'SBS Biz', 'JTBC', 'MBN', 'YTN',
                    '매일경제', '머니투데이', '아시아경제', '한국경제TV',
                    '뉴스타파', 'CBS노컷', '아리랑TV', 'OSEN', '농민신문', '교육박람회'
                  ]"
                  :key="site"
                  class="inline-flex items-center px-2 py-1 rounded-md text-[11px] font-medium bg-white/80 dark:bg-neutral-800/80 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700"
                >
                  {{ site }}
                </span>
              </div>
            </div>
          </UCard>

          <!-- Info Notice -->
          <UCard
            variant="soft"
            class="bg-orange-500/5 border border-orange-200 dark:border-orange-800"
          >
            <div class="flex gap-3">
              <UIcon
                name="i-heroicons-information-circle"
                class="w-5 h-5 text-orange-600 shrink-0 mt-0.5"
              />
              <p
                class="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed"
              >
                뉴스 기사의 저작권을 존중해주세요. 생성된 원고는 참고용으로만 사용하시고, 실제 게시 전 검토와 수정을 권장합니다.
              </p>
            </div>
          </UCard>
        </article>
      </div>
    </section>
  </SubscriptionGuard>
</template>
