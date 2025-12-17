<script setup lang="ts">
import type { FormSubmitEvent } from '#ui/types';
import {
  contactSchema,
  type ContactSchema,
  contactCategoryLabels,
} from '~/schemas/contact';

definePageMeta({
  layout: 'landing',
});

const toast = useToast();
const config = useRuntimeConfig();
const isSubmitting = ref(false);

const state = reactive<ContactSchema>({
  name: '',
  email: '',
  phone: '',
  subject: '',
  message: '',
  category: 'GENERAL',
});

// 카테고리 옵션
const categoryOptions = Object.entries(contactCategoryLabels).map(
  ([value, label]) => ({
    label,
    value,
  }),
);

async function onSubmit(event: FormSubmitEvent<ContactSchema>) {
  isSubmitting.value = true;

  try {
    const response = await useApi('/contact', {
      method: 'POST',
      baseURL: config.public.apiBaseUrl,
      body: event.data,
    });

    toast.add({
      title: '문의 접수 완료',
      description:
        '문의가 성공적으로 접수되었습니다. 빠른 시일 내에 답변 드리겠습니다.',
      color: 'success',
    });

    // 폼 초기화
    Object.assign(state, {
      name: '',
      email: '',
      phone: '',
      subject: '',
      message: '',
      category: 'GENERAL',
    });
  } catch (error: any) {
    console.error('Contact submission error:', error);
    toast.add({
      title: '문의 접수 실패',
      description:
        error?.data?.message ||
        '문의 접수 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
      color: 'error',
    });
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <div class="min-h-screen bg-neutral-50 dark:bg-neutral-950 py-16">
    <div class="container mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
      <!-- Header -->
      <div class="text-center mb-12">
        <h1
          class="text-3xl sm:text-4xl font-bold text-neutral-900 dark:text-white mb-4"
        >
          문의하기
        </h1>
        <p class="text-lg text-neutral-600 dark:text-neutral-400">
          궁금하신 사항이나 도움이 필요하신가요?
          <br />
          언제든지 문의해 주시면 빠르게 답변 드리겠습니다.
        </p>
      </div>

      <!-- Contact Form Card -->
      <UCard>
        <UForm :state="state" :schema="contactSchema" @submit="onSubmit">
          <div class="space-y-6">
            <!-- Name & Email -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <UFormField label="이름" name="name" required>
                <UInput
                  v-model="state.name"
                  placeholder="홍길동"
                  icon="i-heroicons-user"
                  size="lg"
                  class="w-full"
                />
              </UFormField>

              <UFormField label="이메일" name="email" required>
                <UInput
                  v-model="state.email"
                  type="email"
                  placeholder="example@email.com"
                  icon="i-heroicons-envelope"
                  size="lg"
                  class="w-full"
                />
              </UFormField>
            </div>

            <!-- Phone & Category -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <UFormField label="연락처" name="phone">
                <UInput
                  v-model="state.phone"
                  type="tel"
                  placeholder="010-1234-5678"
                  icon="i-heroicons-phone"
                  size="lg"
                  class="w-full"
                />
              </UFormField>

              <UFormField label="문의 유형" name="category" required>
                <USelect
                  v-model="state.category"
                  :items="categoryOptions"
                  size="lg"
                  class="w-full"
                />
              </UFormField>
            </div>

            <!-- Subject -->
            <UFormField label="제목" name="subject" required>
              <UInput
                v-model="state.subject"
                placeholder="문의 제목을 입력해주세요"
                icon="i-heroicons-document-text"
                size="lg"
                class="w-full"
              />
            </UFormField>

            <!-- Message -->
            <UFormField label="문의 내용" name="message" required>
              <UTextarea
                v-model="state.message"
                placeholder="문의 내용을 상세히 입력해주세요 (최소 10자)"
                :rows="8"
                size="lg"
                class="w-full"
              />
            </UFormField>

            <!-- Info Notice -->
            <div
              class="p-4 bg-primary/5 border border-primary/20 rounded-lg text-sm"
            >
              <div class="flex items-start gap-3">
                <UIcon
                  name="i-heroicons-information-circle"
                  class="w-5 h-5 text-primary shrink-0 mt-0.5"
                />
                <div class="text-neutral-700 dark:text-neutral-300">
                  <p class="font-medium mb-1">개인정보 처리 안내</p>
                  <p class="text-xs text-neutral-600 dark:text-neutral-400">
                    입력하신 개인정보는 문의 응대 목적으로만 사용되며, 관련
                    법령에 따라 안전하게 관리됩니다.
                  </p>
                </div>
              </div>
            </div>

            <!-- Submit Button -->
            <div class="flex justify-end gap-3">
              <UButton
                type="button"
                color="neutral"
                variant="outline"
                size="lg"
                to="/"
              >
                취소
              </UButton>
              <UButton
                type="submit"
                color="primary"
                size="lg"
                :loading="isSubmitting"
                :disabled="isSubmitting"
              >
                문의 접수
              </UButton>
            </div>
          </div>
        </UForm>
      </UCard>

      <!-- Additional Info -->
      <div class="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div
          class="p-6 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-center"
        >
          <div
            class="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-4"
          >
            <UIcon name="i-heroicons-clock" class="w-6 h-6 text-blue-600" />
          </div>
          <h3 class="font-semibold text-neutral-900 dark:text-white mb-2">
            빠른 응답
          </h3>
          <p class="text-sm text-neutral-600 dark:text-neutral-400">
            평일 기준 24시간 이내
            <br />
            답변 드립니다
          </p>
        </div>

        <div
          class="p-6 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-center"
        >
          <div
            class="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4"
          >
            <UIcon name="i-heroicons-envelope" class="w-6 h-6 text-green-600" />
          </div>
          <h3 class="font-semibold text-neutral-900 dark:text-white mb-2">
            이메일 답변
          </h3>
          <p class="text-sm text-neutral-600 dark:text-neutral-400">
            입력하신 이메일로
            <br />
            상세한 답변을 보내드립니다
          </p>
        </div>

        <div
          class="p-6 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-center"
        >
          <div
            class="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center mx-auto mb-4"
          >
            <UIcon
              name="i-heroicons-shield-check"
              class="w-6 h-6 text-purple-600"
            />
          </div>
          <h3 class="font-semibold text-neutral-900 dark:text-white mb-2">
            안전한 처리
          </h3>
          <p class="text-sm text-neutral-600 dark:text-neutral-400">
            개인정보는 암호화하여
            <br />
            안전하게 보관됩니다
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
