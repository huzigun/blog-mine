/**
 * 크레딧 잔액 관리 Composable
 * - 크레딧 잔액 조회
 * - 실시간 잔액 업데이트 지원
 * - 알림 시스템과 연동하여 크레딧 변경 시 자동 갱신
 */

export interface CreditBalance {
  totalCredits: number;
  subscriptionCredits: number;
  purchasedCredits: number;
  bonusCredits: number;
  lastUsedAt: string | null;
}

const REFRESH_INTERVAL = 60000; // 1분마다 자동 갱신

export function useCredits() {
  // Nuxt useState를 사용하여 SSR/CSR 간 상태 동기화
  const balance = useState<CreditBalance | null>('creditBalance', () => null);
  const isLoading = useState<boolean>('creditIsLoading', () => false);
  const error = useState<string | null>('creditError', () => null);

  let refreshTimer: NodeJS.Timeout | null = null;

  /**
   * 크레딧 잔액 조회
   */
  async function fetchBalance(showLoading = true) {
    if (showLoading) {
      isLoading.value = true;
    }
    error.value = null;

    try {
      const response = await useApi<CreditBalance>('/credits/balance');
      balance.value = response;
      return response;
    } catch (err: any) {
      console.error('Failed to fetch credit balance:', err);
      error.value = err?.message || '크레딧 잔액 조회에 실패했습니다.';
      return null;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * 크레딧 잔액 갱신 (사일런트)
   * - 로딩 상태 없이 백그라운드에서 갱신
   */
  async function refreshBalance() {
    return fetchBalance(false);
  }

  /**
   * 자동 갱신 시작
   */
  function startAutoRefresh() {
    if (refreshTimer) return;

    refreshTimer = setInterval(() => {
      refreshBalance();
    }, REFRESH_INTERVAL);
  }

  /**
   * 자동 갱신 중지
   */
  function stopAutoRefresh() {
    if (refreshTimer) {
      clearInterval(refreshTimer);
      refreshTimer = null;
    }
  }

  /**
   * 잔액 초기화 (로그아웃 시)
   */
  function resetBalance() {
    balance.value = null;
    error.value = null;
    stopAutoRefresh();
  }

  /**
   * 포맷된 크레딧 표시
   */
  const formattedBalance = computed(() => {
    if (!balance.value) return '0';
    return balance.value.totalCredits.toLocaleString();
  });

  /**
   * 크레딧 부족 여부
   */
  const isLow = computed(() => {
    if (!balance.value) return false;
    return balance.value.totalCredits < 10;
  });

  /**
   * 크레딧 없음 여부
   */
  const isEmpty = computed(() => {
    if (!balance.value) return true;
    return balance.value.totalCredits <= 0;
  });

  return {
    // State
    balance: readonly(balance),
    isLoading: readonly(isLoading),
    error: readonly(error),

    // Computed
    formattedBalance,
    isLow,
    isEmpty,

    // Methods
    fetchBalance,
    refreshBalance,
    startAutoRefresh,
    stopAutoRefresh,
    resetBalance,
  };
}
