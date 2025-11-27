<script setup lang="ts">
interface Props {
  title?: string;
  description?: string;
  icon?: string;
  showContactButton?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  title: '서비스 준비중입니다',
  description: '곧 만나보실 수 있습니다. 조금만 기다려주세요!',
  icon: 'i-heroicons-wrench-screwdriver',
  showContactButton: false,
});
</script>

<template>
  <div class="flex items-center justify-center min-h-[60vh]">
    <UCard class="max-w-2xl w-full">
      <div class="text-center py-12 px-6">
        <!-- Icon -->
        <div
          class="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6"
        >
          <UIcon :name="props.icon" class="w-10 h-10 text-primary" />
        </div>

        <!-- Title -->
        <h2
          class="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-white mb-4"
        >
          {{ props.title }}
        </h2>

        <!-- Description -->
        <p class="text-neutral-600 dark:text-neutral-400 mb-8 text-base">
          {{ props.description }}
        </p>

        <!-- Features Preview (Optional) -->
        <div
          v-if="$slots.features"
          class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8"
        >
          <slot name="features" />
        </div>

        <!-- Action Buttons -->
        <div class="flex flex-col sm:flex-row gap-3 justify-center">
          <UButton
            color="neutral"
            variant="outline"
            size="lg"
            to="/console/dashboard"
            icon="i-heroicons-arrow-left"
          >
            대시보드로 돌아가기
          </UButton>

          <UButton
            v-if="props.showContactButton"
            color="primary"
            size="lg"
            to="/support"
            icon="i-heroicons-envelope"
          >
            문의하기
          </UButton>
        </div>

        <!-- Additional Content Slot -->
        <div v-if="$slots.default" class="mt-8">
          <slot />
        </div>
      </div>
    </UCard>
  </div>
</template>
