<script setup lang="ts">
import { useAdminApiFetch, useAdminApi } from '~/composables/useAdminApi';

interface PlanDetail {
  id: number;
  name: string;
  displayName: string;
  description: string | null;
  price: number;
  yearlyPrice: number | null;
  monthlyCredits: number;
  maxKeywordTrackings: number | null;
  isActive: boolean;
  sortOrder: number;
  subscribersCount: number;
  activeSubscribersCount: number;
  createdAt: string;
  updatedAt: string;
}

definePageMeta({
  layout: 'admin',
  middleware: ['admin'],
});

const { hasMinRole } = useAdminAuth();
const route = useRoute();
const toast = useToast();

// SUPER_ADMIN 권한 체크
if (!hasMinRole('SUPER_ADMIN')) {
  throw createError({
    statusCode: 403,
    statusMessage: '최고 관리자만 접근할 수 있습니다.',
  });
}

const planId = computed(() => Number(route.params.id));

const {
  data: plan,
  status,
  refresh,
} = await useAdminApiFetch<PlanDetail>(`/admin/plans/${planId.value}`);

if (!plan.value) {
  throw createError({
    statusCode: 404,
    statusMessage: '플랜을 찾을 수 없습니다.',
  });
}

const isLoading = computed(() => status.value === 'pending');

// 수정 폼
const editForm = ref({
  displayName: plan.value?.displayName || '',
  description: plan.value?.description || '',
  price: plan.value?.price || 0,
  yearlyPrice: plan.value?.yearlyPrice || null,
  monthlyCredits: plan.value?.monthlyCredits || 0,
  maxKeywordTrackings: plan.value?.maxKeywordTrackings || null,
  isActive: plan.value?.isActive ?? true,
  sortOrder: plan.value?.sortOrder || 0,
});

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

// 금액 포맷
const formatPrice = (price: number | null) => {
  if (price === null || price === 0) return '-';
  return new Intl.NumberFormat('ko-KR').format(price) + '원';
};

// 정보 수정
const isUpdating = ref(false);
const handleUpdate = async () => {
  isUpdating.value = true;
  try {
    await useAdminApi(`/admin/plans/${planId.value}`, {
      method: 'PATCH',
      body: editForm.value,
    });

    toast.add({
      title: '수정 완료',
      description: '플랜 정보가 수정되었습니다.',
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
  () => plan.value,
  (newPlan) => {
    if (newPlan) {
      editForm.value = {
        displayName: newPlan.displayName,
        description: newPlan.description || '',
        price: newPlan.price,
        yearlyPrice: newPlan.yearlyPrice,
        monthlyCredits: newPlan.monthlyCredits,
        maxKeywordTrackings: newPlan.maxKeywordTrackings,
        isActive: newPlan.isActive,
        sortOrder: newPlan.sortOrder,
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
          to="/admin/plans"
        />
        <div>
          <h1 class="text-2xl font-bold text-neutral-900 dark:text-white">
            플랜 상세
          </h1>
          <p class="mt-1 text-sm text-neutral-500">
            {{ plan?.name }}
          </p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <UBadge v-if="plan" :color="plan.isActive ? 'success' : 'neutral'" size="lg">
          {{ plan.isActive ? '활성' : '비활성' }}
        </UBadge>
      </div>
    </div>

    <div v-if="plan" class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- 좌측: 플랜 정보 -->
      <div class="lg:col-span-1 space-y-6">
        <!-- 기본 정보 -->
        <UCard>
          <template #header>
            <h3 class="font-semibold">기본 정보</h3>
          </template>
          <dl class="space-y-4">
            <div>
              <dt class="text-sm text-neutral-500">ID</dt>
              <dd class="font-mono">#{{ plan.id }}</dd>
            </div>
            <div>
              <dt class="text-sm text-neutral-500">시스템 이름</dt>
              <dd class="font-medium">{{ plan.name }}</dd>
            </div>
            <div>
              <dt class="text-sm text-neutral-500">표시 이름</dt>
              <dd class="font-medium">{{ plan.displayName }}</dd>
            </div>
            <div>
              <dt class="text-sm text-neutral-500">설명</dt>
              <dd class="text-sm">{{ plan.description || '-' }}</dd>
            </div>
          </dl>
        </UCard>

        <!-- 구독자 정보 -->
        <UCard>
          <template #header>
            <h3 class="font-semibold">구독자 현황</h3>
          </template>
          <dl class="space-y-2 text-sm">
            <div class="flex justify-between">
              <dt class="text-neutral-500">전체 구독자</dt>
              <dd class="font-medium">{{ plan.subscribersCount.toLocaleString() }}명</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-neutral-500">활성 구독자</dt>
              <dd class="font-medium text-success-600">
                {{ plan.activeSubscribersCount.toLocaleString() }}명
              </dd>
            </div>
          </dl>
        </UCard>

        <!-- 가격 정보 -->
        <UCard>
          <template #header>
            <h3 class="font-semibold">가격 정보</h3>
          </template>
          <dl class="space-y-2 text-sm">
            <div class="flex justify-between">
              <dt class="text-neutral-500">월 가격</dt>
              <dd class="font-medium">{{ formatPrice(plan.price) }}</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-neutral-500">연 가격</dt>
              <dd class="font-medium">{{ formatPrice(plan.yearlyPrice) }}</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-neutral-500">월 크레딧</dt>
              <dd class="font-medium">{{ plan.monthlyCredits.toLocaleString() }}</dd>
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
              <dd>{{ formatDate(plan.createdAt) }}</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-neutral-500">수정일</dt>
              <dd>{{ formatDate(plan.updatedAt) }}</dd>
            </div>
          </dl>
        </UCard>
      </div>

      <!-- 우측: 플랜 수정 -->
      <div class="lg:col-span-2 space-y-6">
        <!-- 기본 설정 -->
        <UCard>
          <template #header>
            <h3 class="font-semibold">기본 설정</h3>
          </template>
          <div class="space-y-4">
            <UFormField label="표시 이름">
              <UInput v-model="editForm.displayName" placeholder="플랜 표시 이름" />
            </UFormField>

            <UFormField label="설명">
              <UTextarea
                v-model="editForm.description"
                placeholder="플랜 설명"
                :rows="3"
              />
            </UFormField>

            <div class="grid grid-cols-2 gap-4">
              <UFormField label="정렬 순서">
                <UInput v-model.number="editForm.sortOrder" type="number" />
              </UFormField>

              <UFormField label="상태">
                <div class="flex items-center gap-4 pt-2">
                  <URadio
                    v-model="editForm.isActive"
                    :value="true"
                    label="활성"
                  />
                  <URadio
                    v-model="editForm.isActive"
                    :value="false"
                    label="비활성"
                  />
                </div>
              </UFormField>
            </div>
          </div>
        </UCard>

        <!-- 가격 및 크레딧 -->
        <UCard>
          <template #header>
            <h3 class="font-semibold">가격 및 크레딧</h3>
          </template>
          <div class="grid grid-cols-3 gap-4">
            <UFormField label="월 가격 (원)">
              <UInput v-model.number="editForm.price" type="number" />
            </UFormField>

            <UFormField label="연 가격 (원)">
              <UInput v-model.number="editForm.yearlyPrice" type="number" />
            </UFormField>

            <UFormField label="월 크레딧">
              <UInput v-model.number="editForm.monthlyCredits" type="number" />
            </UFormField>
          </div>
        </UCard>

        <!-- 제한 설정 -->
        <UCard>
          <template #header>
            <h3 class="font-semibold">제한 설정</h3>
          </template>
          <div class="grid grid-cols-2 gap-4">
            <UFormField label="최대 순위 추적 블로그 수">
              <UInput
                v-model.number="editForm.maxKeywordTrackings"
                type="number"
                placeholder="무제한"
              />
            </UFormField>
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
