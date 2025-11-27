<script lang="ts" setup>
import type { FormSubmitEvent } from '@nuxt/ui';
import z from 'zod';

const toast = useToast();
const [isPending, startTransition] = useTransition();

const schema = z.object({
  keyword: z.string().min(1, '키워드를 입력해주세요.'),
  myBlogUrl: z
    .string()
    .url('유효한 URL을 입력해주세요.')
    .refine((url) => {
      return url.includes('blog.naver.com');
    }, '네이버 블로그 URL만 지원합니다.'),
  bloggerName: z.string().min(1, '블로거 이름을 입력해주세요.'),
  title: z.string().min(1, '블로그 제목을 입력해주세요.'),
  isActive: z.boolean(),
});

type FormState = z.infer<typeof schema>;

const formState = reactive<FormState>({
  keyword: '',
  myBlogUrl: '',
  bloggerName: '',
  title: '',
  isActive: true,
});

const isReady = computed(() => {
  return schema.safeParse(formState).success;
});

const emit = defineEmits<{
  (e: 'close', success?: boolean): void;
}>();

const handleSubmit = (event: FormSubmitEvent<FormState>) => {
  // 폼 제출 처리 로직
  event.data;

  startTransition(
    async () =>
      useApi('/keyword-tracking', {
        method: 'POST',
        body: event.data,
      }),
    {
      onSuccess() {
        toast.add({
          title: '블로그 순위 추적이 성공적으로 등록되었습니다.',
          color: 'success',
        });
        emit('close', true);
      },

      onError(error: any) {
        const errorMessage =
          error.response?._data?.message ||
          '블로그 순위 추적 등록에 실패했습니다.';

        toast.add({
          title: errorMessage,
          color: 'error',
        });
      },
    },
  );
};

const searchBlogDetails = async () => {
  // 블로그 세부 정보 조회 로직
  if (!formState.myBlogUrl) {
    toast.add({
      title: '블로그 URL을 입력해주세요.',
      color: 'warning',
    });
    return;
  }

  startTransition(
    async () => {
      const data = await useApi<{
        bloggerName: string;
        title: string;
      }>(
        `/keyword-tracking/search/blog-details?blogUrl=${encodeURIComponent(formState.myBlogUrl)}`,
      );
      formState.bloggerName = data.bloggerName;
      formState.title = data.title;
    },
    {
      onError(error) {
        toast.add({
          title: error.message || '블로그 정보를 불러오는 데 실패했습니다.',
          color: 'error',
        });
      },
    },
  );
};
</script>

<template>
  <UModal title="블로그 순위 추적 등록" class="max-w-md">
    <template #body>
      <UForm
        @submit="handleSubmit"
        class="space-y-4"
        :schema="schema"
        :state="formState"
      >
        <UFormField label="키워드" name="keyword">
          <UInput
            v-model="formState.keyword"
            placeholder="예: 블로그 마케팅"
            required
            size="lg"
            class="w-full"
            :loading="isPending"
          />
        </UFormField>

        <UFormField label="블로그 URL" name="myBlogUrl">
          <div class="flex gap-x-1">
            <UInput
              v-model="formState.myBlogUrl"
              placeholder="https://blog.naver.com/your-blog"
              type="url"
              required
              size="lg"
              class="flex-1"
              :loading="isPending"
            />
            <UButton
              color="warning"
              @click="searchBlogDetails"
              :loading="isPending"
            >
              조회하기
            </UButton>
          </div>
        </UFormField>

        <UFormField label="활성화 상태" name="isActive">
          <USwitch
            v-model="formState.isActive"
            :label="formState.isActive ? '활성' : '비활성'"
            :loading="isPending"
          />
        </UFormField>

        <div class="" v-if="formState.bloggerName && formState.title">
          <p>
            <strong>블로거 이름:</strong>
            {{ formState.bloggerName }}
          </p>
          <p>
            <strong>블로그 제목:</strong>
            {{ formState.title }}
          </p>
        </div>

        <div class="flex justify-end gap-3 pt-4">
          <UButton
            type="button"
            color="neutral"
            variant="outline"
            @click="() => emit('close')"
            :loading="isPending"
          >
            취소
          </UButton>
          <UButton
            :disabled="!isReady"
            type="submit"
            color="primary"
            :loading="isPending"
          >
            등록하기
          </UButton>
        </div>
      </UForm>
    </template>
  </UModal>
</template>
