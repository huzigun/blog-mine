<script lang="ts" setup>
import type { FormSubmitEvent } from '#ui/types';

definePageMeta({
  middleware: 'auth',
});

const toast = useToast();
const auth = useAuth();

// 구독 취소 모달
const isCancelModalOpen = ref(false);
const cancelReason = ref('');
const isCanceling = ref(false);

// 구독 취소 처리
const handleCancelSubscription = async () => {
  if (!auth.subscription) return;

  isCanceling.value = true;

  try {
    await useApi('/subscriptions/cancel', {
      method: 'POST',
      body: {
        reason: cancelReason.value || undefined,
      },
    });

    // 구독 정보 갱신
    await auth.fetchSubscription();

    toast.add({
      title: '구독 취소 완료',
      description: `${formatDate(auth.subscription.expiresAt)}까지 계속 이용하실 수 있습니다.`,
      color: 'success',
    });

    isCancelModalOpen.value = false;
    cancelReason.value = '';
  } catch (error: any) {
    toast.add({
      title: '구독 취소 실패',
      description: error?.data?.message || '구독 취소 중 오류가 발생했습니다.',
      color: 'error',
    });
  } finally {
    isCanceling.value = false;
  }
};

// 구독 재활성화 처리
const isReactivating = ref(false);

const handleReactivateSubscription = async () => {
  isReactivating.value = true;

  try {
    await useApi('/subscriptions/reactivate', {
      method: 'POST',
    });

    // 구독 정보 갱신
    await auth.fetchSubscription();

    toast.add({
      title: '구독 재활성화 완료',
      description: '자동 갱신이 다시 시작됩니다.',
      color: 'success',
    });
  } catch (error: any) {
    toast.add({
      title: '구독 재활성화 실패',
      description:
        error?.data?.message || '구독 재활성화 중 오류가 발생했습니다.',
      color: 'error',
    });
  } finally {
    isReactivating.value = false;
  }
};

interface BusinessInfo {
  id: number;
  businessName: string | null;
  businessNumber: string | null;
  businessOwner: string | null;
  businessAddress: string | null;
  businessType: string | null;
  businessCategory: string | null;
  createdAt: string;
  updatedAt: string;
}

interface UserResponse {
  id: number;
  email: string;
  name: string | null;
  createdAt: string;
  businessInfo: BusinessInfo | null;
  kakaoId: string | null;
  kakaoNickname: string | null;
  kakaoProfileImage: string | null;
  kakaoConnectedAt: string | null;
}

interface CreditBalance {
  totalCredits: number;
  subscriptionCredits: number;
  purchasedCredits: number;
  bonusCredits: number;
  lastUsedAt: string | null;
}

const [
  { data: creditBalance, refresh: refreshCredits },
  { data: userData, refresh: refreshUser },
] = await Promise.all([
  useApiFetch<CreditBalance>('/credits/balance'),
  useApiFetch<UserResponse>('/user/me'),
]);

const user = computed(() => ({
  id: userData.value?.id || 0,
  email: userData.value?.email || '',
  name: userData.value?.name || '',
  createdAt: userData.value?.createdAt || '',
  businessInfo: userData.value?.businessInfo || null,
  kakaoId: userData.value?.kakaoId || null,
  kakaoNickname: userData.value?.kakaoNickname || null,
  kakaoProfileImage: userData.value?.kakaoProfileImage || null,
  kakaoConnectedAt: userData.value?.kakaoConnectedAt || null,
}));

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const getSubscriptionStatusColor = (status: string) => {
  switch (status) {
    case 'TRIAL':
      return 'info';
    case 'ACTIVE':
      return 'success';
    case 'PAST_DUE':
      return 'warning';
    case 'CANCELED':
    case 'EXPIRED':
      return 'error';
    default:
      return 'neutral';
  }
};

const getSubscriptionStatusLabel = (status: string) => {
  switch (status) {
    case 'TRIAL':
      return '체험';
    case 'ACTIVE':
      return '활성';
    case 'PAST_DUE':
      return '결제 지연';
    case 'CANCELED':
      return '취소 예약';
    case 'EXPIRED':
      return '만료';
    default:
      return status;
  }
};

// 모달 상태
const isProfileModalOpen = ref(false);
const isPasswordModalOpen = ref(false);
const isBusinessModalOpen = ref(false);

// 프로필 수정 모달
const profileForm = reactive({
  name: user.value.name,
  email: user.value.email,
});

const isProfileSaving = ref(false);

const openProfileModal = () => {
  profileForm.name = user.value.name;
  profileForm.email = user.value.email;
  isProfileModalOpen.value = true;
};

const handleSaveProfile = async (
  event: FormSubmitEvent<typeof profileForm>,
) => {
  isProfileSaving.value = true;
  try {
    // TODO: API 호출
    await new Promise((resolve) => setTimeout(resolve, 1000));
    user.value.name = event.data.name;
    user.value.email = event.data.email;
    toast.add({
      title: '성공',
      description: '프로필이 업데이트되었습니다.',
      color: 'success',
    });
    isProfileModalOpen.value = false;
  } catch (error) {
    toast.add({
      title: '오류',
      description: '프로필 업데이트에 실패했습니다.',
      color: 'error',
    });
  } finally {
    isProfileSaving.value = false;
  }
};

// 비밀번호 변경 모달
const passwordForm = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
});

const isPasswordSaving = ref(false);

const openPasswordModal = () => {
  passwordForm.currentPassword = '';
  passwordForm.newPassword = '';
  passwordForm.confirmPassword = '';
  isPasswordModalOpen.value = true;
};

const handleChangePassword = async (
  event: FormSubmitEvent<typeof passwordForm>,
) => {
  if (event.data.newPassword !== event.data.confirmPassword) {
    toast.add({
      title: '오류',
      description: '새 비밀번호가 일치하지 않습니다.',
      color: 'error',
    });
    return;
  }

  isPasswordSaving.value = true;
  try {
    await useApi('/user/change-password', {
      method: 'POST',
      body: {
        currentPassword: event.data.currentPassword,
        newPassword: event.data.newPassword,
      },
    });

    toast.add({
      title: '성공',
      description: '비밀번호가 변경되었습니다.',
      color: 'success',
    });
    isPasswordModalOpen.value = false;

    // 폼 초기화
    passwordForm.currentPassword = '';
    passwordForm.newPassword = '';
    passwordForm.confirmPassword = '';
  } catch (error: any) {
    const errorMessage =
      error?.data?.message || '비밀번호 변경에 실패했습니다.';
    toast.add({
      title: '오류',
      description: errorMessage,
      color: 'error',
    });
  } finally {
    isPasswordSaving.value = false;
  }
};

// 사업자 정보 수정 모달
const businessForm = reactive({
  businessName: '',
  businessNumber: '',
  businessOwner: '',
  businessAddress: '',
  businessType: '',
  businessCategory: '',
});

const isBusinessSaving = ref(false);

const openBusinessModal = () => {
  const businessInfo = user.value.businessInfo;
  businessForm.businessName = businessInfo?.businessName || '';
  businessForm.businessNumber = businessInfo?.businessNumber || '';
  businessForm.businessOwner = businessInfo?.businessOwner || '';
  businessForm.businessAddress = businessInfo?.businessAddress || '';
  businessForm.businessType = businessInfo?.businessType || '';
  businessForm.businessCategory = businessInfo?.businessCategory || '';
  isBusinessModalOpen.value = true;
};

const handleSaveBusinessInfo = async (
  event: FormSubmitEvent<typeof businessForm>,
) => {
  isBusinessSaving.value = true;
  try {
    await useApiFetch('/user/business-info', {
      method: 'PUT',
      body: event.data,
    });

    // 사용자 정보 새로고침
    await refreshUser();

    toast.add({
      title: '성공',
      description: '사업자 정보가 저장되었습니다.',
      color: 'success',
    });
    isBusinessModalOpen.value = false;
  } catch (error) {
    toast.add({
      title: '오류',
      description: '사업자 정보 저장에 실패했습니다.',
      color: 'error',
    });
  } finally {
    isBusinessSaving.value = false;
  }
};

// 회원 탈퇴
const isDeleting = ref(false);
const isDeleteModalOpen = ref(false);
const deleteConfirmText = ref('');
const REQUIRED_DELETE_TEXT = '회원 탈퇴';

const openDeleteModal = () => {
  deleteConfirmText.value = '';
  isDeleteModalOpen.value = true;
};

const isDeleteConfirmValid = computed(() => {
  return deleteConfirmText.value === REQUIRED_DELETE_TEXT;
});

const handleDeleteAccount = async () => {
  if (!isDeleteConfirmValid.value) {
    toast.add({
      title: '입력 오류',
      description: `"${REQUIRED_DELETE_TEXT}"를 정확히 입력해주세요.`,
      color: 'error',
    });
    return;
  }

  isDeleting.value = true;
  try {
    // TODO: API 호출
    await new Promise((resolve) => setTimeout(resolve, 1500));
    toast.add({
      title: '회원 탈퇴 완료',
      description: '그동안 이용해주셔서 감사합니다.',
      color: 'success',
    });
    isDeleteModalOpen.value = false;
    // TODO: 로그아웃 및 리다이렉트
    await navigateTo('/');
  } catch (error) {
    toast.add({
      title: '오류',
      description: '회원 탈퇴에 실패했습니다.',
      color: 'error',
    });
  } finally {
    isDeleting.value = false;
  }
};

// Kakao 연결 상태
const [isConnectingKakao, startKakaoConnect] = useTransition();
let kakaoPopup: Window | null = null;

// Kakao OAuth 콜백 처리를 위한 Promise resolver
let kakaoConnectResolver:
  | ((value: { success: boolean; message: string }) => void)
  | null = null;

const connectResult = (
  e: MessageEvent<{
    success: boolean;
    message: string;
  }>,
) => {
  // 메시지 origin 검증 (보안 강화)
  const config = useRuntimeConfig();
  const allowedOrigins = [
    config.public.apiBase || 'http://localhost:9706',
    window.location.origin,
  ];

  if (!allowedOrigins.includes(e.origin)) {
    console.warn('Untrusted message origin:', e.origin);
    return;
  }

  const data = e.data;

  // 데이터 유효성 검증
  if (!data || typeof data.success !== 'boolean') {
    console.warn('Invalid message data:', data);
    return;
  }

  // 이벤트 리스너 정리
  window.removeEventListener('message', connectResult);

  // 팝업 닫기
  if (kakaoPopup && !kakaoPopup.closed) {
    kakaoPopup.close();
  }
  kakaoPopup = null;

  // Promise resolver 호출
  if (kakaoConnectResolver) {
    kakaoConnectResolver(data);
    kakaoConnectResolver = null;
  }
};

const connectKakao = async () => {
  if (isConnectingKakao.value) {
    toast.add({
      title: '진행 중',
      description: '카카오 연결이 이미 진행 중입니다.',
      color: 'warning',
    });
    return;
  }

  await startKakaoConnect(
    async () => {
      const config = useRuntimeConfig();
      const KAKAO_AUTH_URL = 'https://kauth.kakao.com/oauth/authorize';
      const url = new URL(KAKAO_AUTH_URL);

      // 환경 변수에서 Client ID 가져오기
      const clientId = config.public.kakaoClientId;
      if (!clientId) {
        throw new Error('카카오 클라이언트 ID가 설정되지 않았습니다.');
      }

      // JWT state 토큰 생성 (백엔드 API 호출)
      let stateToken: string;
      try {
        const response = await useApi<{ state: string }>('/auth/kakao/state', {
          method: 'POST',
        });
        stateToken = response.state;
      } catch (error: any) {
        throw new Error(
          error?.data?.message || '인증 준비 중 오류가 발생했습니다.',
        );
      }

      // 환경에 따른 Redirect URI 설정
      const baseUrl = config.public.apiBaseUrl || 'http://localhost:9706';
      const redirectUri = `${baseUrl}/auth/callback/kakao`;

      url.searchParams.set('client_id', clientId);
      url.searchParams.set('redirect_uri', redirectUri);
      url.searchParams.set('response_type', 'code');
      url.searchParams.set('state', stateToken);
      url.searchParams.set(
        'scope',
        'account_email,profile_nickname,profile_image',
      );

      console.log(redirectUri);

      // 기존 이벤트 리스너 정리
      window.removeEventListener('message', connectResult);

      // 약간의 지연 후 이벤트 리스너 등록 (중복 방지)
      await new Promise((resolve) => {
        setTimeout(() => {
          resolve(true);
        }, 100);
      });

      window.addEventListener('message', connectResult);

      // 팝업 열기
      kakaoPopup = window.open(
        url.toString(),
        'kakao_auth',
        'width=470,height=620,resizable=no,scrollbars=yes',
      );

      await new Promise((resolve) => {
        setTimeout(() => {
          resolve(true);
        }, 100);
      });

      // 팝업 차단 확인
      if (!kakaoPopup || kakaoPopup.closed) {
        window.removeEventListener('message', connectResult);
        throw new Error('팝업이 차단되었습니다. 브라우저 설정을 확인해주세요.');
      }

      // Promise로 OAuth 콜백 결과를 기다림
      const result = await new Promise<{ success: boolean; message: string }>(
        (resolve, reject) => {
          kakaoConnectResolver = resolve;

          // 팝업이 닫혔는지 주기적으로 확인
          const checkPopupClosed = setInterval(() => {
            if (kakaoPopup && kakaoPopup.closed) {
              clearInterval(checkPopupClosed);
              clearTimeout(timeoutId);
              window.removeEventListener('message', connectResult);
              kakaoConnectResolver = null;
              reject(new Error('카카오 연결이 취소되었습니다.'));
            }
          }, 500);

          // 타임아웃 설정 (2분)
          const timeoutId = setTimeout(() => {
            clearInterval(checkPopupClosed);
            if (kakaoPopup && !kakaoPopup.closed) {
              kakaoPopup.close();
            }
            window.removeEventListener('message', connectResult);
            kakaoConnectResolver = null;
            reject(new Error('카카오 연결 시간이 초과되었습니다.'));
          }, 120000);
        },
      );

      // 결과 처리
      if (!result.success) {
        throw new Error(result.message);
      }

      return result;
    },
    {
      onSuccess: () => {
        toast.add({
          title: '카카오 연결 성공',
          description: '카카오 계정이 성공적으로 연결되었습니다.',
          color: 'success',
        });
        refreshUser();
      },
      onError: (error) => {
        const message = error.message || '연결에 실패했습니다.';
        toast.add({
          title: '카카오 연결 실패',
          description: message,
          color: 'error',
        });
      },
    },
  );
};

// Kakao 연결 해제
const [isDisconnectingKakao, startKakaoDisconnect] = useTransition();

const disconnectKakao = async () => {
  if (isDisconnectingKakao.value) return;

  const confirmed = confirm('카카오 계정 연결을 해제하시겠습니까?');
  if (!confirmed) return;

  await startKakaoDisconnect(
    async () => {
      const response = await useApi<{ message: string; success: boolean }>(
        '/auth/disconnect-kakao',
        {
          method: 'POST',
        },
      );

      return response;
    },
    {
      onSuccess: () => {
        toast.add({
          title: '연결 해제 완료',
          description: '카카오 계정 연결이 해제되었습니다.',
          color: 'success',
        });
        refreshUser();
      },
      onError: (error: any) => {
        toast.add({
          title: '연결 해제 실패',
          description:
            error?.data?.message || '연결 해제 중 오류가 발생했습니다.',
          color: 'error',
        });
      },
    },
  );
};
</script>

<template>
  <section class="container mx-auto max-w-4xl py-6 space-y-4">
    <ConsoleTitle
      title="계정 설정"
      description="계정 정보를 확인하고 관리할 수 있습니다."
    />

    <!-- 프로필 정보 -->
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div
              class="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10"
            >
              <UIcon
                name="i-heroicons-user-circle"
                class="text-primary"
                :size="24"
              />
            </div>
            <h3 class="text-lg font-semibold">프로필 정보</h3>
          </div>
          <div class="flex items-center gap-2">
            <UButton
              size="sm"
              variant="soft"
              icon="i-heroicons-pencil"
              @click="openProfileModal"
            >
              프로필 수정
            </UButton>
            <UButton
              size="sm"
              variant="soft"
              icon="i-heroicons-key"
              @click="openPasswordModal"
            >
              비밀번호 변경
            </UButton>
          </div>
        </div>
      </template>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          class="flex flex-col gap-1.5 p-4 rounded-lg bg-neutral-50 dark:bg-neutral-900"
        >
          <div
            class="flex items-center gap-2 text-xs font-medium text-neutral-500 dark:text-neutral-400"
          >
            <UIcon name="i-heroicons-user" class="w-3.5 h-3.5" />
            <span>이름</span>
          </div>
          <div class="text-base font-medium">{{ user.name }}</div>
        </div>

        <div
          class="flex flex-col gap-1.5 p-4 rounded-lg bg-neutral-50 dark:bg-neutral-900"
        >
          <div
            class="flex items-center gap-2 text-xs font-medium text-neutral-500 dark:text-neutral-400"
          >
            <UIcon name="i-heroicons-envelope" class="w-3.5 h-3.5" />
            <span>이메일</span>
          </div>
          <div class="text-base font-medium">{{ user.email }}</div>
        </div>

        <div
          class="flex flex-col gap-1.5 p-4 rounded-lg bg-neutral-50 dark:bg-neutral-900 md:col-span-2"
        >
          <div
            class="flex items-center gap-2 text-xs font-medium text-neutral-500 dark:text-neutral-400"
          >
            <UIcon name="i-heroicons-calendar" class="w-3.5 h-3.5" />
            <span>가입일</span>
          </div>
          <div class="text-base font-medium">
            {{ formatDate(user.createdAt) }}
          </div>
        </div>
      </div>
    </UCard>

    <!-- Kakao 계정 연결 -->
    <UCard>
      <template #header>
        <div class="flex items-center gap-3">
          <div
            class="flex items-center justify-center w-10 h-10 rounded-full bg-warning/10"
          >
            <UIcon name="i-heroicons-link" class="text-warning" :size="24" />
          </div>
          <div>
            <h3 class="text-lg font-semibold">소셜 계정 연결</h3>
            <p class="text-sm text-neutral-600 dark:text-neutral-400 mt-0.5">
              카카오 계정을 연결하여 간편하게 로그인하세요
            </p>
          </div>
        </div>
      </template>

      <div class="space-y-4">
        <!-- 연결 상태 표시 -->
        <div
          v-if="user.kakaoId"
          class="flex items-center justify-between p-4 rounded-lg bg-success/5 border border-success/20"
        >
          <div class="flex items-center gap-3">
            <div
              class="flex items-center justify-center w-12 h-12 rounded-full bg-yellow-400"
            >
              <UIcon
                name="i-heroicons-chat-bubble-bottom-center-text"
                class="text-yellow-900"
                :size="24"
              />
            </div>
            <div>
              <p class="font-medium text-success">카카오 계정 연결됨</p>
              <p class="text-sm text-neutral-600 dark:text-neutral-400">
                {{ user.kakaoNickname || '카카오 사용자' }}
              </p>
            </div>
          </div>
          <UButton
            color="error"
            variant="soft"
            size="sm"
            :loading="isDisconnectingKakao"
            @click="disconnectKakao"
          >
            연결 해제
          </UButton>
        </div>

        <!-- 연결 안 됨 -->
        <div
          v-else
          class="flex items-center justify-between p-4 rounded-lg bg-neutral-50 dark:bg-neutral-900"
        >
          <div class="flex items-center gap-3">
            <div
              class="flex items-center justify-center w-12 h-12 rounded-full bg-yellow-400"
            >
              <UIcon
                name="i-heroicons-chat-bubble-bottom-center-text"
                class="text-yellow-900"
                :size="24"
              />
            </div>
            <div>
              <p class="font-medium">카카오 계정</p>
              <p class="text-sm text-neutral-600 dark:text-neutral-400">
                연결되지 않음
              </p>
            </div>
          </div>
          <UButton
            color="warning"
            variant="soft"
            size="sm"
            :loading="isConnectingKakao"
            @click="connectKakao"
          >
            연결하기
          </UButton>
        </div>

        <!-- 안내 메시지 -->
        <div
          class="text-sm text-neutral-600 dark:text-neutral-400 p-3 bg-neutral-50 dark:bg-neutral-900 rounded-lg"
        >
          <UIcon
            name="i-heroicons-information-circle"
            class="w-4 h-4 inline mr-1"
          />
          카카오 계정을 연결하면 다음 로그인 시 간편하게 이용할 수 있습니다.
        </div>
      </div>
    </UCard>

    <!-- 구독 및 크레딧 정보 -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <!-- 구독 정보 -->
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div
                class="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10"
              >
                <UIcon
                  name="i-heroicons-receipt-percent"
                  class="text-primary"
                  :size="24"
                />
              </div>
              <h3 class="text-lg font-semibold">구독 정보</h3>
            </div>
            <UButton
              size="sm"
              variant="soft"
              icon="i-heroicons-arrow-path"
              to="/pricing"
            >
              플랜 관리
            </UButton>
          </div>
        </template>

        <div class="space-y-4">
          <!-- 활성 구독 -->
          <div v-if="auth.subscription" class="space-y-3">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <h4 class="text-base font-semibold">
                  {{ auth.subscription.plan.displayName }}
                </h4>
                <UBadge
                  :color="getSubscriptionStatusColor(auth.subscription.status)"
                  variant="soft"
                >
                  {{ getSubscriptionStatusLabel(auth.subscription.status) }}
                </UBadge>
              </div>
              <div v-if="auth.subscription.plan.price" class="text-right">
                <div class="text-2xl font-bold text-primary">
                  {{ auth.subscription.plan.price.toLocaleString() }}원
                </div>
                <div class="text-xs text-neutral-500 dark:text-neutral-400">
                  /월
                </div>
              </div>
            </div>

            <div class="grid grid-cols-1 gap-3 text-sm">
              <div
                class="flex items-center gap-2 text-neutral-600 dark:text-neutral-400"
              >
                <UIcon name="i-heroicons-calendar-days" class="w-4 h-4" />
                <span>
                  시작일: {{ formatDate(auth.subscription.startedAt) }}
                </span>
              </div>
              <div
                class="flex items-center gap-2 text-neutral-600 dark:text-neutral-400"
              >
                <UIcon name="i-heroicons-clock" class="w-4 h-4" />
                <span>
                  {{
                    auth.subscription.autoRenewal ? '다음 결제일' : '만료일'
                  }}:
                  {{ formatDate(auth.subscription.expiresAt) }}
                </span>
              </div>
            </div>

            <div
              v-if="auth.isCanceledSubscription"
              class="flex items-start gap-2 p-3 rounded-md bg-warning/10 border border-warning/20"
            >
              <UIcon
                name="i-heroicons-exclamation-triangle"
                class="w-5 h-5 text-warning flex-shrink-0 mt-0.5"
              />
              <div class="text-sm text-neutral-700 dark:text-neutral-300">
                <p class="font-medium">구독 취소가 예약되었습니다</p>
                <p class="text-xs mt-1">
                  {{ formatDate(auth.subscription.expiresAt) }}까지 서비스를
                  이용할 수 있습니다.
                </p>
              </div>
            </div>

            <div
              v-if="
                !auth.subscription.autoRenewal && !auth.isCanceledSubscription
              "
              class="flex items-start gap-2 p-3 rounded-md bg-info/10 border border-info/20"
            >
              <UIcon
                name="i-heroicons-information-circle"
                class="w-5 h-5 text-info flex-shrink-0 mt-0.5"
              />
              <div class="text-sm text-neutral-700 dark:text-neutral-300">
                <p>자동 갱신이 비활성화되어 있습니다.</p>
              </div>
            </div>

            <!-- 구독 관리 버튼 -->
            <div
              v-if="auth.subscription.plan.name !== 'FREE'"
              class="flex gap-2 pt-2"
            >
              <!-- 재활성화 버튼 (취소된 구독만) -->
              <UButton
                v-if="auth.isCanceledSubscription"
                color="primary"
                variant="outline"
                size="sm"
                block
                :loading="isReactivating"
                @click="handleReactivateSubscription"
              >
                구독 재활성화
              </UButton>

              <!-- 취소 버튼 (활성 구독만) -->
              <UButton
                v-else
                color="error"
                variant="outline"
                size="sm"
                block
                @click="isCancelModalOpen = true"
              >
                구독 취소
              </UButton>
            </div>
          </div>

          <!-- 무료 플랜 안내 -->
          <div v-else class="p-4 rounded-lg bg-neutral-50 dark:bg-neutral-900">
            <div class="flex items-center gap-3">
              <UIcon
                name="i-heroicons-information-circle"
                class="w-6 h-6 text-info"
              />
              <div>
                <p class="font-medium">활성 구독이 없습니다</p>
                <p class="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                  플랜을 선택하여 더 많은 기능을 이용하세요.
                </p>
              </div>
            </div>
          </div>
        </div>
      </UCard>

      <!-- BloC 정보 -->
      <UCard>
        <template #header>
          <div class="flex items-center gap-3">
            <div
              class="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10"
            >
              <UIcon name="i-heroicons-star" class="text-primary" :size="24" />
            </div>
            <h3 class="text-lg font-semibold">BloC 잔액</h3>
          </div>
        </template>

        <div v-if="creditBalance" class="space-y-4">
          <!-- 총 BloC (강조) -->
          <div
            class="p-6 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary/30 shadow-sm"
          >
            <div class="flex items-center gap-3">
              <div
                class="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/20"
              >
                <UIcon
                  name="i-heroicons-star-solid"
                  class="text-primary"
                  :size="24"
                />
              </div>
              <div>
                <div class="text-sm font-medium text-primary/80">총 BloC</div>
                <div class="text-3xl font-bold text-primary mt-1">
                  {{ creditBalance.totalCredits.toLocaleString() }}
                </div>
              </div>
            </div>
          </div>

          <!-- BloC 구성 내역 -->
          <div class="space-y-2">
            <div
              class="flex items-center justify-between p-3 rounded-lg bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800"
            >
              <div class="flex items-center gap-2">
                <div
                  class="flex items-center justify-center w-8 h-8 rounded-lg bg-success/10"
                >
                  <UIcon
                    name="i-heroicons-gift"
                    class="text-success"
                    :size="18"
                  />
                </div>
                <span class="text-sm text-neutral-600 dark:text-neutral-400">
                  구독 BloC
                </span>
              </div>
              <div class="text-lg font-semibold">
                {{ creditBalance.subscriptionCredits.toLocaleString() }}
              </div>
            </div>

            <div
              class="flex items-center justify-between p-3 rounded-lg bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800"
            >
              <div class="flex items-center gap-2">
                <div
                  class="flex items-center justify-center w-8 h-8 rounded-lg bg-info/10"
                >
                  <UIcon
                    name="i-heroicons-credit-card"
                    class="text-info"
                    :size="18"
                  />
                </div>
                <span class="text-sm text-neutral-600 dark:text-neutral-400">
                  구매 BloC
                </span>
              </div>
              <div class="text-lg font-semibold">
                {{ creditBalance.purchasedCredits.toLocaleString() }}
              </div>
            </div>

            <div
              class="flex items-center justify-between p-3 rounded-lg bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800"
            >
              <div class="flex items-center gap-2">
                <div
                  class="flex items-center justify-center w-8 h-8 rounded-lg bg-warning/10"
                >
                  <UIcon
                    name="i-heroicons-sparkles"
                    class="text-warning"
                    :size="18"
                  />
                </div>
                <span class="text-sm text-neutral-600 dark:text-neutral-400">
                  보너스 BloC
                </span>
              </div>
              <div class="text-lg font-semibold">
                {{ creditBalance.bonusCredits.toLocaleString() }}
              </div>
            </div>
          </div>

          <!-- 마지막 사용 시간 -->
          <div
            v-if="creditBalance.lastUsedAt"
            class="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400 pt-2 border-t border-neutral-200 dark:border-neutral-800"
          >
            <UIcon name="i-heroicons-clock" class="w-4 h-4" />
            <span>마지막 사용: {{ formatDate(creditBalance.lastUsedAt) }}</span>
          </div>
        </div>
      </UCard>
    </div>

    <!-- 사업자 정보 -->
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div
              class="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10"
            >
              <UIcon
                name="i-heroicons-building-office"
                class="text-primary"
                :size="24"
              />
            </div>
            <div>
              <h3 class="text-lg font-semibold">사업자 정보</h3>
              <p class="text-sm text-neutral-600 dark:text-neutral-400 mt-0.5">
                세금계산서 발행을 위한 정보
              </p>
            </div>
          </div>
          <UModal
            v-model:open="isBusinessModalOpen"
            title="사업자 정보 수정"
            description="세금계산서 발행을 위한 사업자 정보를 입력하세요."
          >
            <UButton
              size="sm"
              variant="soft"
              icon="i-heroicons-pencil"
              @click="openBusinessModal"
            >
              수정
            </UButton>
            <template #body>
              <UForm :state="businessForm" @submit="handleSaveBusinessInfo">
                <div class="space-y-4 p-6">
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <UFormField label="상호명" name="businessName">
                      <UInput
                        v-model="businessForm.businessName"
                        placeholder="예: (주)홍길동"
                        icon="i-heroicons-building-office"
                        size="lg"
                      />
                    </UFormField>

                    <UFormField label="사업자등록번호" name="businessNumber">
                      <UInput
                        v-model="businessForm.businessNumber"
                        placeholder="예: 123-45-67890"
                        icon="i-heroicons-identification"
                        size="lg"
                      />
                    </UFormField>
                  </div>

                  <UFormField label="대표자명" name="businessOwner">
                    <UInput
                      v-model="businessForm.businessOwner"
                      placeholder="예: 홍길동"
                      icon="i-heroicons-user-circle"
                      size="lg"
                    />
                  </UFormField>

                  <UFormField label="사업장 주소" name="businessAddress">
                    <UInput
                      v-model="businessForm.businessAddress"
                      placeholder="예: 서울특별시 강남구 테헤란로 123"
                      icon="i-heroicons-map-pin"
                      size="lg"
                    />
                  </UFormField>

                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <UFormField label="업태" name="businessType">
                      <UInput
                        v-model="businessForm.businessType"
                        placeholder="예: 서비스업"
                        icon="i-heroicons-briefcase"
                        size="lg"
                      />
                    </UFormField>

                    <UFormField label="종목" name="businessCategory">
                      <UInput
                        v-model="businessForm.businessCategory"
                        placeholder="예: 소프트웨어 개발"
                        icon="i-heroicons-tag"
                        size="lg"
                      />
                    </UFormField>
                  </div>

                  <div class="flex justify-end gap-3 pt-4">
                    <UButton
                      variant="outline"
                      color="neutral"
                      size="md"
                      @click="isBusinessModalOpen = false"
                    >
                      취소
                    </UButton>
                    <UButton
                      type="submit"
                      color="primary"
                      size="md"
                      icon="i-heroicons-check"
                      :loading="isBusinessSaving"
                      :disabled="isBusinessSaving"
                    >
                      저장
                    </UButton>
                  </div>
                </div>
              </UForm>
            </template>
          </UModal>
        </div>
      </template>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          class="flex flex-col gap-1.5 p-4 rounded-lg bg-neutral-50 dark:bg-neutral-900"
        >
          <div
            class="flex items-center gap-2 text-xs font-medium text-neutral-500 dark:text-neutral-400"
          >
            <UIcon name="i-heroicons-building-office" class="w-3.5 h-3.5" />
            <span>상호명</span>
          </div>
          <div class="text-base font-medium">
            {{ user.businessInfo?.businessName || '미등록' }}
          </div>
        </div>

        <div
          class="flex flex-col gap-1.5 p-4 rounded-lg bg-neutral-50 dark:bg-neutral-900"
        >
          <div
            class="flex items-center gap-2 text-xs font-medium text-neutral-500 dark:text-neutral-400"
          >
            <UIcon name="i-heroicons-identification" class="w-3.5 h-3.5" />
            <span>사업자등록번호</span>
          </div>
          <div class="text-base font-medium">
            {{ user.businessInfo?.businessNumber || '미등록' }}
          </div>
        </div>

        <div
          class="flex flex-col gap-1.5 p-4 rounded-lg bg-neutral-50 dark:bg-neutral-900"
        >
          <div
            class="flex items-center gap-2 text-xs font-medium text-neutral-500 dark:text-neutral-400"
          >
            <UIcon name="i-heroicons-user-circle" class="w-3.5 h-3.5" />
            <span>대표자명</span>
          </div>
          <div class="text-base font-medium">
            {{ user.businessInfo?.businessOwner || '미등록' }}
          </div>
        </div>

        <div
          class="flex flex-col gap-1.5 p-4 rounded-lg bg-neutral-50 dark:bg-neutral-900"
        >
          <div
            class="flex items-center gap-2 text-xs font-medium text-neutral-500 dark:text-neutral-400"
          >
            <UIcon name="i-heroicons-briefcase" class="w-3.5 h-3.5" />
            <span>업태</span>
          </div>
          <div class="text-base font-medium">
            {{ user.businessInfo?.businessType || '미등록' }}
          </div>
        </div>

        <div
          class="flex flex-col gap-1.5 p-4 rounded-lg bg-neutral-50 dark:bg-neutral-900"
        >
          <div
            class="flex items-center gap-2 text-xs font-medium text-neutral-500 dark:text-neutral-400"
          >
            <UIcon name="i-heroicons-tag" class="w-3.5 h-3.5" />
            <span>종목</span>
          </div>
          <div class="text-base font-medium">
            {{ user.businessInfo?.businessCategory || '미등록' }}
          </div>
        </div>

        <div
          class="flex flex-col gap-1.5 p-4 rounded-lg bg-neutral-50 dark:bg-neutral-900 md:col-span-2"
        >
          <div
            class="flex items-center gap-2 text-xs font-medium text-neutral-500 dark:text-neutral-400"
          >
            <UIcon name="i-heroicons-map-pin" class="w-3.5 h-3.5" />
            <span>사업장 주소</span>
          </div>
          <div class="text-base font-medium">
            {{ user.businessInfo?.businessAddress || '미등록' }}
          </div>
        </div>
      </div>
    </UCard>

    <!-- 회원 탈퇴 -->
    <UCard>
      <template #header>
        <div class="flex items-center gap-3">
          <div
            class="flex items-center justify-center w-10 h-10 rounded-full bg-error/10"
          >
            <UIcon
              name="i-heroicons-exclamation-triangle"
              class="text-error"
              :size="24"
            />
          </div>
          <h3 class="text-lg font-semibold text-error">위험 영역</h3>
        </div>
      </template>

      <div
        class="p-5 rounded-lg border-2 border-error/20 bg-error/5 dark:bg-error/10"
      >
        <div class="flex items-start gap-4">
          <div class="shrink-0">
            <div
              class="flex items-center justify-center w-12 h-12 rounded-full bg-error/20"
            >
              <UIcon
                name="i-heroicons-user-minus"
                class="text-error"
                :size="24"
              />
            </div>
          </div>
          <div class="flex-1 space-y-3">
            <h4 class="font-semibold text-base">회원 탈퇴</h4>
            <div
              class="text-sm text-neutral-600 dark:text-neutral-300 space-y-2"
            >
              <p>
                회원 탈퇴 시 계정의 모든 개인 정보는 모두 익명 처리 되며, 복구가
                불가능합니다.
              </p>
              <p>
                탈퇴 후에도 동일한 이메일(ID)로 재가입이 불가하며, 이전 데이터는
                복원되지 않습니다.
              </p>
              <p
                class="font-medium text-neutral-900 dark:text-neutral-100 pt-1"
              >
                계속 탈퇴를 진행하실 경우, 아래 버튼을 눌러주세요.
              </p>
            </div>
            <div class="pt-2">
              <UButton
                color="error"
                icon="i-heroicons-trash"
                @click="openDeleteModal"
              >
                회원 탈퇴하기
              </UButton>
            </div>
          </div>
        </div>
      </div>
    </UCard>

    <!-- 프로필 수정 모달 -->
    <UModal
      v-model:open="isProfileModalOpen"
      title="프로필 수정"
      description="이름과 이메일을 수정할 수 있습니다."
    >
      <template #body>
        <UForm :state="profileForm" @submit="handleSaveProfile">
          <div class="space-y-4 p-6">
            <UFormField label="이름" name="name" required>
              <UInput
                v-model="profileForm.name"
                placeholder="이름을 입력하세요"
                icon="i-heroicons-user"
                size="lg"
              />
            </UFormField>

            <UFormField label="이메일" name="email" required>
              <UInput
                v-model="profileForm.email"
                type="email"
                placeholder="이메일을 입력하세요"
                icon="i-heroicons-envelope"
                size="lg"
              />
            </UFormField>

            <div class="flex justify-end gap-3 pt-4">
              <UButton
                variant="outline"
                color="neutral"
                size="md"
                @click="isProfileModalOpen = false"
              >
                취소
              </UButton>
              <UButton
                type="submit"
                color="primary"
                size="md"
                icon="i-heroicons-check"
                :loading="isProfileSaving"
                :disabled="isProfileSaving"
              >
                저장
              </UButton>
            </div>
          </div>
        </UForm>
      </template>
    </UModal>

    <!-- 비밀번호 변경 모달 -->
    <UModal
      v-model:open="isPasswordModalOpen"
      title="비밀번호 변경"
      description="보안을 위해 현재 비밀번호를 먼저 입력해주세요."
    >
      <template #body>
        <UForm :state="passwordForm" @submit="handleChangePassword">
          <div class="space-y-4 p-6">
            <UFormField label="현재 비밀번호" name="currentPassword" required>
              <UInput
                v-model="passwordForm.currentPassword"
                type="password"
                placeholder="현재 비밀번호를 입력하세요"
                icon="i-heroicons-lock-closed"
                size="lg"
              />
            </UFormField>

            <UFormField label="새 비밀번호" name="newPassword" required>
              <UInput
                v-model="passwordForm.newPassword"
                type="password"
                placeholder="새 비밀번호를 입력하세요"
                icon="i-heroicons-key"
                size="lg"
              />
            </UFormField>

            <UFormField
              label="새 비밀번호 확인"
              name="confirmPassword"
              required
            >
              <UInput
                v-model="passwordForm.confirmPassword"
                type="password"
                placeholder="새 비밀번호를 다시 입력하세요"
                icon="i-heroicons-key"
                size="lg"
              />
            </UFormField>

            <div class="flex justify-end gap-3 pt-4">
              <UButton
                variant="outline"
                color="neutral"
                size="md"
                @click="isPasswordModalOpen = false"
              >
                취소
              </UButton>
              <UButton
                type="submit"
                color="primary"
                size="md"
                icon="i-heroicons-arrow-path"
                :loading="isPasswordSaving"
                :disabled="isPasswordSaving"
              >
                변경
              </UButton>
            </div>
          </div>
        </UForm>
      </template>
    </UModal>

    <!-- 사업자 정보 수정 모달 -->

    <!-- 회원 탈퇴 확인 모달 -->
    <UModal
      v-model:open="isDeleteModalOpen"
      title="회원 탈퇴 확인"
      description="정말로 탈퇴하시겠습니까? 이 작업은 되돌릴 수 없습니다."
    >
      <template #body>
        <div class="space-y-5 p-6">
          <div class="p-4 rounded-lg bg-error/10 border border-error/20">
            <div class="flex items-start gap-3">
              <div class="shrink-0">
                <UIcon
                  name="i-heroicons-exclamation-triangle"
                  class="w-6 h-6 text-error"
                />
              </div>
              <div
                class="space-y-2 text-sm text-neutral-700 dark:text-neutral-300"
              >
                <p class="font-semibold">경고: 이 작업은 되돌릴 수 없습니다</p>
                <ul class="list-disc list-inside space-y-1 pl-1">
                  <li>모든 개인 정보가 영구적으로 삭제됩니다</li>
                  <li>생성된 블로그 원고가 모두 삭제됩니다</li>
                  <li>동일한 이메일로 재가입이 불가능합니다</li>
                  <li>이전 데이터는 복원되지 않습니다</li>
                </ul>
              </div>
            </div>
          </div>

          <div class="space-y-3">
            <div class="space-y-1.5">
              <label class="text-sm font-medium">
                계속하시려면
                <span class="text-error font-semibold">
                  "{{ REQUIRED_DELETE_TEXT }}"
                </span>
                를 입력하세요
              </label>
              <UInput
                v-model="deleteConfirmText"
                placeholder="회원 탈퇴"
                size="lg"
                :disabled="isDeleting"
              />
            </div>
            <p class="text-xs text-neutral-500 dark:text-neutral-400">
              정확히 입력해야 탈퇴가 진행됩니다.
            </p>
          </div>

          <div class="flex justify-end gap-3 pt-2">
            <UButton
              variant="outline"
              color="neutral"
              size="md"
              :disabled="isDeleting"
              @click="isDeleteModalOpen = false"
            >
              취소
            </UButton>
            <UButton
              color="error"
              size="md"
              icon="i-heroicons-trash"
              :loading="isDeleting"
              :disabled="!isDeleteConfirmValid || isDeleting"
              @click="handleDeleteAccount"
            >
              회원 탈퇴하기
            </UButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- 구독 취소 확인 모달 -->
    <UModal v-model:open="isCancelModalOpen" title="구독 취소 확인">
      <template #body>
        <div class="space-y-4">
          <div class="flex items-start gap-3">
            <div
              class="flex items-center justify-center w-12 h-12 rounded-full bg-warning/10"
            >
              <UIcon
                name="i-heroicons-exclamation-triangle"
                class="w-6 h-6 text-warning"
              />
            </div>
            <div class="flex-1">
              <h3 class="text-lg font-semibold">구독을 취소하시겠습니까?</h3>
              <p class="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                구독을 취소하면
                {{
                  auth.subscription
                    ? formatDate(auth.subscription.expiresAt)
                    : ''
                }}까지 계속 이용하실 수 있으며, 이후 자동 갱신되지 않습니다.
              </p>
            </div>
          </div>

          <!-- 취소 사유 입력 (선택) -->
          <div class="space-y-2">
            <label class="text-sm font-medium">취소 사유 (선택)</label>
            <UTextarea
              v-model="cancelReason"
              placeholder="취소 사유를 입력해주세요. (선택사항)"
              :rows="3"
            />
            <p class="text-xs text-neutral-500 dark:text-neutral-400">
              서비스 개선을 위해 취소 사유를 알려주시면 감사하겠습니다.
            </p>
          </div>

          <!-- 버튼 -->
          <div class="flex gap-2 justify-end pt-2">
            <UButton
              color="neutral"
              variant="outline"
              @click="isCancelModalOpen = false"
            >
              돌아가기
            </UButton>
            <UButton
              color="error"
              :loading="isCanceling"
              @click="handleCancelSubscription"
            >
              구독 취소
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </section>
</template>
