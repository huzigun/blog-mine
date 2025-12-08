type PaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';

interface Payment {
  id: number;
  userId: number;
  amount: number;
  currency: string;
  status: PaymentStatus;
  paymentMethod: string | null;
  transactionId: string | null;
  receiptUrl: string | null;
  refundedAt: string | null;
  refundAmount: number | null;
  refundReason: string | null;
  metadata: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
}

interface PaymentSearchParams {
  page?: number;
  limit?: number;
  status?: PaymentStatus;
  startDate?: string;
  endDate?: string;
  search?: string;
}
