<script setup lang="ts">
const uiStore = useUiStore();
const { user, logout } = useAuth();
const toast = useToast();
const route = useRoute();

const searchQuery = ref('');
const unreadCount = ref(3);

// Breadcrumb generation
const breadcrumbs = computed(() => {
  const paths = route.path.split('/').filter(Boolean);
  const crumbs = [];

  let currentPath = '';
  for (const path of paths) {
    currentPath += `/${path}`;
    crumbs.push({
      label: path.charAt(0).toUpperCase() + path.slice(1),
      to: currentPath,
    });
  }

  return crumbs;
});

const notificationItems = [
  [
    {
      label: '새 댓글',
      description: '게시글에 새로운 댓글이 달렸습니다.',
      icon: 'i-heroicons-chat-bubble-left',
      click: () => navigateTo('/console/comments'),
    },
    {
      label: '새 게시글',
      description: '관리자가 새 게시글을 작성했습니다.',
      icon: 'i-heroicons-document-text',
      click: () => navigateTo('/console/posts'),
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
        unreadCount.value = 0;
        toast.add({
          title: '알림 확인',
          description: '모든 알림을 읽음으로 표시했습니다.',
          color: 'success',
        });
      },
    },
  ],
];

const quickActions = [
  {
    label: '새 게시글',
    icon: 'i-heroicons-plus',
    color: 'neutral' as const,
    click: () => navigateTo('/console/posts/new'),
  },
];

const userMenuItems = [
  [
    {
      label: '프로필',
      icon: 'i-heroicons-user',
      to: '/mypage/profile',
    },
    {
      label: '설정',
      icon: 'i-heroicons-cog-6-tooth',
      to: '/mypage/settings',
    },
  ],
  [
    {
      label: '로그아웃',
      icon: 'i-heroicons-arrow-right-on-rectangle',
      onSelect: async () => {
        try {
          await logout();
          toast.add({
            title: '로그아웃 성공',
            description: '성공적으로 로그아웃되었습니다.',
            color: 'success',
          });
          navigateTo('/');
        } catch (error) {
          toast.add({
            title: '로그아웃 실패',
            description: '로그아웃 중 오류가 발생했습니다.',
            color: 'error',
          });
        }
      },
    },
  ],
];

// Keyboard shortcut for search
onMounted(() => {
  const handleKeydown = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      const searchInput = document.querySelector(
        'input[type="search"]',
      ) as HTMLInputElement;
      searchInput?.focus();
    }
  };

  window.addEventListener('keydown', handleKeydown);
  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeydown);
  });
});
</script>

<template>
  <header
    class="sticky top-0 z-30 bg-white/80 backdrop-blur-xl"
    :style="{
      boxShadow: '0 0 10px rgba(0, 0, 0, 0.1)',
    }"
  >
    <!-- Main Header -->
    <div
      class="flex h-16 items-center gap-4 px-4 dark:border-neutral-800 sm:px-6"
    >
      <!-- Sidebar Toggle (Always Visible) -->
      <UButton
        color="neutral"
        variant="ghost"
        size="sm"
        square
        @click="uiStore.toggleSidebar()"
      >
        <UIcon name="i-heroicons-bars-3" class="h-5 w-5" />
      </UButton>

      <!-- Search Bar -->
      <div class="flex flex-1 items-center justify-end gap-3">
        <div class="hidden w-full max-w-md sm:block">
          <UInput
            v-model="searchQuery"
            type="search"
            placeholder="검색... (⌘K)"
            icon="i-heroicons-magnifying-glass"
            size="md"
            variant="soft"
          >
            <template #trailing>
              <kbd
                v-if="!searchQuery"
                class="hidden rounded bg-neutral-100 px-1.5 py-0.5 text-xs text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400 lg:inline-block"
              >
                ⌘K
              </kbd>
            </template>
          </UInput>
        </div>

        <!-- Mobile Search Icon -->
        <UButton
          color="neutral"
          variant="ghost"
          size="sm"
          square
          class="sm:hidden"
        >
          <UIcon name="i-heroicons-magnifying-glass" class="h-5 w-5" />
        </UButton>
      </div>

      <!-- Right Actions -->
      <div class="flex items-center gap-2">
        <!-- Quick Actions -->
        <UButton
          v-for="action in quickActions"
          :key="action.label"
          :color="action.color"
          size="sm"
          class="hidden md:flex"
          @click="
            () => {
              action.click();
            }
          "
        >
          <UIcon :name="action.icon" class="h-4 w-4" />
          <span class="ml-1.5">{{ action.label }}</span>
        </UButton>

        <!-- Notifications -->
        <UDropdownMenu :items="notificationItems">
          <UButton color="neutral" variant="ghost" size="sm" square>
            <UIcon name="i-heroicons-bell" class="h-5 w-5" />
            <span
              v-if="unreadCount > 0"
              class="absolute right-1 top-1 flex h-2 w-2"
            >
              <span
                class="absolute inline-flex h-full w-full animate-ping rounded-full bg-error opacity-75"
              />
              <span
                class="relative inline-flex h-2 w-2 rounded-full bg-error"
              />
            </span>
          </UButton>
        </UDropdownMenu>

        <!-- User Menu -->
        <UDropdownMenu :items="userMenuItems">
          <button
            class="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <UAvatar :alt="user?.name || 'User'" size="sm">
              <template #fallback>
                <UIcon
                  name="i-heroicons-user"
                  class="h-4 w-4 text-neutral-500"
                />
              </template>
            </UAvatar>
            <div class="hidden text-left lg:block">
              <div class="text-sm font-medium text-neutral-900 dark:text-white">
                {{ user?.name || 'User' }}
              </div>
            </div>
            <UIcon
              name="i-heroicons-chevron-down"
              class="hidden h-4 w-4 text-neutral-400 lg:block"
            />
          </button>
        </UDropdownMenu>
      </div>
    </div>
  </header>
</template>
