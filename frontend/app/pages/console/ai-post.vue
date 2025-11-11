<script lang="ts" setup>
import type { FormSubmitEvent } from '@nuxt/ui';
import {
  fieldConfigsByType,
  postTypes,
  aiPostSchema,
  manualInputPostSchema,
  type AiPostSchema,
} from '~/schemas/post';

definePageMeta({
  middleware: 'auth',
});

const [isPending, startTransition] = useTransition();

interface SimplePersona
  extends Pick<Persona, 'id' | 'occupation' | 'age' | 'gender'> {}

const { data: personas } = await useApiFetch<
  {
    label: string;
    value: number;
  }[]
>('/personas/my/simple', {
  method: 'GET',
  lazy: true,
  transform: (data: any) => {
    return data.map((item: SimplePersona) => ({
      label: `${item.occupation} (${item.age}세, ${item.gender})`,
      value: item.id,
    }));
  },
});

const price = ref(10);
const mainForm = useTemplateRef('mainForm');
const infoForm = useTemplateRef('infoForm');

// 서브 키워드 입력 방식: true = AI 추천, false = 직접 입력
const useAIRecommendation = ref(true);

// 현재 모드에 따른 스키마 선택
const currentSchema = computed(() => {
  return useAIRecommendation.value ? aiPostSchema : manualInputPostSchema;
});

// 현재 postType에 해당하는 필드 설정
const currentFields = computed(() => {
  return (
    fieldConfigsByType[state.postType as string] || {
      description: '',
      fields: [],
    }
  );
});

// 동적 state (postType별 필드값 저장)
const state = reactive<
  Omit<AiPostSchema, 'personaId'> & {
    personaId: number | undefined;
    fields: Record<string, any>;
  }
>({
  postType: postTypes[0] as string,
  personaId: undefined,
  keyword: '',
  subKeywords: [],
  length: 300,
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

// 서브 키워드 토글 변경 시 처리
watch(useAIRecommendation, (useAI) => {
  if (useAI) {
    // AI 추천 모드로 변경 시 배열 초기화
    state.subKeywords = [];
  }

  // 모드 변경 시 form validation 에러 초기화
  nextTick(() => {
    if (mainForm.value) {
      mainForm.value.clear('subKeywords');
    }
  });
});

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

  // 서브 키워드 입력 방식에 따라 null 처리
  const finalData = {
    ...e.data,
    subKeywords: useAIRecommendation.value ? null : e.data.subKeywords,
    additionalFields: hasFields ? cleanedFields : null, // 비어있으면 null
  };

  startTransition(async () => {
    try {
      const { data, error } = await useApiFetch('/blog-posts', {
        method: 'POST',
        body: finalData,
      });

      if (error.value) {
        throw new Error(
          error.value.message || '원고 생성 요청에 실패했습니다.',
        );
      }

      toast.add({
        title: '원고 생성 요청 완료',
        description: `${finalData.count}개의 원고 생성이 시작되었습니다. 진행 상황은 목록에서 확인하실 수 있습니다.`,
        color: 'success',
      });

      // 성공 후 폼 초기화
      state.personaId = undefined;
      state.keyword = '';
      state.subKeywords = [];
      state.length = 300;
      state.count = 1;
      state.fields = {};

      // 목록 페이지로 이동 (선택사항)
      // await navigateTo('/console/blog-posts');
    } catch (err: any) {
      toast.add({
        title: '원고 생성 실패',
        description: err.message || '원고 생성 요청 중 오류가 발생했습니다.',
        color: 'error',
      });
    }
  });
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
            <UFormField label="페르소나" name="personaId" required>
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
            <UFormField label="검색 키워드" name="keyword" required>
              <UInput
                v-model.trim="state.keyword"
                name="keyword"
                type="text"
                placeholder="예: 인공지능, 여행 팁 등"
                size="xl"
                class="w-full"
                variant="soft"
              />
              <template #label>
                <div class="inline-flex items-center">
                  <span>검색 키워드</span>
                  <Icon
                    name="i-heroicons-information-circle"
                    class="w-4 h-4 text-neutral-600 inline-block ml-1"
                  />
                </div>
              </template>
            </UFormField>
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <label
                  class="text-sm font-medium text-neutral-900 dark:text-white"
                >
                  서브 키워드
                </label>
                <div class="flex items-center gap-2">
                  <span class="text-xs text-neutral-500">
                    {{ useAIRecommendation ? 'AI 추천' : '직접 입력' }}
                  </span>
                  <USwitch v-model="useAIRecommendation" />
                </div>
              </div>

              <!-- FormField는 항상 렌더링하여 에러 표시 -->
              <UFormField name="subKeywords" :required="!useAIRecommendation">
                <!-- AI 추천 모드 안내 -->
                <div
                  v-if="useAIRecommendation"
                  class="flex items-start gap-3 p-3 rounded-lg bg-primary-50 dark:bg-primary-950/20 border border-primary-200 dark:border-primary-800"
                >
                  <UIcon
                    name="i-heroicons-sparkles"
                    class="w-5 h-5 text-primary-600 shrink-0 mt-0.5"
                  />
                  <div
                    class="flex-1 text-xs text-primary-700 dark:text-primary-400"
                  >
                    <p class="font-semibold mb-1">
                      AI가 자동으로 서브 키워드를 추천합니다
                    </p>
                    <p
                      class="text-primary-600 dark:text-primary-500 leading-relaxed"
                    >
                      상위 노출 블로그를 수집한 후, 해당 블로그 내용의 키워드를
                      AI로 분석하여 최적의 서브 키워드를 자동으로
                      추출해드립니다.
                    </p>
                  </div>
                </div>

                <!-- 직접 입력 모드 -->
                <UInputTags
                  v-else
                  v-model="state.subKeywords"
                  name="subKeywords"
                  size="xl"
                  variant="soft"
                  class="w-full"
                  :max="5"
                  placeholder="서브 키워드를 입력하고 Enter를 눌러 추가하세요"
                />
              </UFormField>
            </div>
            <UFormField label="글자 수" name="length" required>
              <input type="hidden" name="length" :value="state.length" />
              <div class="flex justify-between py-1">
                <UButton
                  v-for="len in [300, 500, 1000, 1500, 2000, 3000]"
                  :key="`len-${len.toString()}`"
                  size="lg"
                  :color="state.length === len ? 'primary' : 'neutral'"
                  :variant="state.length === len ? 'solid' : 'soft'"
                  class="rounded-full"
                  @click="state.length = len"
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
        <div class="">
          <UButton
            type="button"
            size="xl"
            block
            color="primary"
            :loading="isPending"
            class="bg-linear-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 font-bold mt-6"
            @click="onSubmit"
          >
            스마트 원고 생성 시작 ({{ price }} BloC 사용)
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
                <UIcon name="i-heroicons-sparkles" class="w-7 h-7 text-white" />
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
              생성된 원고는 AI 기반으로 작성되므로 최종 검토 후 사용하시는 것을
              권장합니다.
            </p>
          </div>
        </UCard>
      </article>
    </div>
  </section>
</template>
