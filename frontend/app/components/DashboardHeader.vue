<template>
  <header class="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-neutral-200 bg-white px-4 dark:border-neutral-800 dark:bg-neutral-900 sm:px-6">
    <!-- Mobile Menu Toggle -->
    <UButton
      color="neutral"
      variant="ghost"
      size="sm"
      square
      class="lg:hidden"
      @click="$emit('toggleSidebar')"
    >
      <UIcon name="i-heroicons-bars-3" class="h-5 w-5" />
    </UButton>

    <!-- Search Bar -->
    <div class="flex flex-1 items-center gap-4">
      <div class="w-full max-w-md">
        <UInput
          v-model="searchQuery"
          type="search"
          placeholder="검색..."
          icon="i-heroicons-magnifying-glass"
          size="md"
          :ui="{ icon: { trailing: { pointer: '' } } }"
        >
          <template #trailing>
            <kbd
              v-if="!searchQuery"
              class="hidden rounded bg-neutral-100 px-1.5 py-0.5 text-xs text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400 sm:inline-block"
            >
              ⌘K
            </kbd>
          </template>
        </UInput>
      </div>
    </div>

    <!-- Right Actions -->
    <div class="flex items-center gap-2">
      <!-- Theme Toggle -->
      <UButton
        color="neutral"
        variant="ghost"
        size="sm"
        square
        @click="toggleColorMode"
      >
        <UIcon
          :name="colorMode.value === 'dark' ? 'i-heroicons-moon' : 'i-heroicons-sun'"
          class="h-5 w-5"
        />
      </UButton>

      <!-- Notifications -->
      <UDropdown
        :items="notificationItems"
        :popper="{ placement: 'bottom-end' }"
      >
        <UButton
          color="neutral"
          variant="ghost"
          size="sm"
          square
        >
          <UIcon name="i-heroicons-bell" class="h-5 w-5" />
          <span
            v-if="unreadCount > 0"
            class="absolute right-1 top-1 flex h-2 w-2"
          >
            <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-error opacity-75" />
            <span class="relative inline-flex h-2 w-2 rounded-full bg-error" />
          </span>
        </UButton>
      </UDropdown>

      <!-- User Menu (Mobile) -->
      <UDropdown
        :items="userMenuItems"
        :popper="{ placement: 'bottom-end' }"
        class="lg:hidden"
      >
        <UAvatar
          :alt="user?.name || 'User'"
          size="sm"
          :src="user?.avatar"
        />
      </UDropdown>
    </div>
  </header>
</template>

<script setup lang="ts">
interface Props {
  isSidebarOpen?: boolean
}

defineProps<Props>()
defineEmits<{
  toggleSidebar: []
}>()

const { user, logout } = useAuth()
const router = useRouter()
const toast = useToast()
const colorMode = useColorMode()

const searchQuery = ref('')
const unreadCount = ref(3)

const toggleColorMode = () => {
  colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
}

const notificationItems = [
  [
    {
      label: '새 댓글',
      description: '게시글에 새로운 댓글이 달렸습니다.',
      icon: 'i-heroicons-chat-bubble-left',
      click: () => router.push('/comments'),
    },
    {
      label: '새 게시글',
      description: '관리자가 새 게시글을 작성했습니다.',
      icon: 'i-heroicons-document-text',
      click: () => router.push('/posts'),
    },
    {
      label: '시스템 알림',
      description: '시스템 업데이트가 예정되어 있습니다.',
      icon: 'i-heroicons-bell',
      click: () => {},
    },
  ],
  [
    {
      label: '모두 읽음으로 표시',
      icon: 'i-heroicons-check',
      click: () => {
        unreadCount.value = 0
        toast.add({
          title: '알림 확인',
          description: '모든 알림을 읽음으로 표시했습니다.',
          color: 'success',
        })
      },
    },
  ],
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

// Keyboard shortcut for search
onMounted(() => {
  const handleKeydown = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault()
      // Focus search input
      const searchInput = document.querySelector('input[type="search"]') as HTMLInputElement
      searchInput?.focus()
    }
  }

  window.addEventListener('keydown', handleKeydown)
  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeydown)
  })
})
</script>
