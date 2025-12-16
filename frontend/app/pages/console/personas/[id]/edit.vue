<script lang="ts" setup>
import type { FormSubmitEvent } from '#ui/types';
import {
  createPersonaSchema,
  type CreatePersonaSchema,
  genderOptions,
  occupationOptions,
  blogStyleOptions,
  blogToneOptions,
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
  age: 30,
  isMarried: false,
  hasChildren: false,
  occupation: '',
  blogStyle: blogStyleOptions[0]!,
  blogTone: blogToneOptions[0]!,
  additionalInfo: '',
});

// 데이터 로드 시 폼 초기화
watch(
  persona,
  (newPersona) => {
    if (newPersona) {
      state.gender = newPersona.gender || genderOptions[0]!;
      state.age = newPersona.age || 30;
      state.isMarried = newPersona.isMarried || false;
      state.hasChildren = newPersona.hasChildren || false;
      state.occupation = newPersona.occupation || '';
      state.blogStyle = newPersona.blogStyle || blogStyleOptions[0]!;
      state.blogTone = newPersona.blogTone || blogToneOptions[0]!;
      state.additionalInfo = newPersona.additionalInfo || '';
    }
  },
  { immediate: true },
);

const onSubmit = async (event: FormSubmitEvent<CreatePersonaSchema>) => {
  startTransition(async () => {
    try {
      await useApi(`/personas/${personaId.value}`, {
        method: 'PATCH',
        body: event.data,
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
                <USelect
                  v-model="state.occupation"
                  :items="occupationOptions"
                  placeholder="직업을 선택해주세요"
                  variant="soft"
                  class="w-full"
                  size="xl"
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
                    {{ persona.occupation }} ({{ persona.age }}세/{{
                      persona.gender
                    }})
                  </span>
                </div>

                <div
                  class="flex items-center justify-between p-3 rounded-xl bg-neutral-100 dark:bg-neutral-800"
                >
                  <span class="text-sm text-neutral-600 dark:text-neutral-400">
                    블로그 스타일
                  </span>
                  <span
                    class="text-sm font-semibold text-neutral-900 dark:text-white"
                  >
                    {{ persona.blogStyle }} / {{ persona.blogTone }}
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
