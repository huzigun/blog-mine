<script setup lang="ts">
import { useAdminApi } from '~/composables/useAdminApi';

const emit = defineEmits<{
  close: [result: boolean];
}>();

const toast = useToast();

const form = ref({
  email: '',
  password: '',
  name: '',
  role: 'ADMIN' as string,
});
const isLoading = ref(false);

// 역할 옵션
const roleOptions = [
  { label: '최고 관리자', value: 'SUPER_ADMIN' },
  { label: '관리자', value: 'ADMIN' },
  { label: '고객지원', value: 'SUPPORT' },
  { label: '조회 전용', value: 'VIEWER' },
];

const handleSubmit = async () => {
  if (!form.value.email || !form.value.password || !form.value.name) {
    toast.add({
      title: '입력 오류',
      description: '모든 필드를 입력해주세요.',
      color: 'warning',
    });
    return;
  }

  if (form.value.password.length < 6) {
    toast.add({
      title: '입력 오류',
      description: '비밀번호는 6자 이상이어야 합니다.',
      color: 'warning',
    });
    return;
  }

  isLoading.value = true;
  try {
    await useAdminApi('/admin/admins', {
      method: 'POST',
      body: form.value,
    });

    toast.add({
      title: '생성 완료',
      description: '관리자가 생성되었습니다.',
      color: 'success',
    });

    emit('close', true);
  } catch (error: any) {
    toast.add({
      title: '생성 실패',
      description: error.data?.message || '관리자 생성에 실패했습니다.',
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
            <h3 class="text-lg font-semibold">관리자 추가</h3>
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-heroicons-x-mark"
              @click="handleCancel"
            />
          </div>
        </template>

        <div class="space-y-4">
          <UFormField label="이메일" required>
            <UInput
              v-model="form.email"
              type="email"
              placeholder="admin@example.com"
            />
          </UFormField>

          <UFormField label="비밀번호" required>
            <UInput
              v-model="form.password"
              type="password"
              placeholder="비밀번호 (6자 이상)"
            />
          </UFormField>

          <UFormField label="이름" required>
            <UInput v-model="form.name" placeholder="관리자 이름" />
          </UFormField>

          <UFormField label="역할" required>
            <USelect v-model="form.role" :items="roleOptions" />
          </UFormField>
        </div>

        <template #footer>
          <div class="flex justify-end gap-3">
            <UButton color="neutral" variant="outline" @click="handleCancel">
              취소
            </UButton>
            <UButton
              color="primary"
              :loading="isLoading"
              :disabled="!form.email || !form.password || !form.name"
              @click="handleSubmit"
            >
              생성
            </UButton>
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>
