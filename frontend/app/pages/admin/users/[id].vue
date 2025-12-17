<script setup lang="ts">
import { useAdminApiFetch, useAdminApi } from '~/composables/useAdminApi';

definePageMeta({
  layout: 'admin',
  middleware: ['admin'],
});

const { hasMinRole } = useAdminAuth();
const route = useRoute();
const toast = useToast();

// 권한 체크
if (!hasMinRole('SUPPORT')) {
  throw createError({
    statusCode: 403,
    statusMessage: '접근 권한이 없습니다.',
  });
}

const userId = computed(() => Number(route.params.id));

// 사용자 상세 API
interface UserDetail {
  id: number;
  email: string;
  name: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  kakaoId: string | null;
  kakaoNickname: string | null;
  kakaoProfileImage: string | null;
  kakaoConnectedAt: string | null;
  isActive: boolean;
  subscription: {
    id: number;
    status: string;
    plan: {
      id: number;
      name: string;
      displayName: string;
      price: number;
    };
    startedAt: string;
    expiresAt: string;
    canceledAt: string | null;
    autoRenewal: boolean;
    lastPaymentDate: string | null;
    lastPaymentAmount: number | null;
  } | null;
  creditAccount: {
    id: number;
    subscriptionCredits: number;
    purchasedCredits: number;
    bonusCredits: number;
    totalCredits: number;
  } | null;
  stats: {
    blogPosts: number;
    personas: number;
    payments: number;
    cards: number;
  };
}

const {
  data: user,
  status,
  refresh,
} = useAdminApiFetch<UserDetail>(() => `/admin/users/${userId.value}`, {
  key: `admin-user-detail-${userId.value}`,
});

const isLoading = computed(() => status.value === 'pending');

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

// 구독 상태 뱃지 색상
const getSubscriptionColor = (status: string | undefined) => {
  switch (status) {
    case 'ACTIVE':
      return 'success';
    case 'TRIAL':
      return 'info';
    case 'EXPIRED':
      return 'error';
    case 'CANCELED':
      return 'warning';
    default:
      return 'neutral';
  }
};

// 구독 상태 라벨
const getSubscriptionLabel = (status: string | undefined) => {
  switch (status) {
    case 'ACTIVE':
      return '구독중';
    case 'TRIAL':
      return '체험중';
    case 'EXPIRED':
      return '만료됨';
    case 'CANCELED':
      return '취소됨';
    case 'PAST_DUE':
      return '결제 지연';
    default:
      return '미구독';
  }
};

// 금액 포맷
const formatCurrency = (amount: number | null | undefined) => {
  if (amount == null) return '-';
  return amount.toLocaleString() + '원';
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
        to="/admin/users"
      />
      <div>
        <h1 class="text-2xl font-bold text-neutral-900 dark:text-white">
          사용자 상세
        </h1>
        <p class="mt-1 text-sm text-neutral-500">
          사용자 정보를 확인하고 관리합니다.
        </p>
      </div>
    </div>

    <!-- 로딩 -->
    <div v-if="isLoading" class="flex justify-center py-12">
      <UIcon
        name="i-heroicons-arrow-path"
        class="w-8 h-8 text-neutral-400 animate-spin"
      />
    </div>

    <!-- 사용자 정보 없음 -->
    <UCard v-else-if="!user">
      <div class="flex flex-col items-center justify-center py-12">
        <UIcon
          name="i-heroicons-user-circle"
          class="w-12 h-12 text-neutral-400 mb-4"
        />
        <p class="text-neutral-500">사용자를 찾을 수 없습니다.</p>
        <UButton class="mt-4" to="/admin/users">목록으로 돌아가기</UButton>
      </div>
    </UCard>

    <!-- 사용자 정보 -->
    <template v-else>
      <!-- 기본 정보 -->
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-semibold">기본 정보</h2>
            <UBadge :color="user.isActive ? 'success' : 'error'">
              {{ user.isActive ? '활성' : '비활성' }}
            </UBadge>
          </div>
        </template>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="space-y-4">
            <div>
              <label class="text-sm text-neutral-500">ID</label>
              <p class="font-medium">{{ user.id }}</p>
            </div>
            <div>
              <label class="text-sm text-neutral-500">이메일</label>
              <p class="font-medium">{{ user.email }}</p>
            </div>
            <div>
              <label class="text-sm text-neutral-500">이름</label>
              <p class="font-medium">{{ user.name || '-' }}</p>
            </div>
          </div>
          <div class="space-y-4">
            <div>
              <label class="text-sm text-neutral-500">가입일</label>
              <p class="font-medium">{{ formatDate(user.createdAt) }}</p>
            </div>
            <div>
              <label class="text-sm text-neutral-500">최근 수정일</label>
              <p class="font-medium">{{ formatDate(user.updatedAt) }}</p>
            </div>
            <div v-if="user.deletedAt">
              <label class="text-sm text-neutral-500">탈퇴일</label>
              <p class="font-medium text-error-600">
                {{ formatDate(user.deletedAt) }}
              </p>
            </div>
          </div>
        </div>
      </UCard>

      <!-- 카카오 연동 정보 -->
      <UCard v-if="user.kakaoId">
        <template #header>
          <h2 class="text-lg font-semibold">카카오 연동</h2>
        </template>

        <div class="flex items-start gap-4">
          <img
            v-if="user.kakaoProfileImage"
            :src="user.kakaoProfileImage"
            :alt="user.kakaoNickname || ''"
            class="w-16 h-16 rounded-full"
          />
          <div
            v-else
            class="w-16 h-16 rounded-full bg-neutral-200 flex items-center justify-center"
          >
            <UIcon name="i-heroicons-user" class="w-8 h-8 text-neutral-400" />
          </div>
          <div class="space-y-2">
            <div>
              <label class="text-sm text-neutral-500">카카오 닉네임</label>
              <p class="font-medium">{{ user.kakaoNickname || '-' }}</p>
            </div>
            <div>
              <label class="text-sm text-neutral-500">카카오 ID</label>
              <p class="font-mono text-sm">{{ user.kakaoId }}</p>
            </div>
            <div>
              <label class="text-sm text-neutral-500">연동일</label>
              <p class="text-sm">{{ formatDate(user.kakaoConnectedAt) }}</p>
            </div>
          </div>
        </div>
      </UCard>

      <!-- 구독 정보 -->
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-semibold">구독 정보</h2>
            <UBadge
              v-if="user.subscription"
              :color="getSubscriptionColor(user.subscription.status)"
            >
              {{ getSubscriptionLabel(user.subscription.status) }}
            </UBadge>
            <UBadge v-else color="neutral">미구독</UBadge>
          </div>
        </template>

        <div v-if="user.subscription" class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="space-y-4">
            <div>
              <label class="text-sm text-neutral-500">요금제</label>
              <p class="font-medium">
                {{ user.subscription.plan?.displayName || user.subscription.plan?.name }}
              </p>
            </div>
            <div>
              <label class="text-sm text-neutral-500">월 요금</label>
              <p class="font-medium">
                {{ formatCurrency(user.subscription.plan?.price) }}
              </p>
            </div>
            <div>
              <label class="text-sm text-neutral-500">자동 갱신</label>
              <UBadge :color="user.subscription.autoRenewal ? 'success' : 'neutral'">
                {{ user.subscription.autoRenewal ? '활성' : '비활성' }}
              </UBadge>
            </div>
          </div>
          <div class="space-y-4">
            <div>
              <label class="text-sm text-neutral-500">시작일</label>
              <p class="font-medium">{{ formatDate(user.subscription.startedAt) }}</p>
            </div>
            <div>
              <label class="text-sm text-neutral-500">만료일</label>
              <p class="font-medium">{{ formatDate(user.subscription.expiresAt) }}</p>
            </div>
            <div v-if="user.subscription.canceledAt">
              <label class="text-sm text-neutral-500">취소일</label>
              <p class="font-medium text-warning-600">
                {{ formatDate(user.subscription.canceledAt) }}
              </p>
            </div>
            <div v-if="user.subscription.lastPaymentDate">
              <label class="text-sm text-neutral-500">최근 결제</label>
              <p class="font-medium">
                {{ formatDate(user.subscription.lastPaymentDate) }}
                <span v-if="user.subscription.lastPaymentAmount" class="text-neutral-500">
                  ({{ formatCurrency(user.subscription.lastPaymentAmount) }})
                </span>
              </p>
            </div>
          </div>
        </div>
        <div v-else class="text-center py-8 text-neutral-500">
          구독 정보가 없습니다.
        </div>
      </UCard>

      <!-- 크레딧 정보 -->
      <UCard>
        <template #header>
          <h2 class="text-lg font-semibold">크레딧</h2>
        </template>

        <div v-if="user.creditAccount" class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="text-center p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
            <p class="text-2xl font-bold text-primary-600">
              {{ user.creditAccount.totalCredits.toLocaleString() }}
            </p>
            <p class="text-sm text-neutral-500">총 크레딧</p>
          </div>
          <div class="text-center p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
            <p class="text-2xl font-bold">
              {{ user.creditAccount.subscriptionCredits.toLocaleString() }}
            </p>
            <p class="text-sm text-neutral-500">구독 크레딧</p>
          </div>
          <div class="text-center p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
            <p class="text-2xl font-bold">
              {{ user.creditAccount.purchasedCredits.toLocaleString() }}
            </p>
            <p class="text-sm text-neutral-500">구매 크레딧</p>
          </div>
          <div class="text-center p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
            <p class="text-2xl font-bold">
              {{ user.creditAccount.bonusCredits.toLocaleString() }}
            </p>
            <p class="text-sm text-neutral-500">보너스 크레딧</p>
          </div>
        </div>
        <div v-else class="text-center py-8 text-neutral-500">
          크레딧 정보가 없습니다.
        </div>
      </UCard>

      <!-- 활동 통계 -->
      <UCard>
        <template #header>
          <h2 class="text-lg font-semibold">활동 통계</h2>
        </template>

        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="text-center p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
            <p class="text-2xl font-bold">{{ user.stats.blogPosts }}</p>
            <p class="text-sm text-neutral-500">블로그 포스트</p>
          </div>
          <div class="text-center p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
            <p class="text-2xl font-bold">{{ user.stats.personas }}</p>
            <p class="text-sm text-neutral-500">페르소나</p>
          </div>
          <div class="text-center p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
            <p class="text-2xl font-bold">{{ user.stats.payments }}</p>
            <p class="text-sm text-neutral-500">결제 내역</p>
          </div>
          <div class="text-center p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
            <p class="text-2xl font-bold">{{ user.stats.cards }}</p>
            <p class="text-sm text-neutral-500">등록 카드</p>
          </div>
        </div>
      </UCard>
    </template>
  </div>
</template>
