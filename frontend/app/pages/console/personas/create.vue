<script lang="ts" setup>
import type { FormSubmitEvent } from '#ui/types';
import {
  createPersonaSchema,
  type CreatePersonaSchema,
  genderOptions,
  blogStyleOptions,
  blogToneOptions,
} from '~/schemas/persona';

definePageMeta({
  middleware: 'auth',
});

const [isPending, startTransition] = useTransition();
const toast = useToast();

const state = reactive<CreatePersonaSchema>({
  gender: genderOptions[0]!,
  age: 30,
  isMarried: false,
  hasChildren: false,
  occupation: '',
  blogStyle: blogStyleOptions[0]!,
  blogTone: blogToneOptions[0]!,
  additionalInfo: '',
});

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
  <section class="container mx-auto max-w-5xl">
    <ConsoleTitle
      title="페르소나 생성"
      description="블로그 원고 작성에 사용할 페르소나를 만들어보세요."
      returnPath="/console/personas/manage"
    />

    <div class="grid grid-cols-2 gap-x-5">
      <article>
        <UForm :state="state" :schema="createPersonaSchema" @submit="onSubmit">
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

            <UFormField label="나이" name="age" required>
              <UInput
                v-model.number="state.age"
                type="number"
                min="1"
                max="120"
                placeholder="나이를 입력해주세요"
                size="xl"
                class="w-full"
                variant="soft"
              />
            </UFormField>

            <div class="grid grid-cols-2 gap-x-4">
              <UFormField label="결혼 유무" name="isMarried">
                <URadioGroup
                  v-model="state.isMarried"
                  :items="[
                    { label: '기혼', value: true },
                    { label: '미혼', value: false },
                  ]"
                  orientation="horizontal"
                  variant="card"
                  color="primary"
                  size="sm"
                />
              </UFormField>

              <UFormField label="자녀 유무" name="hasChildren">
                <URadioGroup
                  v-model="state.hasChildren"
                  :items="[
                    { label: '있음', value: true },
                    { label: '없음', value: false },
                  ]"
                  orientation="horizontal"
                  variant="card"
                  color="primary"
                  size="sm"
                />
              </UFormField>
            </div>

            <UFormField label="직업" name="occupation" required>
              <UInput
                v-model="state.occupation"
                type="text"
                placeholder="예: 소프트웨어 엔지니어, 프리랜서 작가 등"
                size="xl"
                class="w-full"
                variant="soft"
              />
            </UFormField>
          </div>

          <div class="flex flex-col gap-y-4 mb-8">
            <h4 class="font-bold">블로그 스타일</h4>

            <UFormField label="블로그 문체" name="blogStyle" required>
              <USelect
                v-model="state.blogStyle"
                :items="blogStyleOptions"
                variant="soft"
                class="w-full"
                size="xl"
              />
              <template #hint>
                <p class="text-xs text-neutral-600">
                  원고 작성 시 사용할 문체를 선택해주세요
                </p>
              </template>
            </UFormField>

            <UFormField label="블로그 분위기" name="blogTone" required>
              <USelect
                v-model="state.blogTone"
                :items="blogToneOptions"
                variant="soft"
                class="w-full"
                size="xl"
              />
              <template #hint>
                <p class="text-xs text-neutral-600">
                  원고의 전체적인 분위기를 선택해주세요
                </p>
              </template>
            </UFormField>

            <UFormField label="추가 정보" name="additionalInfo">
              <UTextarea
                v-model="state.additionalInfo"
                :rows="6"
                placeholder="페르소나에 대한 추가 정보를 입력해주세요. 예: 특별한 관심사, 글쓰기 스타일, 선호하는 주제 등"
                size="xl"
                class="w-full"
                variant="soft"
              />
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
                  나이, 직업, 문체 등을 설정하여 다양한 스타일의 글을 작성할 수
                  있습니다.
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
                  <UIcon name="i-heroicons-users" class="w-5 h-5 text-white" />
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
                    30대 직장인 (친근한 + 편안한)
                  </span>
                </div>
                <p
                  class="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed"
                >
                  "오늘 점심에 새로 생긴 맛집에 다녀왔어요! 정말 기대
                  이상이었답니다 😊"
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
                    40대 전문가 (전문적인 + 신뢰감 있는)
                  </span>
                </div>
                <p
                  class="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed"
                >
                  "최근 개점한 레스토랑의 서비스 품질과 메뉴 구성을 분석한 결과,
                  업계 평균을 상회하는 수준입니다."
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
              생성한 페르소나는 언제든지 수정하거나 삭제할 수 있으며, 여러 개의
              페르소나를 만들어 상황에 맞게 활용할 수 있습니다.
            </p>
          </div>
        </UCard>
      </article>
    </div>
  </section>
</template>
