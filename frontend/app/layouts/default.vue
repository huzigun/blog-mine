<script setup lang="ts">
const uiStore = useUiStore();
const isSidebarHovered = ref(false);

// Detect mobile screen size
const checkMobile = () => {
  if (import.meta.client) {
    uiStore.setMobile(window.innerWidth < 1024);
  }
};

const closeSidebar = () => {
  if (uiStore.isMobileView) {
    uiStore.closeSidebar();
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
  <div class="min-h-screen">
    <!-- Mobile Sidebar Overlay -->
    <div
      v-if="uiStore.sidebarOpen && uiStore.isMobileView"
      class="fixed inset-0 z-40 bg-neutral-900/50 backdrop-blur-sm lg:hidden"
      @click="closeSidebar"
    />

    <!-- Sidebar -->
    <aside
      :class="[
        'fixed inset-y-0 left-0 z-50 flex flex-col transition-all duration-300',
        uiStore.isMobileView &&
          !uiStore.sidebarOpen &&
          '-translate-x-full w-64',
        uiStore.isMobileView && uiStore.sidebarOpen && 'w-64',
        !uiStore.isMobileView && uiStore.sidebarOpen && 'w-64',
        !uiStore.isMobileView &&
          !uiStore.sidebarOpen &&
          !isSidebarHovered &&
          'w-16',
        !uiStore.isMobileView &&
          !uiStore.sidebarOpen &&
          isSidebarHovered &&
          'w-64',
      ]"
      @mouseenter="
        !uiStore.isMobileView &&
        !uiStore.sidebarOpen &&
        (isSidebarHovered = true)
      "
      @mouseleave="
        !uiStore.isMobileView &&
        !uiStore.sidebarOpen &&
        (isSidebarHovered = false)
      "
    >
      <ConsoleSidebar
        :is-collapsed="!uiStore.sidebarOpen && !uiStore.isMobileView"
      />
    </aside>

    <!-- Main Content -->
    <div
      :class="[
        'transition-all duration-300',
        !uiStore.isMobileView && uiStore.sidebarOpen ? 'lg:pl-64' : 'lg:pl-16',
      ]"
    >
      <!-- Header -->
      <ConsoleHeader />

      <!-- Page Content -->
      <main class="min-h-[calc(100vh-4rem)] p-4 sm:p-6 lg:p-8">
        <slot />
      </main>
      <footer
        class="text-center text-xs text-neutral-500 py-2.5"
        :style="{
          boxShadow: '0 -3px 6px rgba(0, 0, 0, 0.05)',
        }"
      >
        <ClientOnly>
          &copy; {{ new Date().getFullYear() }} Blog Mine. All rights reserved.
        </ClientOnly>
      </footer>
    </div>
  </div>
</template>
