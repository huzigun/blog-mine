type NotificationType =
  | 'SYSTEM'
  | 'BLOG_POST'
  | 'SUBSCRIPTION'
  | 'CREDIT'
  | 'PROMOTION';

interface Notification {
  id: number;
  userId: number;
  type: NotificationType;
  title: string;
  message: string;
  data?: {
    link?: string;
    blogPostId?: number;
    [key: string]: any;
  };
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

interface NotificationFilter {
  page?: number;
  limit?: number;
  type?: NotificationType;
  isRead?: boolean;
}

interface NotificationListResponse {
  data: Notification[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
