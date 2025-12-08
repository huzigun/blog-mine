import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@lib/database/prisma.service';
import { PaymentFilterDto } from './dto';

@Injectable()
export class PaymentService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 결제 내역 조회 (페이징)
   */
  async getPayments(userId: number, filter: PaymentFilterDto) {
    const { page = 1, limit = 10, status, startDate, endDate, search } = filter;

    // WHERE 조건 생성
    const where: any = {
      userId,
    };

    if (status) {
      where.status = status;
    }

    if (search) {
      where.transactionId = {
        contains: search,
      };
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        // endDate는 해당 일자의 끝(23:59:59.999)까지 포함
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    // 총 개수 조회
    const total = await this.prisma.payment.count({ where });

    // 페이징 데이터 조회
    const data = await this.prisma.payment.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    // 페이지네이션 메타데이터
    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  /**
   * 특정 결제 내역 조회
   */
  async getPayment(userId: number, paymentId: number) {
    const payment = await this.prisma.payment.findFirst({
      where: {
        id: paymentId,
        userId,
      },
    });

    if (!payment) {
      throw new NotFoundException('결제 내역을 찾을 수 없습니다.');
    }

    return payment;
  }
}
