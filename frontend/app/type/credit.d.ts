type CreditTransactionType =
  | 'SUBSCRIPTION_GRANT'
  | 'PURCHASE'
  | 'BONUS'
  | 'PROMO'
  | 'USAGE'
  | 'REFUND'
  | 'EXPIRE'
  | 'ADMIN_ADJUSTMENT';

type CreditType = 'SUBSCRIPTION' | 'PURCHASED' | 'BONUS';

interface CreditTransaction {
  id: number;
  accountId: number;
  userId: number;
  type: CreditTransactionType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  creditType: CreditType | null;
  referenceType: string | null;
  referenceId: number | null;
  expiresAt: string | null;
  metadata: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
}

interface CreditTransactionSearchParams {
  page?: number;
  limit?: number;
  type?: CreditTransactionType;
  startDate?: string;
  endDate?: string;
}
