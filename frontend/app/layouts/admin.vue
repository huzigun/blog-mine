<script setup lang="ts">
const { adminUser, isAdminAuthenticated } = useAdminAuth();

const isSidebarCollapsed = ref(false);
const isMobileMenuOpen = ref(false);

// 사이드바 메뉴 아이템
const menuItems = [
  {
    label: '대시보드',
    icon: 'i-heroicons-home',
    to: '/admin',
  },
  {
    label: '사용자 관리',
    icon: 'i-heroicons-users',
    to: '/admin/users',
    minRole: 'SUPPORT' as const,
  },
  {
    label: '구독 관리',
    icon: 'i-heroicons-credit-card',
    to: '/admin/subscriptions',
    minRole: 'SUPPORT' as const,
  },
  {
    label: '결제 내역',
    icon: 'i-heroicons-banknotes',
    to: '/admin/payments',
    minRole: 'SUPPORT' as const,
  },
  {
    label: '블로그 포스트',
    icon: 'i-heroicons-document-text',
    to: '/admin/posts',
    minRole: 'VIEWER' as const,
  },
  {
    label: '문의 관리',
    icon: 'i-heroicons-chat-bubble-left-right',
    to: '/admin/contacts',
    minRole: 'SUPPORT' as const,
  },
  {
    label: '관리자 관리',
    icon: 'i-heroicons-user-circle',
    to: '/admin/admins',
    minRole: 'SUPER_ADMIN' as const,
  },
  {
    label: '플랜 관리',
    icon: 'i-heroicons-cog-6-tooth',
    to: '/admin/plans',
    minRole: 'ADMIN' as const,
  },
];

const { hasMinRole } = useAdminAuth();

const visibleMenuItems = computed(() => {
  return menuItems.filter((item) => {
    if (!item.minRole) return true;
    return hasMinRole(item.minRole);
  });
});

const toggleSidebar = () => {
  isSidebarCollapsed.value = !isSidebarCollapsed.value;
};

const toggleMobileMenu = () => {
  isMobileMenuOpen.value = !isMobileMenuOpen.value;
};

const closeMobileMenu = () => {
  isMobileMenuOpen.value = false;
};

// 모바일 화면 감지
const isMobile = ref(false);
const checkMobile = () => {
  if (import.meta.client) {
    isMobile.value = window.innerWidth < 1024;
    if (!isMobile.value) {
      isMobileMenuOpen.value = false;
    }
  }
};

onMounted(() => {
  checkMobile();
  window.addEventListener('resize', checkMobile);
});

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile);
});
</script>

<template>
  <div class="min-h-screen bg-neutral-50 dark:bg-neutral-900">
    <!-- Mobile Menu Overlay -->
    <div
      v-if="isMobileMenuOpen && isMobile"
      class="fixed inset-0 z-40 bg-neutral-900/50 backdrop-blur-sm lg:hidden"
      @click="closeMobileMenu"
    />

    <!-- Sidebar -->
    <aside
      :class="[
        'fixed inset-y-0 left-0 z-50 flex flex-col bg-white dark:bg-neutral-800 border-r border-neutral-200 dark:border-neutral-700 transition-all duration-300',
        isMobile && !isMobileMenuOpen && '-translate-x-full',
        isMobile && isMobileMenuOpen && 'w-64',
        !isMobile && isSidebarCollapsed && 'w-16',
        !isMobile && !isSidebarCollapsed && 'w-64',
      ]"
    >
      <!-- Logo & Toggle -->
      <div
        class="flex items-center justify-between h-16 px-4 border-b border-neutral-200 dark:border-neutral-700"
      >
        <NuxtLink
          v-if="!isSidebarCollapsed || isMobile"
          to="/admin"
          class="flex items-center gap-2"
        >
          <span class="text-xl font-bold text-primary-600">BloC</span>
          <span class="text-sm text-neutral-500">Admin</span>
        </NuxtLink>
        <UButton
          v-if="!isMobile"
          :icon="
            isSidebarCollapsed
              ? 'i-heroicons-chevron-right'
              : 'i-heroicons-chevron-left'
          "
          color="neutral"
          variant="ghost"
          size="sm"
          @click="toggleSidebar"
        />
        <UButton
          v-if="isMobile"
          icon="i-heroicons-x-mark"
          color="neutral"
          variant="ghost"
          size="sm"
          @click="closeMobileMenu"
        />
      </div>

      <!-- Navigation -->
      <nav class="flex-1 overflow-y-auto p-4 space-y-1">
        <NuxtLink
          v-for="item in visibleMenuItems"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-3 px-3 py-2 rounded-lg text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
          active-class="bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400"
          @click="isMobile && closeMobileMenu()"
        >
          <UIcon :name="item.icon" class="w-5 h-5 flex-shrink-0" />
          <span
            v-if="!isSidebarCollapsed || isMobile"
            class="text-sm font-medium"
          >
            {{ item.label }}
          </span>
        </NuxtLink>
      </nav>

      <!-- User Info -->
      <div
        v-if="adminUser"
        class="p-4 border-t border-neutral-200 dark:border-neutral-700"
      >
        <div
          v-if="!isSidebarCollapsed || isMobile"
          class="flex items-center gap-3"
        >
          <div
            class="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center"
          >
            <UIcon name="i-heroicons-user" class="w-4 h-4 text-primary-600" />
          </div>
          <div class="flex-1 min-w-0">
            <p
              class="text-sm font-medium text-neutral-900 dark:text-white truncate"
            >
              {{ adminUser.name }}
            </p>
            <p class="text-xs text-neutral-500 truncate">
              {{ adminUser.role }}
            </p>
          </div>
        </div>
        <div v-else class="flex justify-center">
          <div
            class="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center"
          >
            <UIcon name="i-heroicons-user" class="w-4 h-4 text-primary-600" />
          </div>
        </div>
      </div>
    </aside>

    <!-- Main Content -->
    <div
      :class="[
        'transition-all duration-300',
        !isMobile && isSidebarCollapsed && 'lg:pl-16',
        !isMobile && !isSidebarCollapsed && 'lg:pl-64',
      ]"
    >
      <!-- Header -->
      <header
        class="sticky top-0 z-30 h-16 bg-white dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700 flex items-center justify-between px-4 lg:px-6"
      >
        <!-- Mobile Menu Button -->
        <UButton
          v-if="isMobile"
          icon="i-heroicons-bars-3"
          color="neutral"
          variant="ghost"
          @click="toggleMobileMenu"
        />

        <!-- Breadcrumb or Title -->
        <div v-if="!isMobile" class="text-sm text-neutral-500">
          <NuxtLink to="/admin" class="hover:text-primary-600">관리자</NuxtLink>
        </div>

        <!-- Right Actions -->
        <div class="flex items-center gap-2">
          <UButton
            icon="i-heroicons-arrow-right-on-rectangle"
            color="neutral"
            variant="ghost"
            @click="useAdminAuth().logout()"
          >
            <span v-if="!isMobile">로그아웃</span>
          </UButton>
        </div>
      </header>

      <!-- Page Content -->
      <main class="p-4 lg:p-6">
        <slot />
      </main>

      <!-- Footer -->
      <footer
        class="text-center text-xs text-neutral-500 py-4 border-t border-neutral-200 dark:border-neutral-700"
      >
        &copy; {{ new Date().getFullYear() }} Blog Mine Admin. All rights
        reserved.
      </footer>
    </div>
  </div>
</template>
