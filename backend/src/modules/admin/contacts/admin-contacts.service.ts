import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@lib/database/prisma.service';
import { EmailService } from '@lib/integrations/email/email.service';
import { Prisma, ContactStatus, ContactCategory } from '@prisma/client';

export interface AdminContactsQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'all' | ContactStatus;
  category?: 'all' | ContactCategory;
  sortBy?: 'createdAt' | 'name' | 'status';
  sortOrder?: 'asc' | 'desc';
}

export interface UpdateContactStatusDto {
  status: ContactStatus;
  adminNote?: string;
}

export interface RespondContactDto {
  adminNote: string;
}

@Injectable()
export class AdminContactsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * 문의 목록 조회 (관리자용)
   */
  async findAll(query: AdminContactsQuery) {
    const {
      page = 1,
      limit = 20,
      search,
      status = 'all',
      category = 'all',
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    // Query 파라미터는 문자열로 들어오므로 숫자로 변환
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 20;
    const skip = (pageNum - 1) * limitNum;

    // Where 조건 구성
    const where: Prisma.ContactWhereInput = {};

    // 검색 조건 (이름 또는 이메일)
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { subject: { contains: search, mode: 'insensitive' } },
      ];
    }

    // 상태 필터
    if (status !== 'all') {
      where.status = status;
    }

    // 카테고리 필터
    if (category !== 'all') {
      where.category = category;
    }

    // 정렬 조건
    const orderBy: Prisma.ContactOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    // 전체 개수 조회
    const total = await this.prisma.contact.count({ where });

    // 문의 목록 조회
    const contacts = await this.prisma.contact.findMany({
      where,
      skip,
      take: limitNum,
      orderBy,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        subject: true,
        category: true,
        status: true,
        respondedAt: true,
        createdAt: true,
      },
    });

    return {
      data: contacts,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  /**
   * 문의 상세 조회
   */
  async findOne(contactId: number) {
    const contact = await this.prisma.contact.findUnique({
      where: { id: contactId },
    });

    if (!contact) {
      throw new NotFoundException('문의를 찾을 수 없습니다.');
    }

    return contact;
  }

  /**
   * 문의 통계 조회
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
      totalContacts,
      pendingContacts,
      inProgressContacts,
      resolvedContacts,
      closedContacts,
      todayContacts,
      monthlyContacts,
    ] = await Promise.all([
      this.prisma.contact.count(),
      this.prisma.contact.count({ where: { status: 'PENDING' } }),
      this.prisma.contact.count({ where: { status: 'IN_PROGRESS' } }),
      this.prisma.contact.count({ where: { status: 'RESOLVED' } }),
      this.prisma.contact.count({ where: { status: 'CLOSED' } }),
      // 오늘 접수된 문의
      this.prisma.contact.count({
        where: {
          createdAt: { gte: startOfToday },
        },
      }),
      // 이번달 접수된 문의
      this.prisma.contact.count({
        where: {
          createdAt: { gte: startOfMonth },
        },
      }),
    ]);

    return {
      totalContacts,
      pendingContacts,
      inProgressContacts,
      resolvedContacts,
      closedContacts,
      todayContacts,
      monthlyContacts,
    };
  }

  /**
   * 문의 상태 변경
   */
  async updateStatus(
    contactId: number,
    dto: UpdateContactStatusDto,
    adminId: number,
  ) {
    const contact = await this.prisma.contact.findUnique({
      where: { id: contactId },
    });

    if (!contact) {
      throw new NotFoundException('문의를 찾을 수 없습니다.');
    }

    const updateData: Prisma.ContactUpdateInput = {
      status: dto.status,
    };

    // 관리자 메모가 있으면 추가
    if (dto.adminNote !== undefined) {
      updateData.adminNote = dto.adminNote;
    }

    // 상태가 RESOLVED나 CLOSED로 변경되면 응답 시간 기록
    if (
      (dto.status === 'RESOLVED' || dto.status === 'CLOSED') &&
      !contact.respondedAt
    ) {
      updateData.respondedAt = new Date();
    }

    const updated = await this.prisma.contact.update({
      where: { id: contactId },
      data: updateData,
    });

    return {
      ...updated,
      message: '문의 상태가 변경되었습니다.',
    };
  }

  /**
   * 문의 답변 (관리자 메모 추가 + 이메일 발송)
   */
  async respond(contactId: number, dto: RespondContactDto, adminId: number) {
    const contact = await this.prisma.contact.findUnique({
      where: { id: contactId },
    });

    if (!contact) {
      throw new NotFoundException('문의를 찾을 수 없습니다.');
    }

    const respondedAt = contact.respondedAt || new Date();

    const updated = await this.prisma.contact.update({
      where: { id: contactId },
      data: {
        adminNote: dto.adminNote,
        status: 'IN_PROGRESS',
        respondedAt,
      },
    });

    // 문의자에게 답변 이메일 발송
    await this.emailService.sendContactResponse({
      email: contact.email,
      name: contact.name,
      subject: contact.subject,
      originalMessage: contact.message,
      responseMessage: dto.adminNote,
      respondedAt,
    });

    return {
      ...updated,
      message: '답변이 등록되고 이메일이 발송되었습니다.',
    };
  }

  /**
   * 문의 삭제
   */
  async remove(contactId: number, adminId: number) {
    const contact = await this.prisma.contact.findUnique({
      where: { id: contactId },
    });

    if (!contact) {
      throw new NotFoundException('문의를 찾을 수 없습니다.');
    }

    await this.prisma.contact.delete({
      where: { id: contactId },
    });

    return {
      message: '문의가 삭제되었습니다.',
    };
  }
}
