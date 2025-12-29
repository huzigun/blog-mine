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

const route = useRoute();
const [isPending, startTransition] = useTransition();
const toast = useToast();

// 페르소나 ID
const personaId = computed(() => route.params.id as string);

// 기존 페르소나 정보 조회
const { data: persona, status: fetchStatus } = await useApiFetch<Persona>(
  `/personas/${personaId.value}`,
  {
    method: 'GET',
    lazy: true,
  },
);

// 폼 상태 (기존 데이터로 초기화)
const state = reactive<CreatePersonaSchema>({
  gender: genderOptions[0]!,
  blogTopic: '',
  characteristics: '',
});

// 직접 입력 모드 관리
const isCustomBlogTopic = ref(false);
const customBlogTopic = ref('');

// 데이터 로드 시 폼 초기화
watch(
  persona,
  (newPersona) => {
    if (newPersona) {
      state.gender = newPersona.gender || genderOptions[0]!;
      state.characteristics = newPersona.characteristics || '';

      // blogTopic이 옵션에 있는지 확인
      const blogTopic = newPersona.blogTopic || '';
      if (blogTopic && !blogTopicOptions.includes(blogTopic)) {
        // 옵션에 없는 값이면 직접 입력 모드
        isCustomBlogTopic.value = true;
        customBlogTopic.value = blogTopic;
        state.blogTopic = '직접 입력';
      } else {
        state.blogTopic = blogTopic;
      }
    }
  },
  { immediate: true },
);

// 블로그 주제 선택 변경 감지
watch(
  () => state.blogTopic,
  (newValue) => {
    if (newValue === '직접 입력') {
      isCustomBlogTopic.value = true;
    } else {
      isCustomBlogTopic.value = false;
      customBlogTopic.value = '';
    }
  },
);

const onSubmit = async (event: FormSubmitEvent<CreatePersonaSchema>) => {
  startTransition(async () => {
    try {
      // 직접 입력인 경우 customBlogTopic 값 사용
      const submitData = {
        ...event.data,
        blogTopic: isCustomBlogTopic.value
          ? customBlogTopic.value
          : event.data.blogTopic,
      };

      await useApi(`/personas/${personaId.value}`, {
        method: 'PATCH',
        body: submitData,
      });

      toast.add({
        title: '페르소나 수정 완료',
        description: '페르소나가 성공적으로 수정되었습니다.',
        color: 'success',
      });

      // 페르소나 목록 페이지로 이동
      return navigateTo('/console/personas/manage');
    } catch (err: any) {
      const message = err.response?._data?.message || err.message;
      toast.add({
        title: '페르소나 수정 실패',
        description: message || '페르소나 수정 중 오류가 발생했습니다.',
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
        title="페르소나 수정"
        description="페르소나 정보를 수정합니다."
        returnPath="/console/personas/manage"
      />

      <!-- 로딩 상태 -->
      <div v-if="fetchStatus === 'pending'" class="flex justify-center py-12">
        <UIcon
          name="i-heroicons-arrow-path"
          class="w-8 h-8 text-primary-600 animate-spin"
        />
      </div>

      <div v-else class="grid grid-cols-2 gap-x-5">
        <article>
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
                <USelect
                  v-model="state.blogTopic"
                  :items="blogTopicOptions"
                  placeholder="블로그 주제를 선택해주세요"
                  variant="soft"
                  class="w-full"
                  size="xl"
                />
              </UFormField>

              <!-- 직접 입력 필드 -->
              <UFormField
                v-if="isCustomBlogTopic"
                label="블로그 주제 직접 입력"
                name="customBlogTopic"
                required
              >
                <UInput
                  v-model="customBlogTopic"
                  placeholder="운영중인 블로그 주제를 직접 입력해주세요"
                  size="xl"
                  class="w-full"
                  variant="soft"
                />
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
              </UFormField>
            </div>

            <div class="flex gap-3">
              <UButton
                type="button"
                size="xl"
                color="neutral"
                variant="outline"
                block
                to="/console/personas/manage"
              >
                취소
              </UButton>
              <UButton
                type="submit"
                size="xl"
                block
                color="primary"
                :loading="isPending"
                class="bg-linear-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 font-bold"
              >
                페르소나 수정하기
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
                    name="i-heroicons-pencil-square"
                    class="w-7 h-7 text-white"
                  />
                </div>
                <div class="flex-1 pt-1">
                  <h3
                    class="text-xl font-bold text-neutral-900 dark:text-white mb-2"
                  >
                    페르소나 수정
                  </h3>
                  <p
                    class="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed"
                  >
                    페르소나의 정보를 수정하여 원하는 스타일의 블로그 원고를
                    작성할 수 있습니다.
                  </p>
                </div>
              </div>
            </div>
          </UCard>

          <!-- Current Persona Info Card -->
          <UCard v-if="persona" variant="soft">
            <div class="space-y-4">
              <div class="flex items-center gap-2">
                <div class="w-1 h-5 bg-primary-600 rounded-full" />
                <h4 class="font-bold text-neutral-900 dark:text-white">
                  현재 페르소나 정보
                </h4>
              </div>

              <div class="space-y-3">
                <div
                  class="flex items-center justify-between p-3 rounded-xl bg-neutral-100 dark:bg-neutral-800"
                >
                  <span class="text-sm text-neutral-600 dark:text-neutral-400">
                    ID
                  </span>
                  <span
                    class="text-sm font-semibold text-neutral-900 dark:text-white"
                  >
                    #{{ persona.id }}
                  </span>
                </div>

                <div
                  class="flex items-center justify-between p-3 rounded-xl bg-neutral-100 dark:bg-neutral-800"
                >
                  <span class="text-sm text-neutral-600 dark:text-neutral-400">
                    기본 정보
                  </span>
                  <span
                    class="text-sm font-semibold text-neutral-900 dark:text-white"
                  >
                    {{ persona.gender }} / {{ persona.blogTopic }}
                  </span>
                </div>

                <div
                  class="flex items-center justify-between p-3 rounded-xl bg-neutral-100 dark:bg-neutral-800"
                >
                  <span class="text-sm text-neutral-600 dark:text-neutral-400">
                    생성일
                  </span>
                  <span
                    class="text-sm font-semibold text-neutral-900 dark:text-white"
                  >
                    {{
                      new Date(persona.createdAt).toLocaleDateString('ko-KR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })
                    }}
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
                페르소나를 수정하면 이후 생성되는 원고에만 적용됩니다. 이미
                생성된 원고는 영향을 받지 않습니다.
              </p>
            </div>
          </UCard>
        </article>
      </div>
    </section>
  </SubscriptionGuard>
</template>
