<script setup lang="ts">
const uiStore = useUiStore();
const { user, logout } = useAuth();
const toast = useToast();
const route = useRoute();

// 알림 시스템
const {
  notifications,
  unreadCount,
  isConnected,
  isLoading,
  hasMore,
  currentFilter,
  fetchNotifications,
  fetchUnreadCount,
  markAllAsRead,
  handleNotificationClick,
  getNotificationIcon,
  connectSSE,
  disconnectSSE,
  setFilter,
  loadMore,
  formatRelativeTime,
} = useNotifications();

const searchQuery = ref('');

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

// 알림 팝오버 상태
const isNotificationOpen = ref(false);

// 모두 읽음 처리 핸들러
const handleMarkAllAsRead = async () => {
  try {
    await markAllAsRead();
    toast.add({
      title: '알림 확인',
      description: '모든 알림을 읽음으로 표시했습니다.',
      color: 'success',
    });
  } catch {
    toast.add({
      title: '오류',
      description: '알림 처리 중 오류가 발생했습니다.',
      color: 'error',
    });
  }
};

// 알림 클릭 핸들러 (팝오버 닫기 포함)
const onNotificationClick = async (notification: Notification) => {
  isNotificationOpen.value = false;
  await handleNotificationClick(notification);
};

// 인피니티 스크롤 핸들러
const handleScroll = (event: Event) => {
  const target = event.target as HTMLElement;
  const { scrollTop, scrollHeight, clientHeight } = target;

  // 스크롤이 하단에서 50px 이내면 더 로드
  if (scrollHeight - scrollTop - clientHeight < 50) {
    loadMore();
  }
};

const quickActions = [
  {
    label: '새 원고 생성',
    icon: 'i-heroicons-plus',
    color: 'neutral' as const,
    click: () => navigateTo('/console/ai-post'),
  },
  {
    label: 'BloC 충전',
    icon: 'i-heroicons-plus',
    color: 'primary' as const,
    click: () => navigateTo('/mypage/credits'),
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
      label: 'BloC 관리',
      icon: 'i-heroicons-wallet',
      to: '/mypage/credits',
    },
    {
      label: '결제 관리',
      icon: 'i-heroicons-credit-card',
      to: '/mypage/payment',
    },
    // {
    //   label: '설정',
    //   icon: 'i-heroicons-cog-6-tooth',
    //   to: '/mypage/settings',
    // },
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

// 컴포넌트 마운트 시 초기화
onMounted(async () => {
  // 알림 데이터 로드
  await Promise.all([fetchNotifications({ limit: 10 }), fetchUnreadCount()]);

  // SSE 연결
  connectSSE();

  // 키보드 단축키 설정
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

// 컴포넌트 언마운트 시 정리
onBeforeUnmount(() => {
  disconnectSSE();
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
      class="flex h-16 items-center gap-6 px-4 dark:border-neutral-800 sm:px-6"
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

      <!-- Right Actions -->
      <div class="flex items-center gap-2 ml-auto">
        <!-- Credit Balance -->
        <ConsoleCreditBalance class="hidden sm:flex" />

        <!-- Divider -->
        <div class="hidden sm:block h-6 w-px bg-neutral-200 dark:bg-neutral-700 mx-1" />

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
          :icon="action.icon"
        >
          {{ action.label }}
        </UButton>

        <!-- Notifications -->
        <UPopover v-model:open="isNotificationOpen" class="ml-4">
          <UButton
            color="neutral"
            variant="ghost"
            size="sm"
            square
            class="relative"
          >
            <UIcon name="i-heroicons-bell" class="h-5 w-5" />
            <!-- 읽지 않은 알림 표시 -->
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

          <template #content>
            <div class="w-80 p-1">
              <!-- 필터 탭 -->
              <div class="flex gap-1 mb-2 px-1">
                <button
                  class="flex-1 py-1.5 text-xs font-medium rounded-md transition-colors"
                  :class="currentFilter === 'all'
                    ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                    : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800'"
                  @click="setFilter('all')"
                >
                  전체
                </button>
                <button
                  class="flex-1 py-1.5 text-xs font-medium rounded-md transition-colors"
                  :class="currentFilter === 'unread'
                    ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                    : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800'"
                  @click="setFilter('unread')"
                >
                  안읽음
                  <span v-if="unreadCount > 0" class="ml-1 text-[10px] bg-error text-white px-1 rounded-full">
                    {{ unreadCount > 99 ? '99+' : unreadCount }}
                  </span>
                </button>
              </div>

              <!-- 알림 목록 (스크롤 영역) -->
              <div
                class="max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-300 dark:scrollbar-thumb-neutral-600"
                @scroll="handleScroll"
              >
                <div v-if="notifications.length > 0" class="space-y-0.5">
                  <button
                    v-for="notification in notifications"
                    :key="notification.id"
                    class="w-full flex items-start gap-2 px-2 py-1.5 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-left"
                    :class="{ 'opacity-50': notification.isRead }"
                    @click="onNotificationClick(notification)"
                  >
                    <UIcon
                      :name="getNotificationIcon(notification.type)"
                      class="size-3.5 mt-0.5 text-neutral-500 shrink-0"
                    />
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center justify-between gap-2">
                        <p class="text-xs font-medium text-neutral-900 dark:text-white leading-tight truncate">
                          {{ notification.title }}
                        </p>
                        <span class="text-[10px] text-neutral-400 shrink-0">
                          {{ formatRelativeTime(notification.createdAt) }}
                        </span>
                      </div>
                      <p class="text-[11px] text-neutral-500 leading-tight mt-0.5">
                        {{ notification.message }}
                      </p>
                    </div>
                  </button>

                  <!-- 로딩 인디케이터 -->
                  <div v-if="isLoading" class="flex justify-center py-2">
                    <UIcon name="i-heroicons-arrow-path" class="size-4 text-neutral-400 animate-spin" />
                  </div>

                  <!-- 더 이상 알림 없음 -->
                  <div v-else-if="!hasMore && notifications.length > 0" class="text-center py-2 text-[11px] text-neutral-400">
                    더 이상 알림이 없습니다
                  </div>
                </div>

                <!-- 알림 없음 -->
                <div v-else class="flex items-center gap-2 px-2 py-3 text-neutral-400">
                  <UIcon name="i-heroicons-bell-slash" class="size-3.5" />
                  <div>
                    <p class="text-xs font-medium">알림이 없습니다</p>
                    <p class="text-[11px]">{{ currentFilter === 'unread' ? '읽지 않은 알림이 없습니다.' : '새로운 알림이 없습니다.' }}</p>
                  </div>
                </div>
              </div>

              <!-- 모두 읽음 버튼 -->
              <div v-if="unreadCount > 0" class="border-t border-neutral-200 dark:border-neutral-700 mt-1 pt-1">
                <button
                  class="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-left"
                  @click="handleMarkAllAsRead"
                >
                  <UIcon name="i-heroicons-check" class="size-3.5 text-neutral-500" />
                  <span class="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    모두 읽음으로 표시
                  </span>
                </button>
              </div>
            </div>
          </template>
        </UPopover>

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
              <div class="flex items-center gap-2">
                <span
                  class="text-[13px] font-medium text-neutral-900 dark:text-white"
                >
                  {{ user?.name || 'User' }}
                </span>
                <UBadge
                  v-if="user?.subscription?.plan"
                  :color="
                    user.subscription.plan.name === 'FREE'
                      ? 'neutral'
                      : user.subscription.plan.name === 'PRO'
                        ? 'primary'
                        : 'success'
                  "
                  size="xs"
                  variant="soft"
                >
                  {{ user.subscription.plan.displayName }}
                </UBadge>
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
