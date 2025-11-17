<script setup lang="ts">
const auth = useAuth();

// 10분마다 구독 상태 백그라운드 갱신
let intervalId: NodeJS.Timeout | null = null;

onMounted(() => {
  if (auth.isAuthenticated) {
    intervalId = setInterval(
      async () => {
        await auth.fetchSubscription();
      },
      10 * 60 * 1000, // 10분
    );
  }
});

// 컴포넌트 언마운트 시 정리
onBeforeUnmount(() => {
  if (intervalId) {
    clearInterval(intervalId);
  }
});
</script>

<template>
  <UApp>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
