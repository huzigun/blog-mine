<script setup lang="ts">
import { useAdminApi } from '~/composables/useAdminApi';

definePageMeta({
  layout: 'admin',
  middleware: ['admin'],
});

const router = useRouter();
const toast = useToast();

// 등록 폼
const form = ref({
  itemId: 0,
  name: '',
  tag: '',
  credit: 0,
  description: '',
  features: [] as string[],
  sortOrder: 0,
  isActive: true,
});

// 새 특징 입력
const newFeature = ref('');

// 특징 추가
const addFeature = () => {
  const feature = newFeature.value.trim();
  if (feature && !form.value.features.includes(feature)) {
    form.value.features.push(feature);
    newFeature.value = '';
  }
};

// 특징 삭제
const removeFeature = (index: number) => {
  form.value.features.splice(index, 1);
};

// 유효성 검사
const isValid = computed(() => {
  return (
    form.value.itemId > 0 &&
    form.value.name.trim() !== '' &&
    form.value.tag.trim() !== '' &&
    form.value.credit > 0 &&
    form.value.features.length > 0
  );
});

// 상품 등록
const isSubmitting = ref(false);
const handleSubmit = async () => {
  if (!isValid.value) {
    toast.add({
      title: '입력 오류',
      description: '필수 항목을 모두 입력해주세요.',
      color: 'error',
    });
    return;
  }

  isSubmitting.value = true;
  try {
    const result = await useAdminApi<{ id: number }>('/admin/deploy-products', {
      method: 'POST',
      body: form.value,
    });

    toast.add({
      title: '등록 완료',
      description: '새 상품이 등록되었습니다.',
      color: 'success',
    });

    router.push(`/admin/deploy-products/${result.id}`);
  } catch (error: any) {
    toast.add({
      title: '등록 실패',
      description: error.data?.message || '상품 등록에 실패했습니다.',
      color: 'error',
    });
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<template>
  <div class="space-y-6">
    <!-- 페이지 헤더 -->
    <div class="flex items-center gap-4">
      <UButton
        color="neutral"
        variant="ghost"
        icon="i-heroicons-arrow-left"
        to="/admin/deploy-products"
      />
      <div>
        <h1 class="text-2xl font-bold text-neutral-900 dark:text-white">
          상품 등록
        </h1>
        <p class="mt-1 text-sm text-neutral-500">새 배포 상품을 등록합니다.</p>
      </div>
    </div>

    <div class="max-w-3xl space-y-6">
      <!-- 기본 설정 -->
      <UCard>
        <template #header>
          <h3 class="font-semibold">기본 설정</h3>
        </template>
        <div class="space-y-4">
          <UFormField label="Item ID" required hint="외부 시스템 연동용">
            <UInput
              v-model.number="form.itemId"
              type="number"
              placeholder="Item ID"
              :min="1"
              class="w-full"
            />
          </UFormField>

          <div class="grid grid-cols-2 gap-4">
            <UFormField label="상품명" required>
              <UInput
                v-model="form.name"
                placeholder="상품명 입력"
                class="w-full"
              />
            </UFormField>

            <UFormField label="태그" required>
              <UInput
                v-model="form.tag"
                placeholder="태그 (예: 입문용 • 가벼운 체험용)"
                class="w-full"
              />
            </UFormField>
          </div>

          <UFormField label="설명">
            <UTextarea
              v-model="form.description"
              placeholder="상품 설명"
              :rows="2"
              class="w-full"
            />
          </UFormField>

          <div class="grid grid-cols-3 gap-4">
            <UFormField label="단가 (BloC)" required>
              <UInput
                v-model.number="form.credit"
                type="number"
                :min="1"
                class="w-full"
              />
            </UFormField>

            <UFormField label="정렬 순서">
              <UInput
                v-model.number="form.sortOrder"
                type="number"
                class="w-full"
              />
            </UFormField>

            <UFormField label="상태">
              <URadioGroup
                v-model="form.isActive"
                :items="[
                  { label: '활성', value: true },
                  { label: '비활성', value: false },
                ]"
                orientation="horizontal"
              />
            </UFormField>
          </div>
        </div>
      </UCard>

      <!-- 특징 목록 -->
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="font-semibold">특징 목록</h3>
            <span class="text-sm text-neutral-500">최소 1개 이상 입력</span>
          </div>
        </template>
        <div class="space-y-4">
          <!-- 특징 입력 -->
          <div class="flex gap-2">
            <UInput
              v-model="newFeature"
              placeholder="새 특징 입력 (예: 일반 계정으로 게시되는 기본 홍보형 배포)"
              class="flex-1"
              @keyup.enter="addFeature"
            />
            <UButton
              color="primary"
              variant="soft"
              icon="i-heroicons-plus"
              @click="addFeature"
            >
              추가
            </UButton>
          </div>

          <!-- 특징 목록 -->
          <div class="space-y-2">
            <div
              v-for="(feature, index) in form.features"
              :key="index"
              class="flex items-center gap-2 p-2 rounded-lg bg-neutral-50 dark:bg-neutral-800"
            >
              <UIcon
                name="i-heroicons-check-circle"
                class="w-4 h-4 text-primary-600 shrink-0"
              />
              <span class="flex-1 text-sm">{{ feature }}</span>
              <UButton
                color="error"
                variant="ghost"
                size="xs"
                icon="i-heroicons-x-mark"
                @click="removeFeature(index)"
              />
            </div>
            <p
              v-if="form.features.length === 0"
              class="text-sm text-neutral-400 text-center py-4"
            >
              특징을 추가해주세요.
            </p>
          </div>
        </div>
      </UCard>

      <!-- 등록 버튼 -->
      <div class="flex justify-end gap-3">
        <UButton
          color="neutral"
          variant="outline"
          size="lg"
          to="/admin/deploy-products"
        >
          취소
        </UButton>
        <UButton
          color="primary"
          size="lg"
          :loading="isSubmitting"
          :disabled="!isValid"
          @click="handleSubmit"
        >
          상품 등록
        </UButton>
      </div>
    </div>
  </div>
</template>
