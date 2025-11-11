<script lang="ts" setup>
definePageMeta({
  middleware: 'auth',
});

const [isPending, startTransition] = useTransition();

const price = ref(10);

const postTypes = [
  '맛집 후기',
  '방문 후기',
  '여행 후기',
  '제품 후기',
  '맛집 정보성',
  '일반 키워드 정보성',
  '병/의원 의료상식 정보성',
  '법률상식 정보성',
];
const personas = [
  '친근한 작가',
  '전문 저널리스트',
  '기술 전문가',
  '창의적 스토리텔러',
];

const state = reactive({
  postType: postTypes[0],
  persona: personas[0],
  keyword: '',
  subKeywords: [],
  length: 300,
  count: 1,
  content: '',
  companyName: '',
  extra: '',
});

const onSubmit = () => {
  console.log('Submitting AI Post Request with state:', state);
  startTransition(async () => {
    await useWait(5000);
  });
};
</script>

<template>
  <section class="container mx-auto max-w-5xl">
    <ConsoleTitle
      title="스마트 원고 생성"
      description="AI를 활용한 포스트 작성을 도와드립니다."
    />

    <div class="grid grid-cols-2 gap-x-5">
      <article>
        <UForm class="" :state="state">
          <div class="flex flex-col gap-y-4 mb-8">
            <h4 class="font-bold">원고 개요</h4>
            <UFormField label="포스트 유형" name="postType" required>
              <USelect
                v-model="state.postType"
                :items="postTypes"
                variant="soft"
                class="w-full"
                size="xl"
              />
            </UFormField>
            <UFormField label="페르소나" name="persona" required>
              <USelect
                v-model="state.persona"
                :items="personas"
                variant="soft"
                class="w-full"
                size="xl"
              />
              <template #hint>
                <UButton size="xs" color="neutral">새 페르소나 추가</UButton>
              </template>
            </UFormField>
            <UFormField label="검색 키워드" name="keyword" required>
              <UInput
                v-model="state.keyword"
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
            <UFormField label="서브 키워드" name="subKeywords" required>
              <UInputTags
                v-model="state.subKeywords"
                size="xl"
                variant="soft"
                class="w-full"
                :max="5"
                placeholder="서브 키워드를 입력하고 Enter를 눌러 추가하세요"
              />
            </UFormField>
            <UFormField label="글자 수" name="length" required>
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

          <div class="flex flex-col gap-y-4">
            <h4 class="font-bold">원고 정보 입력</h4>
            <UFormField label="업체 이름" name="companyName" required>
              <UInput
                v-model="state.companyName"
                type="text"
                placeholder="원고에 포함될 업체의 이름을 입력해주세요"
                size="xl"
                class="w-full"
                variant="soft"
              />
            </UFormField>
            <UFormField label="추가 정보" name="extra" required>
              <UTextarea
                v-model="state.extra"
                :rows="6"
                placeholder="글에 포함되면 좋은 구체적인 요청사항을 알려주시면 더 정확하고 현실적인 원고 작성에 도움이 됩니다. 예: 가격, 위치, 영업시간, 후기 스타일, 실제 방문 경험 등"
                size="xl"
                class="w-full"
                variant="soft"
              />
            </UFormField>
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
        </UForm>
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
