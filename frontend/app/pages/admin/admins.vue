<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '#ui/types'

definePageMeta({
  layout: 'admin',
  middleware: ['admin'],
})

const toast = useToast()
const config = useRuntimeConfig()
const { adminAccessToken, hasMinRole } = useAdminAuth()

if (!hasMinRole('SUPER_ADMIN')) {
  throw createError({
    statusCode: 403,
    statusMessage: '최고 관리자만 접근할 수 있습니다.',
  })
}

// 관리자 목록
const admins = ref<any[]>([])
const isLoading = ref(false)
const isCreateModalOpen = ref(false)

const columns = [
  { accessorKey: 'id', header: 'ID' },
  { accessorKey: 'email', header: '이메일' },
  { accessorKey: 'name', header: '이름' },
  { accessorKey: 'role', header: '역할' },
  { accessorKey: 'isActive', header: '활성' },
  { accessorKey: 'lastLoginAt', header: '마지막 로그인' },
  { accessorKey: 'actions', header: '' },
]

// 관리자 생성 폼
const createSchema = z.object({
  email: z.string().email('올바른 이메일 형식이 아닙니다'),
  password: z.string().min(8, '비밀번호는 8자 이상이어야 합니다'),
  name: z.string().min(1, '이름을 입력해주세요'),
  role: z.enum(['ADMIN', 'SUPPORT', 'VIEWER']),
})

type CreateSchema = z.output<typeof createSchema>

const createState = reactive({
  email: '',
  password: '',
  name: '',
  role: 'ADMIN' as const,
})

const isCreating = ref(false)

const roleOptions = [
  { label: '관리자', value: 'ADMIN' },
  { label: '고객지원', value: 'SUPPORT' },
  { label: '뷰어', value: 'VIEWER' },
]

const openCreateModal = () => {
  createState.email = ''
  createState.password = ''
  createState.name = ''
  createState.role = 'ADMIN'
  isCreateModalOpen.value = true
}

const onCreateSubmit = async (event: FormSubmitEvent<CreateSchema>) => {
  isCreating.value = true

  try {
    await $fetch(`${config.public.apiBase}/admin/auth/create`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminAccessToken.value}`,
      },
      body: event.data,
    })

    toast.add({
      title: '생성 완료',
      description: '새 관리자가 생성되었습니다.',
      color: 'success',
    })

    isCreateModalOpen.value = false
    // 목록 새로고침
  } catch (error: any) {
    toast.add({
      title: '생성 실패',
      description: error?.data?.message || '관리자 생성에 실패했습니다.',
      color: 'error',
    })
  } finally {
    isCreating.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-neutral-900 dark:text-white">관리자 관리</h1>
        <p class="mt-1 text-sm text-neutral-500">
          시스템 관리자를 관리합니다.
        </p>
      </div>
      <UButton color="primary" icon="i-heroicons-plus" @click="openCreateModal">
        관리자 추가
      </UButton>
    </div>

    <UCard>
      <UTable :columns="columns" :rows="admins" :loading="isLoading">
        <template #empty-state>
          <div class="flex flex-col items-center justify-center py-12">
            <UIcon name="i-heroicons-user-circle" class="w-12 h-12 text-neutral-400 mb-4" />
            <p class="text-neutral-500">등록된 관리자가 없습니다.</p>
          </div>
        </template>
      </UTable>
    </UCard>

    <!-- 관리자 생성 모달 -->
    <UModal v-model:open="isCreateModalOpen">
      <template #content>
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-semibold">새 관리자 추가</h3>
              <UButton
                icon="i-heroicons-x-mark"
                color="neutral"
                variant="ghost"
                @click="isCreateModalOpen = false"
              />
            </div>
          </template>

          <UForm
            :schema="createSchema"
            :state="createState"
            class="space-y-4"
            @submit="onCreateSubmit"
          >
            <UFormField label="이메일" name="email">
              <UInput
                v-model="createState.email"
                type="email"
                placeholder="admin@example.com"
              />
            </UFormField>

            <UFormField label="비밀번호" name="password">
              <UInput
                v-model="createState.password"
                type="password"
                placeholder="8자 이상 입력"
              />
            </UFormField>

            <UFormField label="이름" name="name">
              <UInput v-model="createState.name" placeholder="관리자 이름" />
            </UFormField>

            <UFormField label="역할" name="role">
              <USelect v-model="createState.role" :options="roleOptions" />
            </UFormField>

            <div class="flex justify-end gap-2 pt-4">
              <UButton color="neutral" variant="outline" @click="isCreateModalOpen = false">
                취소
              </UButton>
              <UButton type="submit" :loading="isCreating">생성</UButton>
            </div>
          </UForm>
        </UCard>
      </template>
    </UModal>
  </div>
</template>
