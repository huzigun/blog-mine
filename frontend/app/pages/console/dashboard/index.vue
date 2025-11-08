<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth'],
});

const auth = useAuth();

// const { user, isAuthenticated } = useAuth()
</script>

<template>
  <div class="space-y-6">
    <!-- Welcome Section -->
    <div>
      <h1
        class="text-2xl font-bold text-neutral-900 dark:text-white sm:text-3xl"
      >
        대시보드
      </h1>
      <p class="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
        환영합니다, {{ auth.user?.name }}! 블로그 관리 시스템입니다.
      </p>
    </div>
  </div>
</template>
