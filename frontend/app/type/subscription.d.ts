/**
 * 구독 상태
 */
type SubscriptionStatus = 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'EXPIRED';

/**
 * 구독 플랜
 */
interface SubscriptionPlan {
  id: number;
  name: string;
  displayName: string;
  description: string | null;
  price: number | null;
  yearlyPrice: number | null;
  monthlyCredits: number;
  maxBlogPostsPerMonth: number | null;
  maxPostLength: number | null;
  maxKeywordTrackings: number | null;
  maxPersonas: number | null;
  allowPriorityQueue: boolean;
  allowAdvancedAnalytics: boolean;
  allowApiAccess: boolean;
  allowCustomPersonas: boolean;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * 사용자 구독
 */
interface Subscription {
  id: number;
  userId: number;
  planId: number;
  status: SubscriptionStatus;
  startedAt: string;
  expiresAt: string;
  canceledAt: string | null;
  autoRenewal: boolean;
  lastPaymentDate: string | null;
  lastPaymentAmount: number | null;
  nextBillingDate: string | null;
  createdAt: string;
  updatedAt: string;
  plan: SubscriptionPlan;
}

/**
 * 구독 시작 요청
 */
interface StartSubscriptionDto {
  planId: number;
  paymentMethodId?: string;
  autoRenewal?: boolean;
}

/**
 * 구독 취소 요청
 */
interface CancelSubscriptionDto {
  reason?: string;
}

/**
 * 구독 응답
 */
interface SubscriptionResponse {
  success: boolean;
  message: string;
  subscription: Subscription;
  expiresAt?: string;
}
