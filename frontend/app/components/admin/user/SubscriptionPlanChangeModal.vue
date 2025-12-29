<script setup lang="ts">
import { useAdminApi, useAdminApiFetch } from '~/composables/useAdminApi';

interface Plan {
  id: number;
  name: string;
  displayName: string;
  price: number;
  monthlyCredits: number;
  isActive: boolean;
}

interface Props {
  userId: number;
  userName: string;
  currentSubscription: {
    id: number;
    status: string;
    plan: {
      id: number;
      name: string;
      displayName: string;
      price: number;
    };
  } | null;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  close: [result: boolean];
}>();

const toast = useToast();

const form = ref({
  planId: props.currentSubscription?.plan?.id || 0,
  reason: '',
  grantCredits: false,
});

const isLoading = ref(false);

// 플랜 목록 조회
const { data: plansData } = await useAdminApiFetch<Plan[]>('/admin/plans');

const plans = computed(() => {
  return (plansData.value || [])
    .filter((p) => p.isActive)
    .map((p) => ({
      label: `${p.displayName || p.name} (${p.price.toLocaleString()}원/월, ${p.monthlyCredits} BloC)`,
      value: p.id,
      plan: p,
    }));
});

// 선택된 새 플랜
const selectedPlan = computed(() => {
  const found = plans.value.find((p) => p.value === form.value.planId);
  return found?.plan || null;
});

// 현재 플랜과 같은지 확인
const isSamePlan = computed(() => {
  return props.currentSubscription?.plan?.id === form.value.planId;
});

const handleSubmit = async () => {
  if (!form.value.planId) {
    toast.add({
      title: '입력 오류',
      description: '변경할 플랜을 선택해주세요.',
      color: 'warning',
    });
    return;
  }

  if (isSamePlan.value) {
    toast.add({
      title: '입력 오류',
      description: '현재와 같은 플랜입니다.',
      color: 'warning',
    });
    return;
  }

  if (!form.value.reason.trim()) {
    toast.add({
      title: '입력 오류',
      description: '변경 사유를 입력해주세요.',
      color: 'warning',
    });
    return;
  }

  isLoading.value = true;
  try {
    await useAdminApi(`/admin/users/${props.userId}/subscription/change-plan`, {
      method: 'POST',
      body: {
        planId: form.value.planId,
        reason: form.value.reason,
        grantCredits: form.value.grantCredits,
      },
    });

    toast.add({
      title: '변경 완료',
      description: `구독 플랜이 ${selectedPlan.value?.displayName || selectedPlan.value?.name}(으)로 변경되었습니다.`,
      color: 'success',
    });

    emit('close', true);
  } catch (error: any) {
    toast.add({
      title: '변경 실패',
      description: error.data?.message || '플랜 변경에 실패했습니다.',
      color: 'error',
    });
  } finally {
    isLoading.value = false;
  }
};

const handleCancel = () => {
  emit('close', false);
};
</script>

<template>
  <UModal :open="true" @update:open="handleCancel">
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold">구독 플랜 변경</h3>
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-heroicons-x-mark"
              @click="handleCancel"
            />
          </div>
        </template>

        <div class="space-y-4">
          <!-- 사용자 정보 -->
          <div class="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
            <p class="text-sm text-neutral-500">대상 사용자</p>
            <p class="font-medium">{{ userName }}</p>
          </div>

          <!-- 현재 구독 정보 -->
          <div v-if="currentSubscription" class="p-3 border border-neutral-200 rounded-lg">
            <p class="text-sm text-neutral-500">현재 플랜</p>
            <p class="font-medium">
              {{ currentSubscription.plan?.displayName || currentSubscription.plan?.name }}
            </p>
            <p class="text-sm text-neutral-500 mt-1">
              {{ currentSubscription.plan?.price?.toLocaleString() }}원/월
            </p>
          </div>
          <div v-else class="p-3 border border-warning-200 bg-warning-50 rounded-lg">
            <p class="text-sm text-warning-700">현재 활성 구독이 없습니다.</p>
          </div>

          <!-- 새 플랜 선택 -->
          <UFormField label="변경할 플랜" required>
            <USelect
              v-model="form.planId"
              :items="plans"
              value-key="value"
              label-key="label"
              placeholder="플랜을 선택해주세요"
            />
            <p v-if="isSamePlan && form.planId" class="text-xs text-warning-500 mt-1">
              현재와 같은 플랜입니다.
            </p>
          </UFormField>

          <!-- 크레딧 지급 옵션 -->
          <div v-if="selectedPlan && selectedPlan.monthlyCredits > 0" class="flex items-center gap-2">
            <UCheckbox v-model="form.grantCredits" />
            <label class="text-sm">
              새 플랜 크레딧 지급 ({{ selectedPlan.monthlyCredits }} BloC)
            </label>
          </div>

          <!-- 변경 사유 -->
          <UFormField label="변경 사유" required>
            <UTextarea
              v-model="form.reason"
              placeholder="플랜 변경 사유를 입력해주세요"
              :rows="3"
            />
          </UFormField>

          <!-- 변경 미리보기 -->
          <div
            v-if="selectedPlan && !isSamePlan"
            class="p-3 border border-primary-200 bg-primary-50 rounded-lg"
          >
            <p class="text-sm font-medium text-primary-700">변경 내용 미리보기</p>
            <p class="text-sm text-primary-600 mt-1">
              {{ currentSubscription?.plan?.displayName || currentSubscription?.plan?.name || '없음' }}
              →
              {{ selectedPlan.displayName || selectedPlan.name }}
            </p>
            <p class="text-xs text-primary-500 mt-1">
              {{ currentSubscription?.plan?.price?.toLocaleString() || 0 }}원/월
              →
              {{ selectedPlan.price.toLocaleString() }}원/월
            </p>
            <p v-if="form.grantCredits" class="text-xs text-success-600 mt-1">
              + {{ selectedPlan.monthlyCredits }} BloC 지급
            </p>
          </div>
        </div>

        <template #footer>
          <div class="flex justify-end gap-3">
            <UButton color="neutral" variant="outline" @click="handleCancel">
              취소
            </UButton>
            <UButton
              color="primary"
              :loading="isLoading"
              :disabled="!form.planId || isSamePlan || !form.reason.trim() || !currentSubscription"
              @click="handleSubmit"
            >
              플랜 변경
            </UButton>
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>
