<template>
  <div class="flex h-full flex-col">
    <!-- Logo & Toggle -->
    <div
      class="flex h-16 items-center justify-between px-4 border-b border-neutral-200 dark:border-neutral-800"
    >
      <NuxtLink
        to="/"
        :class="[
          'flex items-center gap-3 transition-opacity',
          isCollapsed && 'opacity-0 lg:opacity-100',
        ]"
      >
        <div
          class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white"
        >
          <UIcon name="i-heroicons-rocket-launch" class="h-5 w-5" />
        </div>
        <span
          v-if="!isCollapsed"
          class="text-lg font-semibold text-neutral-900 dark:text-white"
        >
          Blog Mine
        </span>
      </NuxtLink>

      <UButton
        color="neutral"
        variant="ghost"
        size="sm"
        square
        class="hidden lg:flex"
        @click="$emit('toggle')"
      >
        <UIcon
          :name="isCollapsed ? 'i-heroicons-chevron-right' : 'i-heroicons-chevron-left'"
          class="h-5 w-5"
        />
      </UButton>
    </div>

    <!-- Navigation -->
    <nav class="flex-1 space-y-1 overflow-y-auto p-4">
      <!-- <NuxtLink
        v-for="item in navigation"
        :key="item.name"
        :to="item.to"
        :class="[
          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          'hover:bg-neutral-100 dark:hover:bg-neutral-800',
          'text-neutral-700 dark:text-neutral-300',
          isCollapsed && 'justify-center lg:justify-start',
        ]"
        active-class="bg-primary/10 text-primary dark:bg-primary/20"
      >
        <UIcon :name="item.icon" class="h-5 w-5 flex-shrink-0" />
        <span v-if="!isCollapsed" class="truncate">
          {{ item.name }}
        </span>
      </NuxtLink> -->
    </nav>
  </div>
</template>

<script setup lang="ts">
interface NavigationItem {
  name: string
  to: string
  icon: string
}

interface Props {
  isCollapsed?: boolean
}

defineProps<Props>()
defineEmits<{
  toggle: []
}>()

const { user, logout } = useAuth()
const router = useRouter()
const toast = useToast()

const navigation: NavigationItem[] = [
  {
    name: '대시보드',
    to: '/',
    icon: 'i-heroicons-home',
  },
  {
    name: '게시글',
    to: '/posts',
    icon: 'i-heroicons-document-text',
  },
  {
    name: '카테고리',
    to: '/categories',
    icon: 'i-heroicons-folder',
  },
  {
    name: '댓글',
    to: '/comments',
    icon: 'i-heroicons-chat-bubble-left-right',
  },
  {
    name: '통계',
    to: '/analytics',
    icon: 'i-heroicons-chart-bar',
  },
  {
    name: '설정',
    to: '/settings',
    icon: 'i-heroicons-cog-6-tooth',
  },
]

const userMenuItems = [
  [
    {
      label: '프로필',
      icon: 'i-heroicons-user',
      click: () => router.push('/profile'),
    },
    {
      label: '설정',
      icon: 'i-heroicons-cog-6-tooth',
      click: () => router.push('/settings'),
    },
  ],
  [
    {
      label: '로그아웃',
      icon: 'i-heroicons-arrow-right-on-rectangle',
      click: async () => {
        try {
          await logout()
          toast.add({
            title: '로그아웃 성공',
            description: '성공적으로 로그아웃되었습니다.',
            color: 'success',
          })
          router.push('/login')
        } catch (error) {
          toast.add({
            title: '로그아웃 실패',
            description: '로그아웃 중 오류가 발생했습니다.',
            color: 'error',
          })
        }
      },
    },
  ],
]
</script>
