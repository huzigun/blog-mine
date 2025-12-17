<script setup lang="ts">
import type { FormSubmitEvent } from '#ui/types';
import { z } from 'zod';

definePageMeta({
  layout: 'auth',
  middleware: ['guest'],
});

const toast = useToast();

// Form schema
const findEmailSchema = z.object({
  name: z.string().min(2, '이름은 2자 이상이어야 합니다.'),
});

type FindEmailSchema = z.infer<typeof findEmailSchema>;

const state = reactive<FindEmailSchema>({
  name: '',
});

const [isPending, startTransition] = useTransition();

interface FoundEmail {
  maskedEmail: string;
  createdAt: string;
  hasKakao: boolean;
}

const foundEmails = ref<FoundEmail[]>([]);
const showResult = ref(false);

async function onSubmit(event: FormSubmitEvent<FindEmailSchema>) {
  await startTransition(
    async () => {
      const { name } = event.data;
      const data = await useApi<FoundEmail[]>('/auth/find-email', {
        method: 'POST',
        body: { name },
      });
      foundEmails.value = data;
      showResult.value = true;
    },
    {
      onSuccess: () => {
        toast.add({
          title: '아이디 찾기 완료',
          description: '일치하는 계정을 찾았습니다.',
          color: 'success',
        });
      },
      onError: (err) => {
        const errorMessage =
          (err as any)?.response?._data.message ||
          '아이디 찾기에 실패했습니다.';
        toast.add({
          title: '아이디 찾기 실패',
          description: errorMessage,
          color: 'error',
        });
      },
      minDuration: 300,
    },
  );
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function reset() {
  state.name = '';
  foundEmails.value = [];
  showResult.value = false;
}
</script>

<template>
  <!-- Logo -->
  <AuthLogo class="mb-8" />

  <!-- Find Email Card -->
  <div
    class="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm"
  >
    <h1
      class="text-2xl font-bold text-gray-900 dark:text-white mb-2 text-center"
    >
      아이디 찾기
    </h1>
    <p class="text-sm text-gray-600 dark:text-gray-400 mb-6 text-center">
      가입 시 등록한 이름으로 아이디를 찾을 수 있습니다.
    </p>

    <!-- Form -->
    <template v-if="!showResult">
      <UForm
        :state="state"
        :schema="findEmailSchema"
        @submit="onSubmit"
        class="flex flex-col gap-4"
      >
        <UFormField label="이름" name="name" required>
          <UInput
            v-model.trim="state.name"
            type="text"
            placeholder="가입 시 등록한 이름을 입력해주세요"
            size="xl"
            :disabled="isPending"
            class="w-full"
            variant="soft"
          />
        </UFormField>

        <div class="mt-4">
          <UButton
            type="submit"
            size="xl"
            block
            :loading="isPending"
            :disabled="isPending"
            class="bg-linear-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 font-bold"
          >
            아이디 찾기
          </UButton>
        </div>
      </UForm>
    </template>

    <!-- Result -->
    <template v-else>
      <div class="space-y-4">
        <div
          v-for="(email, index) in foundEmails"
          :key="index"
          class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4"
        >
          <div class="flex items-center justify-between mb-2">
            <span class="text-lg font-semibold text-gray-900 dark:text-white">
              {{ email.maskedEmail }}
            </span>
            <UBadge
              v-if="email.hasKakao"
              color="warning"
              variant="soft"
              size="sm"
            >
              카카오 연동
            </UBadge>
          </div>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            가입일: {{ formatDate(email.createdAt) }}
          </p>
        </div>

        <div class="flex flex-col gap-2 mt-6">
          <UButton type="button" size="xl" block variant="soft" @click="reset">
            다시 찾기
          </UButton>
          <NuxtLink to="/auth/login" class="w-full">
            <UButton
              type="button"
              size="xl"
              block
              class="bg-linear-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 font-bold"
            >
              로그인하러 가기
            </UButton>
          </NuxtLink>
        </div>
      </div>
    </template>
  </div>

  <!-- Footer Links -->
  <div
    class="mt-6 flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400"
  >
    <NuxtLink
      to="/auth/login"
      class="hover:text-gray-900 dark:hover:text-white transition-colors"
    >
      로그인
    </NuxtLink>
    <span class="text-gray-300 dark:text-gray-700">|</span>
    <NuxtLink
      to="/auth/reset-password"
      class="hover:text-gray-900 dark:hover:text-white transition-colors"
    >
      비밀번호 재설정
    </NuxtLink>
  </div>
</template>
