<script lang="ts" setup>
import type { FormSubmitEvent } from '#ui/types';
import {
  createPersonaSchema,
  type CreatePersonaSchema,
  genderOptions,
  blogTopicOptions,
} from '~/schemas/persona';

definePageMeta({
  middleware: 'auth',
});

const [isPending, startTransition] = useTransition();
const toast = useToast();
const { generateRandomPersona } = useRandomPersona();

// 직접 입력 모드 여부
const isCustomBlogTopic = ref(false);
const customBlogTopic = ref('');

const state = reactive<CreatePersonaSchema>({
  gender: genderOptions[0]!,
  blogTopic: '',
  characteristics: '',
});

// 블로그 주제 선택 시 처리
const selectedBlogTopic = ref('');
watch(selectedBlogTopic, (newValue) => {
  if (newValue === '직접 입력') {
    isCustomBlogTopic.value = true;
    state.blogTopic = customBlogTopic.value;
  } else {
    isCustomBlogTopic.value = false;
    state.blogTopic = newValue;
  }
});

// 직접 입력값 변경 시 state 업데이트
watch(customBlogTopic, (newValue) => {
  if (isCustomBlogTopic.value) {
    state.blogTopic = newValue;
  }
});

// 랜덤 페르소나 생성 핸들러
const handleRandomGenerate = () => {
  const randomPersona = generateRandomPersona();
  Object.assign(state, randomPersona);
  selectedBlogTopic.value = randomPersona.blogTopic;
  isCustomBlogTopic.value = false;
  customBlogTopic.value = '';

  toast.add({
    title: '랜덤 페르소나 생성',
    description: '페르소나 정보가 랜덤으로 생성되었습니다.',
    color: 'success',
  });
};

const onSubmit = async (event: FormSubmitEvent<CreatePersonaSchema>) => {
  startTransition(async () => {
    try {
      await useApi('/personas', {
        method: 'POST',
        body: event.data,
      });

      toast.add({
        title: '페르소나 생성 완료',
        description: '새로운 페르소나가 성공적으로 생성되었습니다.',
        color: 'success',
      });

      // 페르소나 목록 페이지로 이동
      return navigateTo('/console/personas/manage');
    } catch (err: any) {
      const message = err.response?._data?.message || err.message;
      toast.add({
        title: '페르소나 생성 실패',
        description: message || '페르소나 생성 중 오류가 발생했습니다.',
        color: 'error',
      });
    }
  });
};
</script>

<template>
  <SubscriptionGuard>
    <section class="container mx-auto max-w-5xl">
      <ConsoleTitle
        title="페르소나 생성"
        description="블로그 원고 작성에 사용할 페르소나를 만들어보세요."
        returnPath="/console/personas/manage"
      />

      <div class="grid grid-cols-2 gap-x-5">
        <article>
          <!-- Random Generate Button -->
          <div class="mb-6">
            <UButton
              type="button"
              size="xl"
              block
              color="neutral"
              variant="outline"
              @click="handleRandomGenerate"
              icon="i-heroicons-sparkles"
            >
              랜덤 페르소나 생성
            </UButton>
          </div>

          <UForm
            :state="state"
            :schema="createPersonaSchema"
            @submit="onSubmit"
          >
            <div class="flex flex-col gap-y-4 mb-8">
              <h4 class="font-bold">기본 정보</h4>

              <UFormField label="성별" name="gender" required>
                <USelect
                  v-model="state.gender"
                  :items="genderOptions"
                  variant="soft"
                  class="w-full"
                  size="xl"
                />
              </UFormField>

              <UFormField label="운영중인 블로그 주제" name="blogTopic" required>
                <div class="space-y-3">
                  <USelect
                    v-model="selectedBlogTopic"
                    :items="blogTopicOptions"
                    placeholder="블로그 주제를 선택해주세요"
                    variant="soft"
                    class="w-full"
                    size="xl"
                  />
                  <UInput
                    v-if="isCustomBlogTopic"
                    v-model.trim="customBlogTopic"
                    type="text"
                    placeholder="운영중인 블로그의 주제를 직접 입력해주세요"
                    size="xl"
                    class="w-full"
                    variant="soft"
                  />
                </div>
              </UFormField>
            </div>

            <div class="flex flex-col gap-y-4 mb-8">
              <h4 class="font-bold">추가 설정</h4>

              <UFormField label="기타특징" name="characteristics">
                <UTextarea
                  v-model="state.characteristics"
                  :rows="6"
                  placeholder="매주 새로운 맛집을 탐방하며 나만의 맛집 지도를 만들고 있어요. 3년째 전국의 숨은 맛집들을 찾아다니고 있으며, 지금까지 300곳 이상의 맛집을 방문했습니다."
                  size="xl"
                  class="w-full"
                  variant="soft"
                />
                <template #description>
                  <span class="text-xs text-neutral-500">
                    블로그 운영 스타일이나 특징을 자유롭게 입력해주세요. 원고 작성 시 반영됩니다.
                  </span>
                </template>
              </UFormField>
            </div>

            <div>
              <UButton
                type="submit"
                size="xl"
                block
                color="primary"
                :loading="isPending"
                class="bg-linear-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 font-bold"
              >
                페르소나 생성하기
              </UButton>
            </div>
          </UForm>
        </article>

        <article class="space-y-4 sticky top-24">
          <!-- Hero Card -->
          <UCard variant="soft" class="relative overflow-hidden">
            <div
              class="absolute inset-0 bg-linear-to-br from-primary-500/10 via-purple-500/5 to-blue-500/10 pointer-events-none"
            />

            <div class="relative">
              <div class="flex items-start gap-4 mb-3">
                <div
                  class="shrink-0 w-14 h-14 rounded-2xl bg-linear-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/30"
                >
                  <UIcon
                    name="i-heroicons-user-circle"
                    class="w-7 h-7 text-white"
                  />
                </div>
                <div class="flex-1 pt-1">
                  <h3
                    class="text-xl font-bold text-neutral-900 dark:text-white mb-2"
                  >
                    페르소나란?
                  </h3>
                  <p
                    class="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed"
                  >
                    페르소나는 블로그 원고 작성 시 사용되는 가상의 인물입니다.
                    블로그 주제와 특징을 설정하여 일관된 스타일의 글을 작성할
                    수 있습니다.
                  </p>
                </div>
              </div>
            </div>
          </UCard>

          <!-- Benefits Card -->
          <UCard variant="soft">
            <div class="space-y-4">
              <div class="flex items-center gap-2">
                <div class="w-1 h-5 bg-primary-600 rounded-full" />
                <h4 class="font-bold text-neutral-900 dark:text-white">
                  페르소나 활용 이점
                </h4>
              </div>

              <div class="space-y-3">
                <div
                  class="group flex items-start gap-3 p-3 rounded-xl hover:bg-primary-500/5 transition-colors"
                >
                  <div
                    class="shrink-0 w-10 h-10 rounded-lg bg-linear-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-sm"
                  >
                    <UIcon
                      name="i-heroicons-sparkles"
                      class="w-5 h-5 text-white"
                    />
                  </div>
                  <div class="flex-1 pt-1">
                    <h5
                      class="text-sm font-semibold text-neutral-900 dark:text-white mb-1"
                    >
                      일관된 톤앤매너
                    </h5>
                    <p
                      class="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed"
                    >
                      설정한 페르소나에 맞춰 일관된 스타일의 원고를 작성할 수
                      있습니다.
                    </p>
                  </div>
                </div>

                <div
                  class="group flex items-start gap-3 p-3 rounded-xl hover:bg-primary-500/5 transition-colors"
                >
                  <div
                    class="shrink-0 w-10 h-10 rounded-lg bg-linear-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-sm"
                  >
                    <UIcon
                      name="i-heroicons-users"
                      class="w-5 h-5 text-white"
                    />
                  </div>
                  <div class="flex-1 pt-1">
                    <h5
                      class="text-sm font-semibold text-neutral-900 dark:text-white mb-1"
                    >
                      다양한 타겟층
                    </h5>
                    <p
                      class="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed"
                    >
                      여러 페르소나를 만들어 다양한 독자층에게 맞는 콘텐츠를
                      제공하세요.
                    </p>
                  </div>
                </div>

                <div
                  class="group flex items-start gap-3 p-3 rounded-xl hover:bg-primary-500/5 transition-colors"
                >
                  <div
                    class="shrink-0 w-10 h-10 rounded-lg bg-linear-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-sm"
                  >
                    <UIcon
                      name="i-heroicons-light-bulb"
                      class="w-5 h-5 text-white"
                    />
                  </div>
                  <div class="flex-1 pt-1">
                    <h5
                      class="text-sm font-semibold text-neutral-900 dark:text-white mb-1"
                    >
                      맞춤형 콘텐츠
                    </h5>
                    <p
                      class="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed"
                    >
                      타겟 독자의 특성을 반영한 더욱 공감되는 글을 작성할 수
                      있습니다.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </UCard>

          <!-- Example Card -->
          <UCard
            variant="soft"
            class="bg-linear-to-br from-primary-50 to-purple-50 dark:from-primary-950/20 dark:to-purple-950/20"
          >
            <div class="space-y-4">
              <div class="flex items-center gap-2">
                <div class="w-1 h-5 bg-primary-600 rounded-full" />
                <h4 class="font-bold text-neutral-900 dark:text-white">
                  작성 예시
                </h4>
              </div>

              <div class="space-y-3">
                <div
                  class="p-4 rounded-xl bg-white/70 dark:bg-neutral-900/70 border border-primary-200 dark:border-primary-800"
                >
                  <div class="flex items-center gap-2 mb-2">
                    <UIcon
                      name="i-heroicons-user"
                      class="w-4 h-4 text-primary-600"
                    />
                    <span
                      class="text-xs font-semibold text-neutral-900 dark:text-white"
                    >
                      맛집/카페 블로거 (여성)
                    </span>
                  </div>
                  <p
                    class="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed"
                  >
                    "오늘 점심에 새로 생긴 맛집에 다녀왔어요! 정말 기대
                    이상이었답니다 :)"
                  </p>
                </div>

                <div
                  class="p-4 rounded-xl bg-white/70 dark:bg-neutral-900/70 border border-purple-200 dark:border-purple-800"
                >
                  <div class="flex items-center gap-2 mb-2">
                    <UIcon
                      name="i-heroicons-user"
                      class="w-4 h-4 text-purple-600"
                    />
                    <span
                      class="text-xs font-semibold text-neutral-900 dark:text-white"
                    >
                      여행/나들이 블로거 (남성)
                    </span>
                  </div>
                  <p
                    class="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed"
                  >
                    "주말에 다녀온 경주 여행 후기입니다. 역사와 자연을 동시에
                    즐길 수 있는 코스를 추천드려요."
                  </p>
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
                생성한 페르소나는 언제든지 수정하거나 삭제할 수 있으며, 여러
                개의 페르소나를 만들어 상황에 맞게 활용할 수 있습니다.
              </p>
            </div>
          </UCard>
        </article>
      </div>
    </section>
  </SubscriptionGuard>
</template>
