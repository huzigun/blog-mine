<script setup lang="ts">
definePageMeta({
  layout: 'auth',
  middleware: ['guest'],
});

const route = useRoute();
const toast = useToast();
const auth = useAuth();

// Handle Kakao OAuth callback
onMounted(async () => {
  const code = route.query.code as string;
  const error = route.query.error as string;
  const errorDescription = route.query.error_description as string;

  // 프론트엔드에서 사용한 redirect URI (login.vue와 동일하게 계산)
  const redirectUri = `${window.location.origin}/auth/kakao-callback`;

  // Handle OAuth error
  if (error) {
    toast.add({
      title: '카카오 로그인 실패',
      description: errorDescription || '카카오 인증에 실패했습니다.',
      color: 'error',
    });
    await navigateTo('/auth/login');
    return;
  }

  // Validate authorization code
  if (!code) {
    toast.add({
      title: '카카오 로그인 실패',
      description: '인증 코드를 받지 못했습니다.',
      color: 'error',
    });
    await navigateTo('/auth/login');
    return;
  }

  try {
    // auth store의 kakaoLogin 메서드 사용 (redirectUri 전달)
    const response = await auth.kakaoLogin(code, redirectUri);

    // 계정 연동 여부에 따라 다른 메시지 표시
    if (response.isAccountLinked) {
      toast.add({
        title: '계정 연동 완료',
        description: '기존 계정에 카카오 로그인이 연동되었습니다!',
        color: 'success',
      });
    } else {
      toast.add({
        title: '로그인 성공',
        description: '카카오 계정으로 로그인되었습니다!',
        color: 'success',
      });
    }

    // Navigate to dashboard
    await navigateTo('/console/dashboard');
  } catch (err: any) {
    const errorMessage =
      err?.data?.message || '카카오 로그인 처리 중 오류가 발생했습니다.';

    toast.add({
      title: '카카오 로그인 실패.',
      description: errorMessage,
      color: 'error',
    });

    await navigateTo('/auth/login');
  }
});
</script>

<template>
  <div class="flex flex-col items-center justify-center min-h-[60vh]">
    <div class="text-center">
      <div
        class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"
      ></div>
      <p class="text-lg text-gray-700 dark:text-gray-300">
        카카오 로그인 처리 중...
      </p>
    </div>
  </div>
</template>
