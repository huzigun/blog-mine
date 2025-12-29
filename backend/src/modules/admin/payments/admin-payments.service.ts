import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@lib/database/prisma.service';
import { Prisma, PaymentStatus } from '@prisma/client';

export interface AdminPaymentsQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'all' | PaymentStatus;
  sortBy?: 'createdAt' | 'amount';
  sortOrder?: 'asc' | 'desc';
}

export interface RefundPaymentDto {
  amount?: number; // 부분 환불 금액 (미입력 시 전액 환불)
  reason: string;
}

@Injectable()
export class AdminPaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 결제 목록 조회 (관리자용)
   */
  async findAll(query: AdminPaymentsQuery) {
    const {
      page = 1,
      limit = 20,
      search,
      status = 'all',
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    // Query 파라미터는 문자열로 들어오므로 숫자로 변환
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 20;
    const skip = (pageNum - 1) * limitNum;

    // Where 조건 구성
    const where: Prisma.PaymentWhereInput = {};

    // 검색 조건 (사용자 이메일/이름 또는 거래ID)
    if (search) {
      where.OR = [
        {
          user: {
            OR: [
              { email: { contains: search, mode: 'insensitive' } },
              { name: { contains: search, mode: 'insensitive' } },
            ],
          },
        },
        { transactionId: { contains: search, mode: 'insensitive' } },
      ];
    }

    // 상태 필터
    if (status !== 'all') {
      where.status = status;
    }

    // 정렬 조건
    const orderBy: Prisma.PaymentOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    // 전체 개수 조회
    const total = await this.prisma.payment.count({ where });

    // 결제 목록 조회
    const payments = await this.prisma.payment.findMany({
      where,
      skip,
      take: limitNum,
      orderBy,
      select: {
        id: true,
        amount: true,
        currency: true,
        status: true,
        paymentMethod: true,
        transactionId: true,
        receiptUrl: true,
        refundedAt: true,
        refundAmount: true,
        refundReason: true,
        metadata: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    return {
      data: payments,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  /**
   * 결제 상세 조회
   */
  async findOne(paymentId: number) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      select: {
        id: true,
        amount: true,
        currency: true,
        status: true,
        paymentMethod: true,
        transactionId: true,
        receiptUrl: true,
        refundedAt: true,
        refundAmount: true,
        refundReason: true,
        metadata: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('결제 정보를 찾을 수 없습니다.');
    }

    return payment;
  }

  /**
   * 결제 환불 처리
   */
  async refundPayment(
    paymentId: number,
    dto: RefundPaymentDto,
    adminId: number,
  ) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { user: true },
    });

    if (!payment) {
      throw new NotFoundException('결제 정보를 찾을 수 없습니다.');
    }

    if (payment.status === 'REFUNDED') {
      throw new BadRequestException('이미 환불된 결제입니다.');
    }

    if (payment.status !== 'COMPLETED') {
      throw new BadRequestException('완료된 결제만 환불할 수 있습니다.');
    }

    const refundAmount = dto.amount || payment.amount;

    if (refundAmount > payment.amount) {
      throw new BadRequestException(
        '환불 금액이 결제 금액을 초과할 수 없습니다.',
      );
    }

    // 이미 부분 환불된 경우 남은 금액 확인
    const previousRefund = payment.refundAmount || 0;
    const remainingAmount = payment.amount - previousRefund;

    if (refundAmount > remainingAmount) {
      throw new BadRequestException(
        `환불 가능 금액(${remainingAmount}원)을 초과했습니다.`,
      );
    }

    // 환불 처리 (실제 PG 환불 로직은 별도 구현 필요)
    const isFullRefund = refundAmount + previousRefund >= payment.amount;

    const updated = await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: isFullRefund ? 'REFUNDED' : 'COMPLETED',
        refundedAt: new Date(),
        refundAmount: previousRefund + refundAmount,
        refundReason: dto.reason + ` (관리자 ID: ${adminId})`,
      },
      select: {
        id: true,
        amount: true,
        status: true,
        refundAmount: true,
        refundReason: true,
        refundedAt: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    return {
      ...updated,
      refundedAmount: refundAmount,
      isFullRefund,
    };
  }

  /**
   * 결제 통계 조회
   */
  async getStats() {
    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalPayments,
      completedPayments,
      pendingPayments,
      failedPayments,
      refundedPayments,
      todayPayments,
      monthlyPayments,
      totalRevenue,
      monthlyRevenue,
      totalRefunded,
    ] = await Promise.all([
      this.prisma.payment.count(),
      this.prisma.payment.count({ where: { status: 'COMPLETED' } }),
      this.prisma.payment.count({ where: { status: 'PENDING' } }),
      this.prisma.payment.count({ where: { status: 'FAILED' } }),
      this.prisma.payment.count({ where: { status: 'REFUNDED' } }),
      // 오늘 결제 수
      this.prisma.payment.count({
        where: {
          createdAt: { gte: startOfToday },
          status: 'COMPLETED',
        },
      }),
      // 이번달 결제 수
      this.prisma.payment.count({
        where: {
          createdAt: { gte: startOfMonth },
          status: 'COMPLETED',
        },
      }),
      // 총 매출
      this.prisma.payment.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { amount: true },
      }),
      // 이번달 매출
      this.prisma.payment.aggregate({
        where: {
          createdAt: { gte: startOfMonth },
          status: 'COMPLETED',
        },
        _sum: { amount: true },
      }),
      // 총 환불액
      this.prisma.payment.aggregate({
        where: { status: 'REFUNDED' },
        _sum: { refundAmount: true },
      }),
    ]);

    return {
      totalPayments,
      completedPayments,
      pendingPayments,
      failedPayments,
      refundedPayments,
      todayPayments,
      monthlyPayments,
      totalRevenue: totalRevenue._sum.amount || 0,
      monthlyRevenue: monthlyRevenue._sum.amount || 0,
      totalRefunded: totalRefunded._sum.refundAmount || 0,
    };
  }
}
