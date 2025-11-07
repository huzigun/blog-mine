<script setup lang="ts">
const isSidebarOpen = ref(true)
const isMobile = ref(false)

// Detect mobile screen size
const checkMobile = () => {
  isMobile.value = window.innerWidth < 1024
  // Auto-collapse sidebar on mobile
  if (isMobile.value) {
    isSidebarOpen.value = false
  }
}

const toggleSidebar = () => {
  isSidebarOpen.value = !isSidebarOpen.value
}

const closeSidebar = () => {
  if (isMobile.value) {
    isSidebarOpen.value = false
  }
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})
</script>

<template>
  <div class="min-h-screen bg-neutral-50 dark:bg-neutral-950">
    <!-- Mobile Sidebar Overlay -->
    <div
      v-if="isSidebarOpen && isMobile"
      class="fixed inset-0 z-40 bg-neutral-900/50 backdrop-blur-sm lg:hidden"
      @click="closeSidebar"
    />

    <!-- Sidebar -->
    <aside
      :class="[
        'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-neutral-200 bg-white transition-transform duration-300 dark:border-neutral-800 dark:bg-neutral-900',
        isMobile && !isSidebarOpen && '-translate-x-full',
        !isMobile && !isSidebarOpen && '-translate-x-full lg:translate-x-0 lg:w-16',
      ]"
    >
      <DashboardSidebar
        :is-collapsed="!isSidebarOpen && !isMobile"
        @toggle="toggleSidebar"
      />
    </aside>

    <!-- Main Content -->
    <div
      :class="[
        'transition-all duration-300',
        !isMobile && isSidebarOpen ? 'lg:pl-64' : 'lg:pl-16',
      ]"
    >
      <!-- Header -->
      <!-- <DashboardHeader
        :is-sidebar-open="isSidebarOpen"
        @toggle-sidebar="toggleSidebar"
      /> -->

      <!-- Page Content -->
      <main class="p-4 sm:p-6 lg:p-8">
        <slot />
      </main>
    </div>
  </div>
</template>
