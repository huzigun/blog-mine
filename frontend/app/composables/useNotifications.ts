const PAGE_SIZE = 10;
const RECONNECT_DELAY = 5000; // 5초 후 재연결

// SSE 연결 관리 (클라이언트 사이드 전용)
let eventSource: EventSource | null = null;
let reconnectTimer: NodeJS.Timeout | null = null;

/**
 * 알림 시스템 Composable
 * - 알림 목록 조회 (페이지네이션)
 * - 읽지 않은 알림 수 조회
 * - 단일/전체 읽음 처리
 * - SSE 실시간 알림 수신
 * - 인피니티 스크롤 지원
 */
export function useNotifications() {
  const config = useRuntimeConfig();

  // Nuxt useState를 사용하여 SSR/CSR 간 상태 동기화
  const notifications = useState<Notification[]>('notifications', () => []);
  const unreadCount = useState<number>('notificationUnreadCount', () => 0);
  const isConnected = useState<boolean>('notificationIsConnected', () => false);
  const isLoading = useState<boolean>('notificationIsLoading', () => false);
  const currentPage = useState<number>('notificationCurrentPage', () => 1);
  const hasMore = useState<boolean>('notificationHasMore', () => true);
  const currentFilter = useState<'all' | 'unread'>('notificationCurrentFilter', () => 'all');

  /**
   * 알림 목록 조회 (인피니티 스크롤 지원)
   */
  async function fetchNotifications(filter?: NotificationFilter) {
    isLoading.value = true;
    try {
      const params = new URLSearchParams();
      if (filter?.page) params.append('page', String(filter.page));
      if (filter?.limit) params.append('limit', String(filter.limit));
      if (filter?.type) params.append('type', filter.type);
      if (typeof filter?.isRead === 'boolean') {
        params.append('isRead', String(filter.isRead));
      }

      const queryString = params.toString();
      const url = queryString
        ? `/notifications?${queryString}`
        : '/notifications';

      const response = await useApi<NotificationListResponse>(url);
      notifications.value = response?.data || [];

      // 인피니티 스크롤 상태 초기화
      currentPage.value = 1;
      hasMore.value = (response?.data?.length || 0) >= PAGE_SIZE;

      return response;
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      throw error;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * 알림 필터 변경
   */
  async function setFilter(filter: 'all' | 'unread') {
    // 로딩 중이면 무시
    if (isLoading.value) return;

    currentFilter.value = filter;
    currentPage.value = 1;
    hasMore.value = true;

    const filterParams: NotificationFilter = {
      limit: PAGE_SIZE,
    };

    if (filter === 'unread') {
      filterParams.isRead = false;
    }

    await fetchNotifications(filterParams);
  }

  /**
   * 더 많은 알림 로드 (인피니티 스크롤)
   */
  async function loadMore() {
    if (isLoading.value || !hasMore.value) return;

    isLoading.value = true;
    try {
      const nextPage = currentPage.value + 1;
      const params = new URLSearchParams();
      params.append('page', String(nextPage));
      params.append('limit', String(PAGE_SIZE));

      if (currentFilter.value === 'unread') {
        params.append('isRead', 'false');
      }

      const url = `/notifications?${params.toString()}`;
      const response = await useApi<NotificationListResponse>(url);
      const newData = response?.data || [];

      if (newData.length > 0) {
        notifications.value = [...notifications.value, ...newData];
        currentPage.value = nextPage;
      }

      hasMore.value = newData.length >= PAGE_SIZE;
    } catch (error) {
      console.error('Failed to load more notifications:', error);
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * 읽지 않은 알림 수 조회
   */
  async function fetchUnreadCount() {
    try {
      const response = await useApi<{ count: number }>(
        '/notifications/unread-count',
      );
      unreadCount.value = response.count;
      return response.count;
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
      return 0;
    }
  }

  /**
   * 단일 알림 읽음 처리
   */
  async function markAsRead(notificationId: number) {
    try {
      await useApi<Notification>(`/notifications/${notificationId}/read`, {
        method: 'PATCH',
      });

      // 로컬 상태 업데이트
      const index = notifications.value.findIndex(
        (n) => n.id === notificationId,
      );
      const notification = notifications.value[index];
      if (notification && !notification.isRead) {
        notification.isRead = true;
        notification.readAt = new Date().toISOString();
        unreadCount.value = Math.max(0, unreadCount.value - 1);
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      throw error;
    }
  }

  /**
   * 전체 알림 읽음 처리
   */
  async function markAllAsRead() {
    try {
      await useApi<{ count: number }>('/notifications/read-all', {
        method: 'PATCH',
      });

      // 로컬 상태 업데이트
      notifications.value.forEach((n) => {
        if (!n.isRead) {
          n.isRead = true;
          n.readAt = new Date().toISOString();
        }
      });
      unreadCount.value = 0;
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      throw error;
    }
  }

  /**
   * 알림 삭제
   */
  async function deleteNotification(notificationId: number) {
    try {
      await useApi(`/notifications/${notificationId}`, {
        method: 'DELETE',
      });

      // 로컬 상태에서 제거
      const index = notifications.value.findIndex(
        (n) => n.id === notificationId,
      );
      const notification = notifications.value[index];
      if (notification) {
        if (!notification.isRead) {
          unreadCount.value = Math.max(0, unreadCount.value - 1);
        }
        notifications.value.splice(index, 1);
      }
    } catch (error) {
      console.error('Failed to delete notification:', error);
      throw error;
    }
  }

  /**
   * SSE 연결
   */
  function connectSSE() {
    // 이미 연결된 경우 무시
    if (eventSource) return;

    const auth = useAuth();
    const accessToken = auth.accessToken;

    if (!accessToken) {
      console.warn('No access token available for SSE connection');
      return;
    }

    const isDev = import.meta.dev;
    const baseURL = isDev ? 'http://localhost:9706' : config.public.apiBaseUrl;
    const url = `${baseURL}/notifications/stream`;

    // EventSource는 헤더를 지원하지 않으므로 쿼리 파라미터로 토큰 전달
    // 보안상 이슈가 있을 수 있으나 SSE 특성상 어쩔 수 없음
    // 대안: 별도 인증 엔드포인트에서 일회용 토큰 발급
    eventSource = new EventSource(`${url}?token=${accessToken}`);

    eventSource.onopen = () => {
      isConnected.value = true;
      console.log('SSE connection established');

      // 재연결 타이머 클리어
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
    };

    eventSource.onmessage = (event) => {
      try {
        const notification: Notification = JSON.parse(event.data);

        // 새 알림을 목록 앞에 추가
        notifications.value.unshift(notification);

        // 읽지 않은 알림 수 증가
        if (!notification.isRead) {
          unreadCount.value++;
        }

        console.log('New notification received:', notification);
      } catch (error) {
        console.error('Failed to parse SSE message:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE connection error:', error);
      isConnected.value = false;

      // 연결 끊김 시 재연결 시도
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }

      // 자동 재연결
      if (!reconnectTimer) {
        reconnectTimer = setTimeout(() => {
          reconnectTimer = null;
          connectSSE();
        }, RECONNECT_DELAY);
      }
    };
  }

  /**
   * SSE 연결 해제
   */
  function disconnectSSE() {
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }

    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }

    isConnected.value = false;
    console.log('SSE connection closed');
  }

  /**
   * 알림 클릭 핸들러 (읽음 처리 + 링크 이동)
   */
  async function handleNotificationClick(notification: Notification) {
    // 읽지 않은 경우 읽음 처리
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }

    // 링크가 있으면 해당 페이지로 이동
    if (notification.data?.link) {
      navigateTo(notification.data.link);
    }
  }

  /**
   * 알림 타입별 아이콘 반환
   */
  function getNotificationIcon(type: NotificationType): string {
    const icons: Record<NotificationType, string> = {
      SYSTEM: 'i-heroicons-bell',
      BLOG_POST: 'i-heroicons-document-text',
      SUBSCRIPTION: 'i-heroicons-credit-card',
      CREDIT: 'i-heroicons-wallet',
      PROMOTION: 'i-heroicons-gift',
    };
    return icons[type] || 'i-heroicons-bell';
  }

  /**
   * 알림 타입별 색상 반환
   */
  function getNotificationColor(
    type: NotificationType,
  ): 'primary' | 'success' | 'warning' | 'error' | 'neutral' {
    const colors: Record<
      NotificationType,
      'primary' | 'success' | 'warning' | 'error' | 'neutral'
    > = {
      SYSTEM: 'primary',
      BLOG_POST: 'success',
      SUBSCRIPTION: 'warning',
      CREDIT: 'neutral',
      PROMOTION: 'primary',
    };
    return colors[type] || 'neutral';
  }

  /**
   * 알림 중요도별 색상 클래스 반환
   * CRITICAL: 빨강, HIGH: 주황, NORMAL: 초록, LOW: 회색
   */
  function getImportanceColor(importance: NotificationImportance): {
    bg: string;
    text: string;
    dot: string;
    border: string;
  } {
    const colors: Record<
      NotificationImportance,
      { bg: string; text: string; dot: string; border: string }
    > = {
      CRITICAL: {
        bg: 'bg-error-50 dark:bg-error-900/20',
        text: 'text-error-600 dark:text-error-400',
        dot: 'bg-error-500',
        border: 'border-l-error-500',
      },
      HIGH: {
        bg: 'bg-warning-50 dark:bg-warning-900/20',
        text: 'text-warning-600 dark:text-warning-400',
        dot: 'bg-warning-500',
        border: 'border-l-warning-500',
      },
      NORMAL: {
        bg: 'bg-success-50 dark:bg-success-900/20',
        text: 'text-success-600 dark:text-success-400',
        dot: 'bg-success-500',
        border: 'border-l-success-500',
      },
      LOW: {
        bg: 'bg-neutral-50 dark:bg-neutral-900/20',
        text: 'text-neutral-500 dark:text-neutral-400',
        dot: 'bg-neutral-400',
        border: 'border-l-neutral-400',
      },
    };
    return colors[importance] || colors.NORMAL;
  }

  /**
   * 알림 중요도별 아이콘 반환
   */
  function getImportanceIcon(importance: NotificationImportance): string {
    const icons: Record<NotificationImportance, string> = {
      CRITICAL: 'i-heroicons-exclamation-circle',
      HIGH: 'i-heroicons-exclamation-triangle',
      NORMAL: 'i-heroicons-information-circle',
      LOW: 'i-heroicons-chat-bubble-left',
    };
    return icons[importance] || 'i-heroicons-information-circle';
  }

  /**
   * 상대 시간 포맷팅 (예: "3분 전", "2시간 전")
   */
  function formatRelativeTime(dateString: string): string {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return '방금 전';
    if (diffMin < 60) return `${diffMin}분 전`;
    if (diffHour < 24) return `${diffHour}시간 전`;
    if (diffDay < 7) return `${diffDay}일 전`;

    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  return {
    // 상태
    notifications,
    unreadCount,
    isConnected,
    isLoading,
    hasMore,
    currentFilter,

    // 메서드
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    connectSSE,
    disconnectSSE,
    setFilter,
    loadMore,

    // 유틸리티
    handleNotificationClick,
    getNotificationIcon,
    getNotificationColor,
    getImportanceColor,
    getImportanceIcon,
    formatRelativeTime,
  };
}
