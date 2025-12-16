<script lang="ts" setup>
import { CardForm } from '#components';

const toast = useToast();
const overlay = useOverlay();
const cardFormModal = overlay.create(CardForm);

// 등록된 카드 목록 조회
const {
  data: cards,
  refresh: refreshCards,
  pending: cardsLoading,
} = await useApiFetch<Card[]>('/cards', {
  // @ts-ignore
  default: () => [] as Card[],
  lazy: true,
});

// 카드 등록 모달 열기
const openCardRegistration = async () => {
  const instance = cardFormModal.open({
    existingCardsCount: cards.value?.length || 0,
  });

  const result = (await instance.result) as boolean;

  if (result) {
    // 카드 등록 성공 시 카드 목록 새로고침
    await refreshCards();

    // toast.add({
    //   title: '카드 등록 완료',
    //   description: '결제 카드가 성공적으로 등록되었습니다.',
    //   color: 'success',
    // });
  }
};

// 기본 카드 설정
const setDefaultCard = async (cardId: number) => {
  try {
    await useApi(`/cards/${cardId}/default`, {
      method: 'PATCH',
    });

    toast.add({
      title: '기본 카드 변경',
      description: '기본 결제 카드가 변경되었습니다.',
      color: 'success',
    });

    await refreshCards();
  } catch (error: any) {
    const errorMessage = useApiError(error, '기본 카드 설정에 실패했습니다.');
    toast.add({
      title: '오류',
      description: errorMessage,
      color: 'error',
    });
  }
};

// 카드 삭제
const deleteCard = async (cardId: number) => {
  const confirmed = confirm('이 카드를 삭제하시겠습니까?');
  if (!confirmed) return;

  try {
    await useApi(`/cards/${cardId}`, {
      method: 'DELETE',
    });

    toast.add({
      title: '카드 삭제 완료',
      description: '카드가 성공적으로 삭제되었습니다.',
      color: 'success',
    });

    await refreshCards();
  } catch (error: any) {
    const errorMessage = useApiError(error, '카드 삭제에 실패했습니다.');
    toast.add({
      title: '오류',
      description: errorMessage,
      color: 'error',
    });
  }
};

// 카드 번호 마스킹 (예: **** **** **** 1234)
const maskCardNumber = (number: string | null) => {
  if (!number) return '****';
  return number;
};

// 카드사 로고 아이콘 (간단한 구현)
const getCardIcon = (company: string | null) => {
  // 실제로는 카드사별 아이콘을 반환
  return 'i-heroicons-credit-card';
};

// 날짜 포맷팅
const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};
</script>

<template>
  <div class="space-y-6">
    <!-- 카드 등록 안내 -->
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <UIcon
              name="i-heroicons-credit-card"
              class="text-primary"
              :size="20"
            />
            <h3 class="text-lg font-semibold">등록된 카드</h3>
          </div>
          <UButton
            color="primary"
            size="sm"
            icon="i-heroicons-plus"
            @click="openCardRegistration"
          >
            카드 등록
          </UButton>
        </div>
      </template>

      <!-- 로딩 상태 -->
      <div v-if="cardsLoading" class="flex justify-center py-12">
        <UIcon
          name="i-heroicons-arrow-path"
          class="animate-spin text-primary"
          :size="32"
        />
      </div>

      <!-- 빈 상태 -->
      <div v-else-if="!cards || cards.length === 0" class="text-center py-12">
        <UIcon
          name="i-heroicons-credit-card"
          class="mx-auto mb-4 text-neutral-400"
          :size="48"
        />
        <p class="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
          등록된 카드가 없습니다
        </p>
        <p class="text-sm text-neutral-600 dark:text-neutral-400 mb-6">
          크레딧 충전을 위해 결제 카드를 등록해주세요
        </p>
        <UButton
          color="primary"
          size="lg"
          icon="i-heroicons-plus"
          @click="openCardRegistration"
        >
          카드 등록하기
        </UButton>
      </div>

      <!-- 카드 목록 -->
      <div v-else class="space-y-4">
        <div
          v-for="card in cards"
          :key="card.id"
          class="p-4 border border-neutral-200 dark:border-neutral-800 rounded-lg hover:border-primary/50 transition-colors"
        >
          <div class="flex items-center justify-between">
            <!-- 카드 정보 -->
            <div class="flex items-center gap-4">
              <div
                class="w-12 h-12 flex items-center justify-center rounded-lg bg-primary/10"
              >
                <UIcon
                  :name="getCardIcon(card.cardCompany)"
                  class="text-primary"
                  :size="24"
                />
              </div>
              <div>
                <div class="flex items-center gap-2 mb-1">
                  <span class="font-semibold text-neutral-900 dark:text-white">
                    {{ card.cardCompany || '카드' }}
                  </span>
                  <UBadge v-if="card.isDefault" color="primary" size="xs">
                    기본
                  </UBadge>
                  <UBadge
                    v-if="!card.isAuthenticated"
                    color="warning"
                    size="xs"
                  >
                    미인증
                  </UBadge>
                </div>
                <div class="text-sm text-neutral-600 dark:text-neutral-400">
                  {{ maskCardNumber(card.number) }}
                </div>
                <div class="text-xs text-neutral-500 mt-1">
                  등록일: {{ formatDate(card.createdAt) }}
                </div>
              </div>
            </div>

            <!-- 액션 버튼 -->
            <div class="flex items-center gap-2">
              <UButton
                v-if="!card.isDefault"
                color="neutral"
                variant="outline"
                size="sm"
                @click="setDefaultCard(card.id)"
              >
                기본 카드 설정
              </UButton>
              <UButton
                color="error"
                variant="outline"
                size="sm"
                icon="i-heroicons-trash"
                @click="deleteCard(card.id)"
              />
            </div>
          </div>
        </div>
      </div>
    </UCard>

    <!-- 안내사항 -->
    <UAlert
      color="info"
      variant="subtle"
      icon="i-heroicons-information-circle"
      title="카드 관리 안내"
    >
      <template #description>
        <div class="space-y-1 text-sm">
          <p>• 등록된 카드는 BloC 충전 시 자동으로 사용됩니다.</p>
          <p>• 기본 카드가 우선적으로 사용됩니다.</p>
          <p>• 카드 정보는 안전하게 암호화되어 저장됩니다.</p>
          <p>• 사용하지 않는 카드는 삭제하실 수 있습니다.</p>
        </div>
      </template>
    </UAlert>
  </div>
</template>
