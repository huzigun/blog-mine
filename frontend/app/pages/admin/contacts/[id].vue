<script setup lang="ts">
import { useAdminApiFetch, useAdminApi } from '~/composables/useAdminApi';

interface Contact {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  category: string;
  status: string;
  adminNote: string | null;
  respondedAt: string | null;
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

// 권한 체크
if (!hasMinRole('SUPPORT')) {
  throw createError({
    statusCode: 403,
    statusMessage: '접근 권한이 없습니다.',
  });
}

const contactId = computed(() => Number(route.params.id));

const {
  data: contact,
  status,
  refresh,
} = await useAdminApiFetch<Contact>(`/admin/contacts/${contactId.value}`);

if (!contact.value) {
  throw createError({
    statusCode: 404,
    statusMessage: '문의를 찾을 수 없습니다.',
  });
}

const isLoading = computed(() => status.value === 'pending');

// 상태 변경 관련
const isUpdatingStatus = ref(false);
const newStatus = ref(contact.value?.status || 'PENDING');

// 답변 관련
const isResponding = ref(false);
const adminNote = ref(contact.value?.adminNote || '');

// 삭제 관련
const isDeleting = ref(false);
const showDeleteConfirm = ref(false);

// 날짜 포맷
const formatDate = (dateString: string | null) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

// 상태 뱃지 색상
const getStatusColor = (status: string) => {
  switch (status) {
    case 'RESOLVED':
      return 'success';
    case 'IN_PROGRESS':
      return 'info';
    case 'PENDING':
      return 'warning';
    case 'CLOSED':
      return 'neutral';
    default:
      return 'neutral';
  }
};

// 상태 라벨
const getStatusLabel = (status: string) => {
  switch (status) {
    case 'RESOLVED':
      return '해결됨';
    case 'IN_PROGRESS':
      return '처리중';
    case 'PENDING':
      return '대기중';
    case 'CLOSED':
      return '종료';
    default:
      return status;
  }
};

// 카테고리 라벨
const getCategoryLabel = (category: string) => {
  switch (category) {
    case 'GENERAL':
      return '일반';
    case 'TECHNICAL':
      return '기술';
    case 'BILLING':
      return '결제';
    case 'FEATURE':
      return '기능요청';
    case 'BUG':
      return '버그';
    case 'PARTNERSHIP':
      return '제휴';
    case 'OTHER':
      return '기타';
    default:
      return category;
  }
};

// 상태 변경 핸들러
const handleStatusChange = async () => {
  if (!hasMinRole('SUPPORT')) {
    toast.add({
      title: '권한 없음',
      description: '상태 변경 권한이 없습니다.',
      color: 'error',
    });
    return;
  }

  isUpdatingStatus.value = true;
  try {
    await useAdminApi(`/admin/contacts/${contactId.value}/status`, {
      method: 'PATCH',
      body: {
        status: newStatus.value,
      },
    });

    toast.add({
      title: '상태 변경 완료',
      description: '문의 상태가 변경되었습니다.',
      color: 'success',
    });

    await refresh();
  } catch (error: any) {
    toast.add({
      title: '상태 변경 실패',
      description: error.data?.message || '상태 변경에 실패했습니다.',
      color: 'error',
    });
  } finally {
    isUpdatingStatus.value = false;
  }
};

// 답변 저장 핸들러
const handleSaveResponse = async () => {
  if (!hasMinRole('SUPPORT')) {
    toast.add({
      title: '권한 없음',
      description: '답변 등록 권한이 없습니다.',
      color: 'error',
    });
    return;
  }

  if (!adminNote.value.trim()) {
    toast.add({
      title: '입력 오류',
      description: '답변 내용을 입력해주세요.',
      color: 'warning',
    });
    return;
  }

  isResponding.value = true;
  try {
    await useAdminApi(`/admin/contacts/${contactId.value}/respond`, {
      method: 'POST',
      body: {
        adminNote: adminNote.value,
      },
    });

    toast.add({
      title: '답변 등록 완료',
      description: '답변이 등록되었습니다.',
      color: 'success',
    });

    await refresh();
  } catch (error: any) {
    toast.add({
      title: '답변 등록 실패',
      description: error.data?.message || '답변 등록에 실패했습니다.',
      color: 'error',
    });
  } finally {
    isResponding.value = false;
  }
};

// 삭제 핸들러
const handleDelete = async () => {
  if (!hasMinRole('ADMIN')) {
    toast.add({
      title: '권한 없음',
      description: '삭제 권한이 없습니다.',
      color: 'error',
    });
    return;
  }

  isDeleting.value = true;
  try {
    await useAdminApi(`/admin/contacts/${contactId.value}`, {
      method: 'DELETE',
    });

    toast.add({
      title: '삭제 완료',
      description: '문의가 삭제되었습니다.',
      color: 'success',
    });

    navigateTo('/admin/contacts');
  } catch (error: any) {
    toast.add({
      title: '삭제 실패',
      description: error.data?.message || '삭제에 실패했습니다.',
      color: 'error',
    });
  } finally {
    isDeleting.value = false;
    showDeleteConfirm.value = false;
  }
};

// 상태 옵션
const statusOptions = [
  { label: '대기중', value: 'PENDING' },
  { label: '처리중', value: 'IN_PROGRESS' },
  { label: '해결됨', value: 'RESOLVED' },
  { label: '종료', value: 'CLOSED' },
];

// 데이터 업데이트 시 상태 동기화
watch(
  () => contact.value,
  (newContact) => {
    if (newContact) {
      newStatus.value = newContact.status;
      adminNote.value = newContact.adminNote || '';
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
          to="/admin/contacts"
        />
        <div>
          <h1 class="text-2xl font-bold text-neutral-900 dark:text-white">
            문의 상세
          </h1>
          <p class="mt-1 text-sm text-neutral-500">#{{ contact?.id }}</p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <UBadge v-if="contact" :color="getStatusColor(contact.status)" size="lg">
          {{ getStatusLabel(contact.status) }}
        </UBadge>
        <UButton
          v-if="hasMinRole('ADMIN')"
          color="error"
          variant="outline"
          icon="i-heroicons-trash"
          @click="showDeleteConfirm = true"
        >
          삭제
        </UButton>
      </div>
    </div>

    <div v-if="contact" class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- 좌측: 문의 정보 -->
      <div class="lg:col-span-1 space-y-6">
        <!-- 문의자 정보 -->
        <UCard>
          <template #header>
            <h3 class="font-semibold">문의자 정보</h3>
          </template>
          <dl class="space-y-4">
            <div>
              <dt class="text-sm text-neutral-500">이름</dt>
              <dd class="font-medium">{{ contact.name }}</dd>
            </div>
            <div>
              <dt class="text-sm text-neutral-500">이메일</dt>
              <dd>
                <a
                  :href="`mailto:${contact.email}`"
                  class="text-primary-600 hover:underline"
                >
                  {{ contact.email }}
                </a>
              </dd>
            </div>
            <div v-if="contact.phone">
              <dt class="text-sm text-neutral-500">연락처</dt>
              <dd>
                <a
                  :href="`tel:${contact.phone}`"
                  class="text-primary-600 hover:underline"
                >
                  {{ contact.phone }}
                </a>
              </dd>
            </div>
          </dl>
        </UCard>

        <!-- 문의 분류 -->
        <UCard>
          <template #header>
            <h3 class="font-semibold">문의 분류</h3>
          </template>
          <dl class="space-y-4">
            <div>
              <dt class="text-sm text-neutral-500">카테고리</dt>
              <dd>
                <UBadge color="neutral" variant="subtle">
                  {{ getCategoryLabel(contact.category) }}
                </UBadge>
              </dd>
            </div>
            <div>
              <dt class="text-sm text-neutral-500">현재 상태</dt>
              <dd>
                <UBadge :color="getStatusColor(contact.status)">
                  {{ getStatusLabel(contact.status) }}
                </UBadge>
              </dd>
            </div>
          </dl>
        </UCard>

        <!-- 처리 일시 -->
        <UCard>
          <template #header>
            <h3 class="font-semibold">처리 일시</h3>
          </template>
          <dl class="space-y-2 text-sm">
            <div class="flex justify-between">
              <dt class="text-neutral-500">접수일</dt>
              <dd>{{ formatDate(contact.createdAt) }}</dd>
            </div>
            <div v-if="contact.respondedAt" class="flex justify-between">
              <dt class="text-neutral-500">답변일</dt>
              <dd>{{ formatDate(contact.respondedAt) }}</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-neutral-500">수정일</dt>
              <dd>{{ formatDate(contact.updatedAt) }}</dd>
            </div>
          </dl>
        </UCard>

        <!-- 상태 변경 -->
        <UCard v-if="hasMinRole('SUPPORT')">
          <template #header>
            <h3 class="font-semibold">상태 변경</h3>
          </template>
          <div class="space-y-4">
            <USelect
              v-model="newStatus"
              :items="statusOptions"
              placeholder="상태 선택"
            />
            <UButton
              color="primary"
              block
              :loading="isUpdatingStatus"
              :disabled="newStatus === contact.status"
              @click="handleStatusChange"
            >
              상태 변경
            </UButton>
          </div>
        </UCard>
      </div>

      <!-- 우측: 문의 내용 및 답변 -->
      <div class="lg:col-span-2 space-y-6">
        <!-- 문의 내용 -->
        <UCard>
          <template #header>
            <h3 class="font-semibold">문의 내용</h3>
          </template>
          <div class="space-y-4">
            <div>
              <h4 class="font-medium text-lg mb-2">{{ contact.subject }}</h4>
            </div>
            <div
              class="bg-neutral-50 dark:bg-neutral-800/50 rounded-lg p-4 max-h-[400px] overflow-y-auto"
            >
              <pre
                class="whitespace-pre-wrap wrap-break-word font-sans leading-relaxed text-neutral-700 dark:text-neutral-300"
              >{{ contact.message }}</pre>
            </div>
          </div>
        </UCard>

        <!-- 관리자 답변 -->
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="font-semibold">관리자 답변</h3>
              <span
                v-if="contact.respondedAt"
                class="text-sm text-neutral-500"
              >
                {{ formatDate(contact.respondedAt) }}
              </span>
            </div>
          </template>
          <div class="space-y-4">
            <UTextarea
              v-model="adminNote"
              placeholder="답변 내용을 입력하세요..."
              :rows="6"
              :disabled="!hasMinRole('SUPPORT')"
            />
            <div class="flex justify-end">
              <UButton
                v-if="hasMinRole('SUPPORT')"
                color="primary"
                :loading="isResponding"
                :disabled="!adminNote.trim()"
                @click="handleSaveResponse"
              >
                {{ contact.adminNote ? '답변 수정' : '답변 등록' }}
              </UButton>
            </div>
          </div>
        </UCard>
      </div>
    </div>

    <!-- 삭제 확인 모달 -->
    <UModal v-model:open="showDeleteConfirm">
      <template #content>
        <UCard>
          <template #header>
            <div class="flex items-center gap-3">
              <UIcon
                name="i-heroicons-exclamation-triangle"
                class="w-6 h-6 text-error-500"
              />
              <h3 class="text-lg font-semibold">문의 삭제</h3>
            </div>
          </template>
          <p class="text-neutral-600 dark:text-neutral-400">
            이 문의를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
          </p>
          <template #footer>
            <div class="flex justify-end gap-3">
              <UButton
                color="neutral"
                variant="outline"
                @click="showDeleteConfirm = false"
              >
                취소
              </UButton>
              <UButton
                color="error"
                :loading="isDeleting"
                @click="handleDelete"
              >
                삭제
              </UButton>
            </div>
          </template>
        </UCard>
      </template>
    </UModal>
  </div>
</template>
