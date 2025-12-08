<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth'],
});
</script>

<template>
  <PaymentLayout>
    <CreditsCardManagement />
  </PaymentLayout>
</template>
