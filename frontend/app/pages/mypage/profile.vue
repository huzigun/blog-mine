<script lang="ts" setup>
import type { FormSubmitEvent } from '#ui/types';

definePageMeta({
  middleware: 'auth',
});

const toast = useToast();

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
}

// 사용자 정보 조회
const { data: userData, refresh: refreshUser } = await useApiFetch<UserResponse>('/user/me');

const user = computed(() => ({
  id: userData.value?.id || 0,
  email: userData.value?.email || '',
  name: userData.value?.name || '',
  createdAt: userData.value?.createdAt || '',
  businessInfo: userData.value?.businessInfo || null,
}));

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
    // TODO: API 호출
    await new Promise((resolve) => setTimeout(resolve, 1000));
    toast.add({
      title: '성공',
      description: '비밀번호가 변경되었습니다.',
      color: 'success',
    });
    isPasswordModalOpen.value = false;
  } catch (error) {
    toast.add({
      title: '오류',
      description: '비밀번호 변경에 실패했습니다.',
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

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
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
              <div class="i-heroicons-user-circle text-primary text-2xl" />
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
        <div class="flex flex-col gap-1.5 p-4 rounded-lg bg-neutral-50 dark:bg-neutral-900">
          <div class="flex items-center gap-2 text-xs font-medium text-neutral-500 dark:text-neutral-400">
            <div class="i-heroicons-user text-sm" />
            <span>이름</span>
          </div>
          <div class="text-base font-medium">{{ user.name }}</div>
        </div>

        <div class="flex flex-col gap-1.5 p-4 rounded-lg bg-neutral-50 dark:bg-neutral-900">
          <div class="flex items-center gap-2 text-xs font-medium text-neutral-500 dark:text-neutral-400">
            <div class="i-heroicons-envelope text-sm" />
            <span>이메일</span>
          </div>
          <div class="text-base font-medium">{{ user.email }}</div>
        </div>

        <div class="flex flex-col gap-1.5 p-4 rounded-lg bg-neutral-50 dark:bg-neutral-900 md:col-span-2">
          <div class="flex items-center gap-2 text-xs font-medium text-neutral-500 dark:text-neutral-400">
            <div class="i-heroicons-calendar text-sm" />
            <span>가입일</span>
          </div>
          <div class="text-base font-medium">{{ formatDate(user.createdAt) }}</div>
        </div>
      </div>
    </UCard>

    <!-- 사업자 정보 -->
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div
              class="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10"
            >
              <div class="i-heroicons-building-office text-primary text-2xl" />
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
        <div class="flex flex-col gap-1.5 p-4 rounded-lg bg-neutral-50 dark:bg-neutral-900">
          <div class="flex items-center gap-2 text-xs font-medium text-neutral-500 dark:text-neutral-400">
            <div class="i-heroicons-building-office text-sm" />
            <span>상호명</span>
          </div>
          <div class="text-base font-medium">
            {{ user.businessInfo?.businessName || '미등록' }}
          </div>
        </div>

        <div class="flex flex-col gap-1.5 p-4 rounded-lg bg-neutral-50 dark:bg-neutral-900">
          <div class="flex items-center gap-2 text-xs font-medium text-neutral-500 dark:text-neutral-400">
            <div class="i-heroicons-identification text-sm" />
            <span>사업자등록번호</span>
          </div>
          <div class="text-base font-medium">
            {{ user.businessInfo?.businessNumber || '미등록' }}
          </div>
        </div>

        <div class="flex flex-col gap-1.5 p-4 rounded-lg bg-neutral-50 dark:bg-neutral-900">
          <div class="flex items-center gap-2 text-xs font-medium text-neutral-500 dark:text-neutral-400">
            <div class="i-heroicons-user-circle text-sm" />
            <span>대표자명</span>
          </div>
          <div class="text-base font-medium">
            {{ user.businessInfo?.businessOwner || '미등록' }}
          </div>
        </div>

        <div class="flex flex-col gap-1.5 p-4 rounded-lg bg-neutral-50 dark:bg-neutral-900">
          <div class="flex items-center gap-2 text-xs font-medium text-neutral-500 dark:text-neutral-400">
            <div class="i-heroicons-briefcase text-sm" />
            <span>업태</span>
          </div>
          <div class="text-base font-medium">
            {{ user.businessInfo?.businessType || '미등록' }}
          </div>
        </div>

        <div class="flex flex-col gap-1.5 p-4 rounded-lg bg-neutral-50 dark:bg-neutral-900">
          <div class="flex items-center gap-2 text-xs font-medium text-neutral-500 dark:text-neutral-400">
            <div class="i-heroicons-tag text-sm" />
            <span>종목</span>
          </div>
          <div class="text-base font-medium">
            {{ user.businessInfo?.businessCategory || '미등록' }}
          </div>
        </div>

        <div class="flex flex-col gap-1.5 p-4 rounded-lg bg-neutral-50 dark:bg-neutral-900 md:col-span-2">
          <div class="flex items-center gap-2 text-xs font-medium text-neutral-500 dark:text-neutral-400">
            <div class="i-heroicons-map-pin text-sm" />
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
            <div class="i-heroicons-exclamation-triangle text-error text-2xl" />
          </div>
          <h3 class="text-lg font-semibold text-error">위험 영역</h3>
        </div>
      </template>

      <div class="p-5 rounded-lg border-2 border-error/20 bg-error/5 dark:bg-error/10">
        <div class="flex items-start gap-4">
          <div class="flex-shrink-0">
            <div class="flex items-center justify-center w-12 h-12 rounded-full bg-error/20">
              <div class="i-heroicons-user-minus text-error text-2xl" />
            </div>
          </div>
          <div class="flex-1 space-y-3">
            <h4 class="font-semibold text-base">회원 탈퇴</h4>
            <div class="text-sm text-neutral-600 dark:text-neutral-300 space-y-2">
              <p>
                회원 탈퇴 시 계정의 모든 개인 정보는 모두 익명 처리 되며, 복구가 불가능합니다.
              </p>
              <p>
                탈퇴 후에도 동일한 이메일(ID)로 재가입이 불가하며, 이전 데이터는 복원되지 않습니다.
              </p>
              <p class="font-medium text-neutral-900 dark:text-neutral-100 pt-1">
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

            <UFormField label="새 비밀번호 확인" name="confirmPassword" required>
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
              <div class="flex-shrink-0">
                <div class="i-heroicons-exclamation-triangle text-error text-2xl" />
              </div>
              <div class="space-y-2 text-sm text-neutral-700 dark:text-neutral-300">
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
                계속하시려면 <span class="text-error font-semibold">"{{ REQUIRED_DELETE_TEXT }}"</span>를 입력하세요
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
  </section>
</template>
