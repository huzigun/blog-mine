<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center px-4 py-12">
    <!-- Main Content (page slot) -->
    <slot />

    <!-- Customer Support Button (Fixed Position) - Shared across all auth pages -->
    <button
      type="button"
      class="fixed bottom-6 right-6 w-14 h-14 bg-purple-600 hover:bg-purple-700 text-white rounded-full shadow-lg flex flex-col items-center justify-center gap-0.5 transition-all hover:scale-110"
      @click="handleCustomerSupport"
    >
      <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
        <path
          d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"
        />
      </svg>
      <span class="text-[10px] font-medium">고객센터</span>
    </button>
  </div>
</template>

<script setup lang="ts">
const toast = useToast()

function handleCustomerSupport() {
  toast.add({
    title: '고객센터',
    description: '준비 중입니다',
    color: 'info',
  })
}
</script>
