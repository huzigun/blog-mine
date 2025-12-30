<script setup lang="ts">
import { useAdminApiFetch, useAdminApi } from '~/composables/useAdminApi';

interface DeployProduct {
  id: number;
  itemId: number;
  name: string;
  tag: string;
  credit: number;
  description: string | null;
  features: string[];
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

definePageMeta({
  layout: 'admin',
  middleware: ['admin'],
});

const route = useRoute();
const router = useRouter();
const toast = useToast();

const productId = computed(() => Number(route.params.id));

const {
  data: product,
  status,
  refresh,
} = await useAdminApiFetch<DeployProduct>(
  `/admin/deploy-products/${productId.value}`,
);

if (!product.value) {
  throw createError({
    statusCode: 404,
    statusMessage: '상품을 찾을 수 없습니다.',
  });
}

const isLoading = computed(() => status.value === 'pending');

// 수정 폼
const editForm = ref({
  itemId: product.value?.itemId ?? 0,
  name: product.value?.name || '',
  tag: product.value?.tag || '',
  credit: product.value?.credit || 0,
  description: product.value?.description || '',
  features: product.value?.features || [],
  sortOrder: product.value?.sortOrder || 0,
  isActive: product.value?.isActive ?? true,
});

// 새 특징 입력
const newFeature = ref('');

// 특징 추가
const addFeature = () => {
  const feature = newFeature.value.trim();
  if (feature && !editForm.value.features.includes(feature)) {
    editForm.value.features.push(feature);
    newFeature.value = '';
  }
};

// 특징 삭제
const removeFeature = (index: number) => {
  editForm.value.features.splice(index, 1);
};

// 날짜 포맷
const formatDate = (dateString: string | null) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// 정보 수정
const isUpdating = ref(false);
const handleUpdate = async () => {
  isUpdating.value = true;
  try {
    await useAdminApi(`/admin/deploy-products/${productId.value}`, {
      method: 'PATCH',
      body: editForm.value,
    });

    toast.add({
      title: '수정 완료',
      description: '상품 정보가 수정되었습니다.',
      color: 'success',
    });

    await refresh();
  } catch (error: any) {
    toast.add({
      title: '수정 실패',
      description: error.data?.message || '수정에 실패했습니다.',
      color: 'error',
    });
  } finally {
    isUpdating.value = false;
  }
};

// 데이터 업데이트 시 폼 동기화
watch(
  () => product.value,
  (newProduct) => {
    if (newProduct) {
      editForm.value = {
        itemId: newProduct.itemId,
        name: newProduct.name,
        tag: newProduct.tag,
        credit: newProduct.credit,
        description: newProduct.description || '',
        features: [...newProduct.features],
        sortOrder: newProduct.sortOrder,
        isActive: newProduct.isActive,
      };
    }
  },
);
</script>

<template>
  <div class="space-y-6">
    <!-- 페이지 헤더 -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-4">
        <UButton
          color="neutral"
          variant="ghost"
          icon="i-heroicons-arrow-left"
          to="/admin/deploy-products"
        />
        <div>
          <h1 class="text-2xl font-bold text-neutral-900 dark:text-white">
            상품 상세
          </h1>
          <p class="mt-1 text-sm text-neutral-500">
            {{ product?.name }}
          </p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <UBadge
          v-if="product"
          :color="product.isActive ? 'success' : 'neutral'"
          size="lg"
        >
          {{ product.isActive ? '활성' : '비활성' }}
        </UBadge>
      </div>
    </div>

    <div v-if="product" class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- 좌측: 상품 정보 -->
      <div class="lg:col-span-1 space-y-6">
        <!-- 기본 정보 -->
        <UCard>
          <template #header>
            <h3 class="font-semibold">기본 정보</h3>
          </template>
          <dl class="space-y-4">
            <div>
              <dt class="text-sm text-neutral-500">ID</dt>
              <dd class="font-mono">#{{ product.id }}</dd>
            </div>
            <div>
              <dt class="text-sm text-neutral-500">Item ID</dt>
              <dd class="font-mono">
                {{ product.itemId }}
              </dd>
            </div>
            <div>
              <dt class="text-sm text-neutral-500">상품명</dt>
              <dd class="font-medium">{{ product.name }}</dd>
            </div>
            <div>
              <dt class="text-sm text-neutral-500">태그</dt>
              <dd>
                <UBadge color="neutral" variant="subtle">
                  {{ product.tag }}
                </UBadge>
              </dd>
            </div>
            <div>
              <dt class="text-sm text-neutral-500">단가</dt>
              <dd class="font-medium text-primary-600">
                {{ product.credit.toLocaleString() }} BloC
              </dd>
            </div>
          </dl>
        </UCard>

        <!-- 날짜 정보 -->
        <UCard>
          <template #header>
            <h3 class="font-semibold">날짜 정보</h3>
          </template>
          <dl class="space-y-2 text-sm">
            <div class="flex justify-between">
              <dt class="text-neutral-500">생성일</dt>
              <dd>{{ formatDate(product.createdAt) }}</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-neutral-500">수정일</dt>
              <dd>{{ formatDate(product.updatedAt) }}</dd>
            </div>
          </dl>
        </UCard>
      </div>

      <!-- 우측: 상품 수정 -->
      <div class="lg:col-span-2 space-y-6">
        <!-- 기본 설정 -->
        <UCard>
          <template #header>
            <h3 class="font-semibold">기본 설정</h3>
          </template>
          <div class="space-y-4">
            <UFormField label="Item ID" hint="외부 시스템 연동용">
              <UInput
                v-model.number="editForm.itemId"
                type="number"
                placeholder="Item ID (선택)"
              />
            </UFormField>

            <div class="grid grid-cols-2 gap-4">
              <UFormField label="상품명">
                <UInput v-model="editForm.name" placeholder="상품명" />
              </UFormField>

              <UFormField label="태그">
                <UInput
                  v-model="editForm.tag"
                  placeholder="태그 (예: 입문용 • 가벼운 체험용)"
                />
              </UFormField>
            </div>

            <UFormField label="설명">
              <UTextarea
                v-model="editForm.description"
                placeholder="상품 설명"
                :rows="2"
              />
            </UFormField>

            <div class="grid grid-cols-3 gap-4">
              <UFormField label="단가 (BloC)">
                <UInput v-model.number="editForm.credit" type="number" />
              </UFormField>

              <UFormField label="정렬 순서">
                <UInput v-model.number="editForm.sortOrder" type="number" />
              </UFormField>

              <UFormField label="상태">
                <URadioGroup
                  v-model="editForm.isActive"
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
            <h3 class="font-semibold">특징 목록</h3>
          </template>
          <div class="space-y-4">
            <!-- 특징 입력 -->
            <div class="flex gap-2">
              <UInput
                v-model="newFeature"
                placeholder="새 특징 입력"
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
                v-for="(feature, index) in editForm.features"
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
                v-if="editForm.features.length === 0"
                class="text-sm text-neutral-400 text-center py-4"
              >
                등록된 특징이 없습니다.
              </p>
            </div>
          </div>
        </UCard>

        <!-- 저장 버튼 -->
        <div class="flex justify-end">
          <UButton
            color="primary"
            size="lg"
            :loading="isUpdating"
            @click="handleUpdate"
          >
            변경사항 저장
          </UButton>
        </div>
      </div>
    </div>
  </div>
</template>
