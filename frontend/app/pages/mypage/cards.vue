<script lang="ts" setup>
import { CardForm } from '#components';
import { formatCardNumber } from '~/schemas/card';

definePageMeta({
  middleware: 'auth',
});

const toast = useToast();
const confirm = useConfirm();
const overlay = useOverlay();
const cardFormModal = overlay.create(CardForm);
const [isPending, startTransition] = useTransition();

const {
  data: cards,
  refresh: loadCards,
  pending,
} = await useApiFetch<Card[]>('/cards', {
  // 초기값 빈 배열 설정
  // @ts-ignore
  default: () => [] as Card[],
  lazy: true,
});

// 로딩 상태
const isLoading = computed(() => pending.value);

const openCardFormModal = async () => {
  // 카드 개수 제한 체크 (최대 3개)
  const MAX_CARDS = 3;
  if (cards.value && cards.value.length >= MAX_CARDS) {
    toast.add({
      title: '카드 등록 제한',
      description: `최대 ${MAX_CARDS}개의 카드만 등록할 수 있습니다.`,
      color: 'warning',
    });
    return;
  }

  const instance = cardFormModal.open({
    existingCardsCount: cards.value?.length || 0,
  });

  const result = (await instance.result) as boolean;

  if (result) {
    // 등록 성공 시 카드 목록 새로고침
    await loadCards();
  }
};

// 카드 삭제 처리
async function deleteCard(card: Card) {
  const result = await confirm({
    title: '카드 삭제',
    description:
      '정말 카드를 삭제하시겠습니까? 삭제된 카드는 복구할 수 없습니다.',
    confirmText: '삭제',
    cancelText: '취소',
  });

  if (!result) return;

  startTransition(
    async () => {
      // 카드 삭제 API 호출
      await useApi(`/cards/${card.id}`, {
        method: 'DELETE',
      });
    },
    {
      onSuccess: async () => {
        toast.add({
          title: '카드 삭제 완료',
          description: '카드가 삭제되었습니다.',
          color: 'success',
        });

        // 카드 목록 새로고침
        await loadCards();
      },
      onError: (error: any) => {
        toast.add({
          title: '카드 삭제 실패',
          description:
            error.response?._data?.message ||
            error.message ||
            '카드 삭제 중 오류가 발생했습니다.',
          color: 'error',
        });
      },
    },
  );
}

// 기본 카드 설정
async function setDefaultCard(card: Card) {
  if (card.isDefault) return;

  startTransition(
    async () => {
      await useApi(`/cards/${card.id}/default`, {
        method: 'PATCH',
      });
    },
    {
      onSuccess: async () => {
        toast.add({
          title: '기본 카드 설정 완료',
          description: '기본 카드가 설정되었습니다.',
          color: 'success',
        });

        // 카드 목록 새로고침
        await loadCards();
      },
      onError: (error: any) => {
        toast.add({
          title: '기본 카드 설정 실패',
          description:
            error.response?._data?.message ||
            error.message ||
            '기본 카드 설정 중 오류가 발생했습니다.',
          color: 'error',
        });
      },
    },
  );
}

// 날짜 포맷팅
function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// 카드사별 액센트 색상 (심플한 라인 강조용)
function getCardAccentColor(cardCompany: string | null) {
  if (!cardCompany) return 'border-gray-400';

  const colors: Record<string, string> = {
    '[신한]': 'border-blue-400',
    '[KB국민]': 'border-amber-400',
    '[우리]': 'border-indigo-400',
    '[하나]': 'border-green-400',
    '[삼성]': 'border-purple-400',
    '[현대]': 'border-red-400',
    '[롯데]': 'border-pink-400',
    '[기본]': 'border-gray-400',
  };

  return colors[cardCompany] || colors['기본'];
}

// 카드 타입 표시 텍스트
function getCardTypeText(cardType: string | null) {
  if (!cardType) return '카드';
  return cardType === 'credit'
    ? '신용'
    : cardType === 'check'
      ? '체크'
      : '카드';
}
</script>

<template>
  <div class="container mx-auto max-w-5xl">
    <!-- 페이지 헤더 -->
    <ConsoleTitle
      title="카드 관리"
      description="결제에 사용할 카드를 등록하고 관리하세요"
    />

    <!-- 카드 목록 -->
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div
              class="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10"
            >
              <Icon
                name="i-heroicons-credit-card"
                :size="24"
                class="text-primary"
              />
            </div>
            <div>
              <h3 class="text-lg font-semibold">등록된 카드</h3>
              <!-- prettier-ignore -->
              <p class="text-sm text-gray-500">
                <span class="text-primary font-semibold">
                  {{ cards?.length || 0 }}/3
                </span>개의 카드가 등록되어 있습니다
              </p>
            </div>
          </div>

          <UButton
            size="sm"
            icon="i-heroicons-plus"
            :disabled="cards && cards.length >= 3"
            @click="openCardFormModal"
            :loading="isPending || isLoading"
          >
            카드 추가
          </UButton>
        </div>
      </template>

      <!-- 카드 없음 상태 -->
      <div v-if="!cards?.length" class="text-center py-12">
        <div
          class="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-gray-50"
        >
          <UIcon
            name="i-heroicons-credit-card"
            size="32"
            class="text-primary-600"
          />
        </div>
        <h3 class="text-lg font-semibold text-gray-900 mb-2">
          등록된 카드가 없습니다
        </h3>
        <p class="text-sm text-gray-500 mb-6">
          결제에 사용할 카드를 등록해주세요
        </p>
        <UButton
          icon="i-heroicons-plus"
          @click="openCardFormModal"
          :loading="isPending || isLoading"
        >
          첫 카드 추가하기
        </UButton>
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="card in cards"
          :key="card.id"
          :class="[
            'relative px-4 py-3.5 rounded-lg border bg-white transition-all duration-200',
            'hover:shadow-md hover:border-gray-400',
            card.isDefault
              ? getCardAccentColor(card.cardCompany)
              : 'border-gray-200',
          ]"
        >
          <!-- 카드 상단 -->
          <div class="flex items-start justify-between mb-3">
            <div class="flex items-center gap-2">
              <div class="i-heroicons-credit-card text-gray-400 text-lg" />
              <div>
                <div class="text-sm font-medium text-gray-900">
                  {{ card.cardCompany || '카드사 정보 없음' }}
                </div>
                <div class="text-xs text-gray-500">
                  {{ getCardTypeText(card.cardType) }}
                </div>
              </div>
            </div>
            <div class="flex items-center gap-1.5">
              <UBadge
                v-if="card.isDefault"
                color="primary"
                variant="subtle"
                size="sm"
              >
                기본
              </UBadge>
              <UBadge
                v-if="card.isAuthenticated"
                color="success"
                variant="subtle"
                size="sm"
              >
                인증
              </UBadge>
            </div>
          </div>

          <!-- 카드 번호 -->
          <div class="mb-3">
            <div class="text-base font-mono text-gray-700">
              {{
                card.number
                  ? formatCardNumber(card.number)
                  : '****-****-****-****'
              }}
            </div>
          </div>

          <!-- 카드 하단 -->
          <div
            class="flex items-center justify-between pt-3 border-t border-gray-100"
          >
            <div class="text-xs text-gray-400">
              {{ formatDate(card.createdAt) }}
            </div>
            <div class="flex items-center gap-1">
              <UButton
                v-if="!card.isDefault"
                size="xs"
                color="neutral"
                variant="ghost"
                @click="setDefaultCard(card)"
                :loading="isPending || isLoading"
              >
                기본 설정
              </UButton>
              <UButton
                size="xs"
                color="error"
                variant="ghost"
                icon="i-heroicons-trash"
                @click="deleteCard(card)"
                :disabled="isPending || isLoading"
              />
            </div>
          </div>
        </div>
      </div>
    </UCard>

    <!-- 결제 안내 -->
    <UCard>
      <template #header>
        <div class="flex items-center gap-3">
          <div
            class="flex items-center justify-center w-10 h-10 rounded-full bg-info/10"
          >
            <Icon
              name="i-heroicons-information-circle"
              :size="24"
              class="text-info"
            />
          </div>
          <h3 class="text-lg font-semibold">결제 안내</h3>
        </div>
      </template>

      <div class="space-y-4 text-sm text-gray-600">
        <div class="flex items-start gap-3">
          <div class="i-heroicons-check-circle text-success mt-0.5" />
          <div>
            <div class="font-medium text-gray-900 mb-1">안전한 결제</div>
            <div>
              모든 카드 정보는 PCI-DSS 인증을 받은 나이스페이먼츠를 통해
              안전하게 암호화되어 저장됩니다.
            </div>
          </div>
        </div>

        <div class="flex items-start gap-3">
          <div class="i-heroicons-check-circle text-success mt-0.5" />
          <div>
            <div class="font-medium text-gray-900 mb-1">자동 결제</div>
            <div>
              구독 플랜의 자동 갱신 시 기본 카드로 설정된 카드가 사용됩니다.
            </div>
          </div>
        </div>

        <div class="flex items-start gap-3">
          <div class="i-heroicons-check-circle text-success mt-0.5" />
          <div>
            <div class="font-medium text-gray-900 mb-1">카드 변경</div>
            <div>
              언제든지 카드를 추가하거나 삭제할 수 있으며, 기본 카드를 변경할 수
              있습니다.
            </div>
          </div>
        </div>
      </div>
    </UCard>
  </div>
</template>
