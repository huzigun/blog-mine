<script lang="ts" setup>
import type { FormSubmitEvent } from '@nuxt/ui';
import {
  fieldConfigsByType,
  postTypes,
  aiPostSchema,
  type AiPostSchema,
} from '~/schemas/post';
import { PostDone } from '#components';

definePageMeta({
  middleware: 'auth',
});

const [isPending, startTransition] = useTransition();
const auth = useAuth();
const overlay = useOverlay();
const postDoneModal = overlay.create(PostDone);

interface SimplePersona
  extends Pick<Persona, 'id' | 'occupation' | 'age' | 'gender'> {}

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
      label: `${item.occupation} (${item.age}세, ${item.gender})`,
      value: item.id,
    }));

    // "임의 생성" 옵션을 맨 위에 추가
    return [
      { label: '✨ 임의 생성', value: RANDOM_PERSONA_VALUE },
      ...personaList,
    ];
  },
});

const mainForm = useTemplateRef('mainForm');
const infoForm = useTemplateRef('infoForm');

// BloC 비용 계산 (원고당 고정 비용)
const CREDIT_COST_PER_POST = 5; // 원고 1개당 5 BloC

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

// 현재 스키마 (서브 키워드 제거됨 - 추천 키워드로 대체)
const currentSchema = aiPostSchema;

// 현재 postType에 해당하는 필드 설정
const currentFields = computed(() => {
  return (
    fieldConfigsByType[state.postType as string] || {
      description: '',
      fields: [],
    }
  );
});

// 블로그 지수 옵션
const blogIndexOptions = [
  { label: '일반', value: 'normal' },
  { label: '준최', value: 'semi-optimal' },
  { label: '최적', value: 'optimal' },
];

// 연관 키워드 조회 관련 상태
interface KeywordStat {
  relKeyword: string;
  monthlyPcQcCnt: number | string;
  monthlyMobileQcCnt: number | string;
  monthlyAvePcClkCnt: number;
  monthlyAveMobileClkCnt: number;
  monthlyAvePcCtr: number;
  monthlyAveMobileCtr: number;
  plAvgDepth: number;
  compIdx: string;
}

const relatedKeywords = ref<KeywordStat[]>([]);
const isLoadingKeywords = ref(false);
const showKeywordResults = ref(false);

// 추천 키워드 선택 상태
const selectedRecommendedKeyword = ref<string | null>(null);

// 검색량 기준 필터링 임계값
const SEARCH_VOLUME_THRESHOLDS = {
  normal: 10000, // 일반: 1만건 이상 제외
  'semi-optimal': 50000, // 준최: 5만건 이상 제외
  optimal: Infinity, // 최적: 필터링 없음
};

// 블로그 지수에 따른 추천 키워드 목록 (검색량 필터링 적용)
const recommendedKeywordsForBlogIndex = computed(() => {
  if (relatedKeywords.value.length === 0) {
    return [];
  }

  const threshold = SEARCH_VOLUME_THRESHOLDS[state.blogIndex as keyof typeof SEARCH_VOLUME_THRESHOLDS] || Infinity;

  switch (state.blogIndex) {
    case 'optimal':
      // 최적: 원본 키워드(0번) 하나만 반환 (필터링 없음)
      return relatedKeywords.value.slice(0, 1);
    case 'semi-optimal': {
      // 준최: 1~5번 인덱스 (상위 5개) 중 5만건 미만만 필터링
      const candidates = relatedKeywords.value.slice(1, 6);
      return candidates.filter((kw) => {
        const total = toSearchVolume(kw.monthlyPcQcCnt) + toSearchVolume(kw.monthlyMobileQcCnt);
        return total < threshold;
      });
    }
    case 'normal': {
      // 일반: 6~14번 인덱스 중 1만건 미만만 필터링
      const candidates = relatedKeywords.value.slice(6, 15);
      return candidates.filter((kw) => {
        const total = toSearchVolume(kw.monthlyPcQcCnt) + toSearchVolume(kw.monthlyMobileQcCnt);
        return total < threshold;
      });
    }
    default:
      return [];
  }
});

// 추천 키워드가 없는지 여부 (필터링 후)
const hasNoRecommendedKeywords = computed(() => {
  return showKeywordResults.value &&
         relatedKeywords.value.length > 0 &&
         recommendedKeywordsForBlogIndex.value.length === 0 &&
         state.blogIndex !== 'optimal';
});

// 키워드 관련 필수 조건 충족 여부
const isKeywordRequirementMet = computed(() => {
  // 희망 키워드가 입력되어 있어야 함
  if (!state.keyword || state.keyword.trim().length === 0) {
    return false;
  }
  // 연관 키워드 조회가 완료되어 있어야 함
  if (!showKeywordResults.value) {
    return false;
  }
  // 추천 키워드가 선택되어 있어야 함
  if (!selectedRecommendedKeyword.value) {
    return false;
  }
  return true;
});

// 제출 불가 사유 메시지
const submitBlockReason = computed(() => {
  if (!state.keyword || state.keyword.trim().length === 0) {
    return '희망 키워드를 입력해주세요';
  }
  if (!showKeywordResults.value) {
    return '키워드 조회를 완료해주세요';
  }
  if (hasNoRecommendedKeywords.value) {
    return '추천 키워드가 없습니다';
  }
  if (!selectedRecommendedKeyword.value) {
    return '추천 키워드를 선택해주세요';
  }
  return null;
});

// 블로그 지수가 최적인 경우 자동 선택 여부
const isAutoSelectedKeyword = computed(() => {
  return state.blogIndex === 'optimal';
});

// 연관 키워드 조회
const fetchRelatedKeywords = async () => {
  if (!state.keyword || state.keyword.trim().length === 0) {
    toast.add({
      title: '키워드를 입력해주세요',
      color: 'warning',
    });
    return;
  }

  isLoadingKeywords.value = true;
  showKeywordResults.value = false;

  try {
    const result = await useApi<{
      keyword: string;
      keywordList: KeywordStat[];
    }>('/blog-posts/keywords/related', {
      method: 'GET',
      params: { keyword: state.keyword.trim() },
    });

    relatedKeywords.value = result.keywordList || [];
    showKeywordResults.value = true;

    // 최적 지수인 경우 원본 키워드 자동 선택
    if (state.blogIndex === 'optimal' && relatedKeywords.value.length > 0) {
      selectedRecommendedKeyword.value = relatedKeywords.value[0]?.relKeyword ?? null;
    } else {
      selectedRecommendedKeyword.value = null;
    }
  } catch (err: any) {
    toast.add({
      title: '연관 키워드 조회 실패',
      description: err.message || '연관 키워드를 불러오는 중 오류가 발생했습니다.',
      color: 'error',
    });
  } finally {
    isLoadingKeywords.value = false;
  }
};

// 검색량을 숫자로 변환 (< 10 처리)
const toSearchVolume = (value: number | string): number => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.includes('<')) return 0;
  return parseInt(value, 10) || 0;
};

// PC + 모바일 합산 검색량 계산
const getCombinedSearchVolume = (kw: KeywordStat): string => {
  const pc = toSearchVolume(kw.monthlyPcQcCnt);
  const mobile = toSearchVolume(kw.monthlyMobileQcCnt);
  const total = pc + mobile;
  return total.toLocaleString();
};

// 동적 state (postType별 필드값 저장)
const state = reactive<{
  postType: string;
  personaId: number | undefined;
  blogIndex: string;
  keyword: string;
  length: number;
  count: number;
  fields: Record<string, any>;
}>({
  postType: postTypes[0] as string,
  personaId: undefined,
  blogIndex: 'normal', // 기본값: 일반
  keyword: '',
  length: 1500,
  count: 1,
  // 동적 필드 값들을 저장할 객체
  fields: {} as Record<string, string | number>,
});

// postType 변경 시 fields 초기화
watch(
  () => state.postType,
  () => {
    state.fields = {};
  },
);

// 희망 키워드 변경 시 연관 키워드 및 추천 키워드 리셋
watch(
  () => state.keyword,
  () => {
    // 키워드가 변경되면 이전 조회 결과 초기화
    relatedKeywords.value = [];
    showKeywordResults.value = false;
    selectedRecommendedKeyword.value = null;
  },
);

// 블로그 지수 변경 시 추천 키워드 선택 리셋
watch(
  () => state.blogIndex,
  (newBlogIndex) => {
    // 최적인 경우 원본 키워드 자동 선택
    if (
      newBlogIndex === 'optimal' &&
      relatedKeywords.value.length > 0
    ) {
      selectedRecommendedKeyword.value = relatedKeywords.value[0]?.relKeyword ?? null;
    } else {
      // 그 외에는 선택 초기화
      selectedRecommendedKeyword.value = null;
    }
  },
);

const toast = useToast();

const postRequest = async (e: FormSubmitEvent<AiPostSchema>) => {
  // additionalFields 정리: 빈 값 제거, 모두 비어있으면 null
  const cleanedFields: Record<string, any> = {};
  let hasFields = false;

  Object.entries(state.fields).forEach(([key, value]) => {
    // 값이 있고 공백이 아닌 경우만 포함
    if (value !== null && value !== undefined && String(value).trim() !== '') {
      cleanedFields[key] = value;
      hasFields = true;
    }
  });

  // 페르소나 처리: 임의 생성인 경우 플래그 설정
  let personaId = e.data.personaId;
  let useRandomPersona = false;

  if (personaId === RANDOM_PERSONA_VALUE) {
    // 임의 생성 선택 시 플래그 설정 (백엔드에서 각 원고마다 랜덤 생성)
    useRandomPersona = true;
    personaId = undefined; // personaId는 undefined로
  }

  // 최종 요청 데이터 (subKeywords 대신 recommendedKeyword 사용)
  const finalData = {
    postType: state.postType,
    keyword: state.keyword,
    length: state.length,
    count: state.count,
    personaId,
    useRandomPersona,
    blogIndex: state.blogIndex,
    recommendedKeyword: selectedRecommendedKeyword.value, // 선택된 추천 키워드
    additionalFields: hasFields ? cleanedFields : null, // 비어있으면 null
  };

  startTransition(async () => {
    try {
      const result = await useApi<{
        id: number;
      }>('/blog-posts', {
        method: 'POST',
        body: finalData,
      });

      if (!result.id) {
        throw new Error('원고 생성 요청에 실패했습니다.');
      }

      await auth.fetchUser();
      resetForm(); // 폼 리셋

      const instance = postDoneModal.open({
        completedPostCount: finalData.count,
      });

      const nextStep = (await instance.result) as boolean;

      if (nextStep) {
        await navigateTo(`/console/orders/${result.id}`);
      }
    } catch (err: any) {
      toast.add({
        title: '원고 생성 실패',
        description: err.message || '원고 생성 요청 중 오류가 발생했습니다.',
        color: 'error',
      });
    }
  });
};

// 폼 초기화 함수
const resetForm = () => {
  state.personaId = undefined;
  state.blogIndex = 'normal';
  state.keyword = '';
  state.length = 1500;
  state.count = 1;
  state.fields = {};
  // 연관 키워드 상태 초기화
  relatedKeywords.value = [];
  showKeywordResults.value = false;
  selectedRecommendedKeyword.value = null;
};

const onSubmit = () => {
  if (!mainForm.value || !infoForm.value) {
    return;
  }

  const infoFormData = new FormData(infoForm.value);
  const data = Object.fromEntries(infoFormData.entries());
  state.fields = { ...state.fields, ...data };

  mainForm.value.submit();
};
</script>

<template>
  <SubscriptionGuard>
    <section class="container mx-auto max-w-5xl">
      <ConsoleTitle
        title="스마트 원고 생성"
        description="AI를 활용한 포스트 작성을 도와드립니다."
      />

      <div class="grid grid-cols-2 gap-x-5 items-start">
        <article>
          <UForm
            @submit.prevent="postRequest"
            :state="state"
            :schema="currentSchema"
            ref="mainForm"
          >
            <div class="flex flex-col gap-y-4 mb-8">
              <h4 class="font-bold">원고 개요</h4>
              <UFormField label="포스트 유형" name="postType" required>
                <USelect
                  v-model="state.postType"
                  name="postType"
                  :items="postTypes"
                  variant="soft"
                  class="w-full"
                  size="xl"
                  placeholder="포스트 유형을 선택해 주세요."
                />
              </UFormField>
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
              <UFormField label="작성 예정 블로그 지수" name="blogIndex" required>
                <USelect
                  v-model="state.blogIndex"
                  name="blogIndex"
                  :items="blogIndexOptions"
                  variant="soft"
                  class="w-full"
                  size="xl"
                />
              </UFormField>
              <UFormField label="희망 키워드" name="keyword" required>
                <div class="flex gap-2">
                  <UInput
                    v-model.trim="state.keyword"
                    name="keyword"
                    type="text"
                    placeholder="예: 인공지능, 여행 팁 등"
                    size="xl"
                    class="flex-1"
                    variant="soft"
                    @keyup.enter="fetchRelatedKeywords"
                  />
                  <UButton
                    color="neutral"
                    variant="soft"
                    size="xl"
                    :loading="isLoadingKeywords"
                    @click="fetchRelatedKeywords"
                  >
                    <UIcon name="i-heroicons-magnifying-glass" class="w-5 h-5" />
                    조회
                  </UButton>
                </div>
                <template #label>
                  <div class="inline-flex items-center">
                    <span>희망 키워드</span>
                    <UIcon
                      name="i-heroicons-information-circle"
                      class="w-4 h-4 text-neutral-600 inline-block ml-1"
                    />
                  </div>
                </template>
                <template #description>
                  <span class="text-xs text-neutral-500">
                    키워드 입력 후 조회 버튼을 클릭하면 연관 키워드와 검색량을
                    확인할 수 있습니다.
                  </span>
                </template>
              </UFormField>

              <!-- 추천 키워드가 없을 때 경고 메시지 -->
              <div
                v-if="hasNoRecommendedKeywords"
                class="rounded-xl border border-warning-300 dark:border-warning-700 overflow-hidden bg-warning-50 dark:bg-warning-950/20"
              >
                <div
                  class="flex items-start gap-3 p-4"
                >
                  <UIcon
                    name="i-heroicons-exclamation-triangle"
                    class="w-5 h-5 text-warning-600 shrink-0 mt-0.5"
                  />
                  <div class="flex-1">
                    <p class="text-sm font-semibold text-warning-700 dark:text-warning-400 mb-1">
                      추천할 수 있는 키워드가 없습니다
                    </p>
                    <p class="text-xs text-warning-600 dark:text-warning-500 leading-relaxed">
                      선택한 블로그 지수({{ state.blogIndex === 'normal' ? '일반' : '준최' }})에 적합한 검색량의 키워드가 없습니다.
                      <span class="font-medium">희망 키워드를 변경</span>하거나
                      <span class="font-medium">블로그 지수를 조정</span>해 주세요.
                    </p>
                  </div>
                </div>
              </div>

              <!-- 추천 키워드 선택 영역 -->
              <div
                v-if="showKeywordResults && recommendedKeywordsForBlogIndex.length > 0"
                class="rounded-xl border border-primary-200 dark:border-primary-800 overflow-hidden bg-primary-50/50 dark:bg-primary-950/20"
              >
                <div
                  class="flex items-center gap-2 px-4 py-3 bg-primary-100 dark:bg-primary-900/30 border-b border-primary-200 dark:border-primary-800"
                >
                  <UIcon
                    name="i-heroicons-star"
                    class="w-5 h-5 text-primary-600"
                  />
                  <span
                    class="text-sm font-semibold text-primary-900 dark:text-primary-100"
                  >
                    추천 키워드
                    <span class="font-normal text-primary-600 dark:text-primary-400">
                      ({{ state.blogIndex === 'optimal' ? '최적' : state.blogIndex === 'semi-optimal' ? '준최' : '일반' }} 블로그 지수 기준)
                    </span>
                  </span>
                </div>

                <div class="p-4">
                  <!-- 최적: 자동 선택 안내 -->
                  <div
                    v-if="isAutoSelectedKeyword"
                    class="flex items-center gap-3 p-3 rounded-lg bg-success-50 dark:bg-success-950/20 border border-success-200 dark:border-success-800"
                  >
                    <UIcon
                      name="i-heroicons-check-circle"
                      class="w-5 h-5 text-success-600 shrink-0"
                    />
                    <div class="flex-1">
                      <p class="text-sm font-medium text-success-700 dark:text-success-400">
                        원본 키워드가 자동 선택되었습니다
                      </p>
                      <p class="text-xs text-success-600 dark:text-success-500 mt-0.5">
                        최적 블로그 지수에서는 원본 키워드 "{{ selectedRecommendedKeyword }}"가 추천됩니다.
                      </p>
                    </div>
                  </div>

                  <!-- 준최/일반: 키워드 선택 -->
                  <div v-else class="space-y-3">
                    <p class="text-xs text-neutral-600 dark:text-neutral-400">
                      아래 키워드 중 하나를 선택해주세요.
                      <span class="text-neutral-400 dark:text-neutral-500">
                        (괄호 안 숫자: 월간 검색량 PC+모바일 합산)
                      </span>
                    </p>
                    <div class="flex flex-wrap gap-2">
                      <button
                        v-for="kw in recommendedKeywordsForBlogIndex"
                        :key="kw.relKeyword"
                        type="button"
                        class="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all"
                        :class="
                          selectedRecommendedKeyword === kw.relKeyword
                            ? 'bg-primary-600 text-white shadow-md ring-2 ring-primary-600 ring-offset-2 dark:ring-offset-neutral-900'
                            : 'bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 hover:border-primary-300 hover:bg-primary-50 dark:hover:bg-primary-900/20'
                        "
                        @click="selectedRecommendedKeyword = kw.relKeyword"
                      >
                        <span>{{ kw.relKeyword }}</span>
                        <span
                          class="text-xs opacity-70"
                          :class="
                            selectedRecommendedKeyword === kw.relKeyword
                              ? 'text-white/80'
                              : 'text-neutral-500 dark:text-neutral-400'
                          "
                        >
                          ({{ getCombinedSearchVolume(kw) }})
                        </span>
                      </button>
                    </div>

                    <!-- 선택된 키워드 표시 -->
                    <div
                      v-if="selectedRecommendedKeyword"
                      class="flex items-center gap-2 pt-2 border-t border-primary-200 dark:border-primary-800"
                    >
                      <UIcon
                        name="i-heroicons-check-circle"
                        class="w-4 h-4 text-success-600"
                      />
                      <span class="text-sm text-neutral-700 dark:text-neutral-300">
                        선택된 추천 키워드:
                        <span class="font-semibold text-primary-600">
                          {{ selectedRecommendedKeyword }}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

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
            </div>
          </UForm>

          <div class="flex flex-col gap-y-4">
            <form ref="infoForm">
              <h4 class="font-bold mb-1">원고 정보 입력</h4>
              <p class="text-[13px] text-muted dark:text-gray-400 mb-2">
                {{ currentFields.description }}
              </p>
              <div class="flex flex-col gap-y-4">
                <UFormField
                  v-for="field in currentFields.fields"
                  :key="field.name"
                  :label="field.label"
                  :name="field.name"
                  :required="field.required"
                >
                  <UInput
                    v-if="field.type === 'text'"
                    v-model.trim="state.fields[field.name]"
                    :name="field.name"
                    type="text"
                    :placeholder="field.placeholder"
                    size="xl"
                    class="w-full"
                    variant="soft"
                  />
                  <UTextarea
                    v-else-if="field.type === 'textarea'"
                    v-model.trim="state.fields[field.name]"
                    :name="field.name"
                    :rows="field.rows || 4"
                    :placeholder="field.placeholder"
                    size="xl"
                    class="w-full"
                    variant="soft"
                  />
                  <UInput
                    v-else-if="field.type === 'number'"
                    v-model.number="state.fields[field.name]"
                    :name="field.name"
                    type="number"
                    :placeholder="field.placeholder"
                    size="xl"
                    class="w-full"
                    variant="soft"
                  />
                </UFormField>
              </div>
            </form>
          </div>
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
                <span
                  class="text-sm font-medium text-neutral-700 dark:text-neutral-300"
                >
                  보유 BloC
                </span>
              </div>
              <div class="flex items-center gap-2">
                <span
                  class="text-lg font-bold"
                  :class="
                    isInsufficientBalance ? 'text-error' : 'text-primary-600'
                  "
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
                <span
                  class="text-sm font-medium text-primary-700 dark:text-primary-400"
                >
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
                <p
                  class="text-sm font-semibold text-error-700 dark:text-error-400 mb-1"
                >
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
              :disabled="isInsufficientBalance || !isKeywordRequirementMet"
              class="bg-linear-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 font-bold mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
              @click="onSubmit"
            >
              <template v-if="isInsufficientBalance">
                BloC 부족 - 충전 필요
              </template>
              <template v-else-if="submitBlockReason">
                {{ submitBlockReason }}
              </template>
              <template v-else>
                스마트 원고 생성 시작 ({{ totalCost.toLocaleString() }} BloC
                사용)
              </template>
            </UButton>
          </div>
        </article>
        <article class="space-y-4 sticky top-24">
          <!-- Hero Card -->
          <UCard variant="soft" class="relative overflow-hidden">
            <!-- Animated Background Gradient -->
            <div
              class="absolute inset-0 bg-linear-to-br from-primary-500/10 via-purple-500/5 to-blue-500/10 pointer-events-none"
            />

            <div class="relative">
              <!-- Icon & Title -->
              <div class="flex items-start gap-4 mb-3">
                <div
                  class="shrink-0 w-14 h-14 rounded-2xl bg-linear-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/30"
                >
                  <UIcon
                    name="i-heroicons-sparkles"
                    class="w-7 h-7 text-white"
                  />
                </div>
                <div class="flex-1 pt-1">
                  <h3
                    class="text-xl font-bold text-neutral-900 dark:text-white mb-2"
                  >
                    AI 스마트 원고 생성
                  </h3>
                  <p
                    class="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed"
                  >
                    실시간 상위 노출 블로그의 키워드를 분석하여 SEO에 최적화된
                    블로그 원고를 자동으로 생성합니다.
                  </p>
                </div>
              </div>
            </div>
          </UCard>

          <!-- Process Steps Card -->
          <UCard variant="soft">
            <div class="space-y-4">
              <div class="flex items-center gap-2">
                <div class="w-1 h-5 bg-primary-600 rounded-full" />
                <h4 class="font-bold text-neutral-900 dark:text-white">
                  생성 프로세스
                </h4>
              </div>

              <div class="space-y-3">
                <!-- Step 1 -->
                <div
                  class="group flex items-start gap-3 p-3 rounded-xl hover:bg-primary-500/5 transition-colors"
                >
                  <div
                    class="shrink-0 w-10 h-10 rounded-lg bg-linear-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-sm"
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
                      키워드 분석
                    </h5>
                    <p
                      class="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed"
                    >
                      실시간으로 상위 노출 블로그를 분석하여 최적의 키워드를
                      추출합니다.
                    </p>
                  </div>
                </div>

                <!-- Step 2 -->
                <div
                  class="group flex items-start gap-3 p-3 rounded-xl hover:bg-primary-500/5 transition-colors"
                >
                  <div
                    class="shrink-0 w-10 h-10 rounded-lg bg-linear-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-sm"
                  >
                    <UIcon
                      name="i-heroicons-document-text"
                      class="w-5 h-5 text-white"
                    />
                  </div>
                  <div class="flex-1 pt-1">
                    <h5
                      class="text-sm font-semibold text-neutral-900 dark:text-white mb-1"
                    >
                      콘텐츠 생성
                    </h5>
                    <p
                      class="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed"
                    >
                      SEO에 최적화된 블로그 원고를 AI가 자동으로 작성합니다.
                    </p>
                  </div>
                </div>

                <!-- Step 3 -->
                <div
                  class="group flex items-start gap-3 p-3 rounded-xl hover:bg-primary-500/5 transition-colors"
                >
                  <div
                    class="shrink-0 w-10 h-10 rounded-lg bg-linear-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-sm"
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
                      맞춤형 편집
                    </h5>
                    <p
                      class="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed"
                    >
                      요구사항에 맞게 조정하여 개성 있는 글을 완성합니다.
                    </p>
                  </div>
                </div>

                <!-- Step 4 -->
                <div
                  class="group flex items-start gap-3 p-3 rounded-xl hover:bg-primary-500/5 transition-colors"
                >
                  <div
                    class="shrink-0 w-10 h-10 rounded-lg bg-linear-to-br from-green-500 to-green-600 flex items-center justify-center shadow-sm"
                  >
                    <UIcon
                      name="i-heroicons-check-circle"
                      class="w-5 h-5 text-white"
                    />
                  </div>
                  <div class="flex-1 pt-1">
                    <h5
                      class="text-sm font-semibold text-neutral-900 dark:text-white mb-1"
                    >
                      게시 준비 완료
                    </h5>
                    <p
                      class="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed"
                    >
                      바로 게시할 수 있도록 포맷팅되어 제공됩니다.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </UCard>

          <!-- Features Card -->
          <UCard
            variant="soft"
            class="bg-linear-to-br from-primary-50 to-purple-50 dark:from-primary-950/20 dark:to-purple-950/20"
          >
            <div class="space-y-4">
              <div class="flex items-center gap-2">
                <div class="w-1 h-5 bg-primary-600 rounded-full" />
                <h4 class="font-bold text-neutral-900 dark:text-white">
                  주요 기능
                </h4>
              </div>

              <div class="grid grid-cols-2 gap-2.5">
                <div
                  class="flex flex-col items-center text-center p-3 rounded-xl bg-white/70 dark:bg-neutral-900/70 hover:shadow-md transition-shadow"
                >
                  <div
                    class="w-11 h-11 rounded-xl bg-primary-500/10 flex items-center justify-center mb-2"
                  >
                    <UIcon
                      name="i-heroicons-bolt"
                      class="w-6 h-6 text-primary-600"
                    />
                  </div>
                  <span
                    class="text-xs font-semibold text-neutral-900 dark:text-white"
                  >
                    실시간 분석
                  </span>
                </div>

                <div
                  class="flex flex-col items-center text-center p-3 rounded-xl bg-white/70 dark:bg-neutral-900/70 hover:shadow-md transition-shadow"
                >
                  <div
                    class="w-11 h-11 rounded-xl bg-purple-500/10 flex items-center justify-center mb-2"
                  >
                    <UIcon
                      name="i-heroicons-chart-bar"
                      class="w-6 h-6 text-purple-600"
                    />
                  </div>
                  <span
                    class="text-xs font-semibold text-neutral-900 dark:text-white"
                  >
                    SEO 최적화
                  </span>
                </div>

                <div
                  class="flex flex-col items-center text-center p-3 rounded-xl bg-white/70 dark:bg-neutral-900/70 hover:shadow-md transition-shadow"
                >
                  <div
                    class="w-11 h-11 rounded-xl bg-blue-500/10 flex items-center justify-center mb-2"
                  >
                    <UIcon
                      name="i-heroicons-user-group"
                      class="w-6 h-6 text-blue-600"
                    />
                  </div>
                  <span
                    class="text-xs font-semibold text-neutral-900 dark:text-white"
                  >
                    다양한 페르소나
                  </span>
                </div>

                <div
                  class="flex flex-col items-center text-center p-3 rounded-xl bg-white/70 dark:bg-neutral-900/70 hover:shadow-md transition-shadow"
                >
                  <div
                    class="w-11 h-11 rounded-xl bg-green-500/10 flex items-center justify-center mb-2"
                  >
                    <UIcon
                      name="i-heroicons-clock"
                      class="w-6 h-6 text-green-600"
                    />
                  </div>
                  <span
                    class="text-xs font-semibold text-neutral-900 dark:text-white"
                  >
                    빠른 생성
                  </span>
                </div>
              </div>
            </div>
          </UCard>

          <!-- Info Notice -->
          <UCard
            variant="soft"
            class="bg-primary-500/5 border border-primary-200 dark:border-primary-800"
          >
            <div class="flex gap-3">
              <UIcon
                name="i-heroicons-information-circle"
                class="w-5 h-5 text-primary-600 shrink-0 mt-0.5"
              />
              <p
                class="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed"
              >
                생성된 원고는 AI 기반으로 작성되므로 최종 검토 후 사용하시는
                것을 권장합니다.
              </p>
            </div>
          </UCard>
        </article>
      </div>
    </section>
  </SubscriptionGuard>
</template>
