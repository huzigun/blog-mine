<script setup lang="ts">
import { useAdminApiFetch, useAdminApi } from '~/composables/useAdminApi';
import { AdminAdminDeleteConfirmModal } from '#components';

interface AdminDetail {
  id: number;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  lastLoginAt: string | null;
  lastLoginIp: string | null;
  createdAt: string;
  updatedAt: string;
  activityLogsCount: number;
}

interface ActivityLog {
  id: number;
  action: string;
  targetType: string | null;
  targetId: number | null;
  details: Record<string, any> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

definePageMeta({
  layout: 'admin',
  middleware: ['admin'],
});

const { hasMinRole, adminUser: currentAdmin } = useAdminAuth();
const route = useRoute();
const toast = useToast();
const overlay = useOverlay();

// SUPER_ADMIN 권한 체크
if (!hasMinRole('SUPER_ADMIN')) {
  throw createError({
    statusCode: 403,
    statusMessage: '최고 관리자만 접근할 수 있습니다.',
  });
}

const adminId = computed(() => Number(route.params.id));

const {
  data: admin,
  status,
  refresh,
} = await useAdminApiFetch<AdminDetail>(`/admin/admins/${adminId.value}`);

if (!admin.value) {
  throw createError({
    statusCode: 404,
    statusMessage: '관리자를 찾을 수 없습니다.',
  });
}

const isLoading = computed(() => status.value === 'pending');

// 수정 폼
const editForm = ref({
  name: admin.value?.name || '',
  role: admin.value?.role || 'ADMIN',
  isActive: admin.value?.isActive ?? true,
});

// 비밀번호 재설정
const newPassword = ref('');
const showPasswordReset = ref(false);

// 삭제 확인 모달 (useOverlay)
const deleteModal = overlay.create(AdminAdminDeleteConfirmModal);

// 활동 로그
const activityPage = ref(1);
const { data: activityData } = await useAdminApiFetch<{
  data: ActivityLog[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}>(`/admin/admins/${adminId.value}/activity-logs`, {
  query: computed(() => ({ page: activityPage.value, limit: 10 })),
  watch: [activityPage],
});

const activityLogs = computed(() => activityData.value?.data || []);
const activityMeta = computed(() => activityData.value?.meta);

// 역할 라벨
const getRoleLabel = (role: string) => {
  switch (role) {
    case 'SUPER_ADMIN':
      return '최고 관리자';
    case 'ADMIN':
      return '관리자';
    case 'SUPPORT':
      return '고객지원';
    case 'VIEWER':
      return '조회 전용';
    default:
      return role;
  }
};

// 역할 뱃지 색상
const getRoleColor = (role: string) => {
  switch (role) {
    case 'SUPER_ADMIN':
      return 'error';
    case 'ADMIN':
      return 'warning';
    case 'SUPPORT':
      return 'info';
    case 'VIEWER':
      return 'neutral';
    default:
      return 'neutral';
  }
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
    second: '2-digit',
  });
};

// 역할 옵션
const roleOptions = [
  { label: '최고 관리자', value: 'SUPER_ADMIN' },
  { label: '관리자', value: 'ADMIN' },
  { label: '고객지원', value: 'SUPPORT' },
  { label: '조회 전용', value: 'VIEWER' },
];

// 정보 수정
const isUpdating = ref(false);
const handleUpdate = async () => {
  isUpdating.value = true;
  try {
    await useAdminApi(`/admin/admins/${adminId.value}`, {
      method: 'PATCH',
      body: editForm.value,
    });

    toast.add({
      title: '수정 완료',
      description: '관리자 정보가 수정되었습니다.',
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

// 비밀번호 재설정
const isResettingPassword = ref(false);
const handleResetPassword = async () => {
  if (!newPassword.value || newPassword.value.length < 6) {
    toast.add({
      title: '입력 오류',
      description: '비밀번호는 6자 이상이어야 합니다.',
      color: 'warning',
    });
    return;
  }

  isResettingPassword.value = true;
  try {
    await useAdminApi(`/admin/admins/${adminId.value}/reset-password`, {
      method: 'POST',
      body: { newPassword: newPassword.value },
    });

    toast.add({
      title: '비밀번호 재설정 완료',
      description: '비밀번호가 변경되었습니다.',
      color: 'success',
    });

    newPassword.value = '';
    showPasswordReset.value = false;
  } catch (error: any) {
    toast.add({
      title: '비밀번호 재설정 실패',
      description: error.data?.message || '비밀번호 재설정에 실패했습니다.',
      color: 'error',
    });
  } finally {
    isResettingPassword.value = false;
  }
};

// 삭제 모달 열기
const openDeleteModal = async () => {
  if (!admin.value) return;

  const instance = deleteModal.open({
    adminId: admin.value.id,
    adminName: admin.value.name,
    adminEmail: admin.value.email,
  });

  const result = (await instance.result) as boolean;

  if (result) {
    navigateTo('/admin/admins');
  }
};

// 자기 자신인지 확인
const isSelf = computed(() => currentAdmin.value?.id === adminId.value);

// 데이터 업데이트 시 폼 동기화
watch(
  () => admin.value,
  (newAdmin) => {
    if (newAdmin) {
      editForm.value = {
        name: newAdmin.name,
        role: newAdmin.role,
        isActive: newAdmin.isActive,
      };
    }
  },
);

// 활동 로그 액션 라벨
const getActionLabel = (action: string) => {
  const labels: Record<string, string> = {
    'auth.login': '로그인',
    'auth.logout': '로그아웃',
    'admin.create': '관리자 생성',
    'admin.update': '관리자 수정',
    'admin.delete': '관리자 삭제',
    'admin.reset_password': '비밀번호 재설정',
    'user.update': '회원 수정',
    'subscription.update': '구독 수정',
    'payment.refund': '결제 환불',
  };
  return labels[action] || action;
};
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
          to="/admin/admins"
        />
        <div>
          <h1 class="text-2xl font-bold text-neutral-900 dark:text-white">
            관리자 상세
          </h1>
          <p class="mt-1 text-sm text-neutral-500">
            {{ admin?.email }}
            <span v-if="isSelf" class="text-primary-600">(나)</span>
          </p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <UBadge v-if="admin" :color="getRoleColor(admin.role)" size="lg">
          {{ getRoleLabel(admin.role) }}
        </UBadge>
        <UBadge
          v-if="admin"
          :color="admin.isActive ? 'success' : 'neutral'"
          size="lg"
        >
          {{ admin.isActive ? '활성' : '비활성' }}
        </UBadge>
        <UButton
          v-if="!isSelf"
          color="error"
          variant="outline"
          icon="i-heroicons-trash"
          @click="openDeleteModal"
        >
          삭제
        </UButton>
      </div>
    </div>

    <div v-if="admin" class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- 좌측: 관리자 정보 -->
      <div class="lg:col-span-1 space-y-6">
        <!-- 기본 정보 -->
        <UCard>
          <template #header>
            <h3 class="font-semibold">기본 정보</h3>
          </template>
          <dl class="space-y-4">
            <div>
              <dt class="text-sm text-neutral-500">ID</dt>
              <dd class="font-mono">#{{ admin.id }}</dd>
            </div>
            <div>
              <dt class="text-sm text-neutral-500">이메일</dt>
              <dd class="font-medium">{{ admin.email }}</dd>
            </div>
            <div>
              <dt class="text-sm text-neutral-500">활동 로그</dt>
              <dd>{{ admin.activityLogsCount.toLocaleString() }}건</dd>
            </div>
          </dl>
        </UCard>

        <!-- 로그인 정보 -->
        <UCard>
          <template #header>
            <h3 class="font-semibold">로그인 정보</h3>
          </template>
          <dl class="space-y-2 text-sm">
            <div class="flex justify-between">
              <dt class="text-neutral-500">마지막 로그인</dt>
              <dd>{{ formatDate(admin.lastLoginAt) }}</dd>
            </div>
            <div v-if="admin.lastLoginIp" class="flex justify-between">
              <dt class="text-neutral-500">마지막 IP</dt>
              <dd class="font-mono text-xs">{{ admin.lastLoginIp }}</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-neutral-500">생성일</dt>
              <dd>{{ formatDate(admin.createdAt) }}</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-neutral-500">수정일</dt>
              <dd>{{ formatDate(admin.updatedAt) }}</dd>
            </div>
          </dl>
        </UCard>

        <!-- 비밀번호 재설정 -->
        <UCard>
          <template #header>
            <h3 class="font-semibold">비밀번호 재설정</h3>
          </template>
          <div class="space-y-4">
            <UInput
              v-model="newPassword"
              type="password"
              placeholder="새 비밀번호 (6자 이상)"
            />
            <UButton
              color="warning"
              block
              :loading="isResettingPassword"
              :disabled="!newPassword || newPassword.length < 6"
              @click="handleResetPassword"
            >
              비밀번호 재설정
            </UButton>
          </div>
        </UCard>
      </div>

      <!-- 중앙: 정보 수정 -->
      <div class="lg:col-span-1">
        <UCard>
          <template #header>
            <h3 class="font-semibold">정보 수정</h3>
          </template>
          <div class="space-y-4">
            <UFormField label="이름">
              <UInput v-model="editForm.name" placeholder="관리자 이름" />
            </UFormField>

            <UFormField label="역할">
              <USelect
                v-model="editForm.role"
                :items="roleOptions"
                :disabled="isSelf"
              />
              <template v-if="isSelf" #hint>
                <span class="text-warning-500">자신의 역할은 변경할 수 없습니다.</span>
              </template>
            </UFormField>

            <UFormField label="상태">
              <div class="flex items-center gap-4">
                <URadio
                  v-model="editForm.isActive"
                  :value="true"
                  label="활성"
                  :disabled="isSelf"
                />
                <URadio
                  v-model="editForm.isActive"
                  :value="false"
                  label="비활성"
                  :disabled="isSelf"
                />
              </div>
              <template v-if="isSelf" #hint>
                <span class="text-warning-500">자신의 계정은 비활성화할 수 없습니다.</span>
              </template>
            </UFormField>

            <UButton
              color="primary"
              block
              :loading="isUpdating"
              @click="handleUpdate"
            >
              저장
            </UButton>
          </div>
        </UCard>
      </div>

      <!-- 우측: 활동 로그 -->
      <div class="lg:col-span-1">
        <UCard>
          <template #header>
            <h3 class="font-semibold">최근 활동 로그</h3>
          </template>

          <div v-if="activityLogs.length > 0" class="space-y-3">
            <div
              v-for="log in activityLogs"
              :key="log.id"
              class="p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg"
            >
              <div class="flex items-center justify-between mb-1">
                <span class="font-medium text-sm">
                  {{ getActionLabel(log.action) }}
                </span>
                <span class="text-xs text-neutral-500">
                  {{ formatDate(log.createdAt) }}
                </span>
              </div>
              <div v-if="log.targetType" class="text-xs text-neutral-500">
                대상: {{ log.targetType }}
                <span v-if="log.targetId">#{{ log.targetId }}</span>
              </div>
              <div v-if="log.ipAddress" class="text-xs text-neutral-400 font-mono">
                {{ log.ipAddress }}
              </div>
            </div>
          </div>

          <div v-else class="text-center py-8 text-neutral-500">
            활동 로그가 없습니다.
          </div>

          <template v-if="activityMeta && activityMeta.totalPages > 1" #footer>
            <div class="flex justify-center">
              <UPagination
                v-model="activityPage"
                :total="activityMeta.total"
                :items-per-page="10"
              />
            </div>
          </template>
        </UCard>
      </div>
    </div>

  </div>
</template>
