<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth'],
});
</script>

<template>
  <CreditsLayout>
    <CreditsTransactionHistory />
  </CreditsLayout>
</template>
