/**
 * 구독 가드 Composable
 * 특정 페이지에서 구독 상태를 확인하고, 미구독 시 모달을 띄우는 기능
 */
export const useSubscriptionGuard = () => {
  const authStore = useAuth();
  const isModalOpen = useState('subscription-guard-modal', () => false);

  /**
   * 구독 상태 확인
   */
  const checkSubscription = () => {
    // 로그인하지 않았거나 활성 구독이 없으면 모달 표시
    if (!authStore.isAuthenticated || !authStore.hasActiveSubscription) {
      isModalOpen.value = true;
      return false;
    }
    return true;
  };

  /**
   * 모달 닫기
   */
  const closeModal = () => {
    isModalOpen.value = false;
  };

  /**
   * 구독 페이지로 이동
   */
  const goToSubscription = () => {
    closeModal();
    navigateTo('/pricing');
  };

  return {
    isModalOpen,
    hasActiveSubscription: computed(() => authStore.hasActiveSubscription),
    checkSubscription,
    closeModal,
    goToSubscription,
  };
};
