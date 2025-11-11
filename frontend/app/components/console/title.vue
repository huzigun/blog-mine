<script lang="ts" setup>
interface Props {
  title: string;
  description?: string;
  returnPath?: string;
}
const props = defineProps<Props>();
</script>

<template>
  <header class="pb-8 flex justify-between items-center">
    <div>
      <h2 class="text-xl font-bold">{{ title }}</h2>
      <p class="text-sm" v-if="description">{{ description }}</p>
    </div>
    <UButton
      v-if="returnPath"
      color="neutral"
      variant="soft"
      icon="i-heroicons-arrow-left"
      :to="returnPath"
      size="lg"
    >
      목록으로
    </UButton>
  </header>
</template>
