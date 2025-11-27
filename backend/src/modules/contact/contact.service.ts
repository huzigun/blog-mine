import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@lib/database/prisma.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { Contact, ContactStatus } from '@prisma/client';

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 문의 생성 (비회원 포함)
   */
  async create(createContactDto: CreateContactDto): Promise<Contact> {
    this.logger.log(
      `Creating contact from ${createContactDto.email} - ${createContactDto.subject}`,
    );

    const contact = await this.prisma.contact.create({
      data: {
        name: createContactDto.name,
        email: createContactDto.email,
        phone: createContactDto.phone,
        subject: createContactDto.subject,
        message: createContactDto.message,
        category: createContactDto.category || 'GENERAL',
        status: ContactStatus.PENDING,
      },
    });

    this.logger.log(`Contact created with ID: ${contact.id}`);

    return contact;
  }

  /**
   * 모든 문의 조회 (관리자용)
   */
  async findAll(
    status?: ContactStatus,
    limit = 50,
    offset = 0,
  ): Promise<{ contacts: Contact[]; total: number }> {
    const where = status ? { status } : {};

    const [contacts, total] = await Promise.all([
      this.prisma.contact.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.contact.count({ where }),
    ]);

    return { contacts, total };
  }

  /**
   * 특정 문의 조회
   */
  async findOne(id: number): Promise<Contact | null> {
    return this.prisma.contact.findUnique({
      where: { id },
    });
  }

  /**
   * 문의 상태 업데이트 (관리자용)
   */
  async updateStatus(
    id: number,
    status: ContactStatus,
    adminNote?: string,
  ): Promise<Contact> {
    this.logger.log(`Updating contact ${id} status to ${status}`);

    return this.prisma.contact.update({
      where: { id },
      data: {
        status,
        adminNote: adminNote || undefined,
        respondedAt:
          status === ContactStatus.RESOLVED || status === ContactStatus.CLOSED
            ? new Date()
            : undefined,
      },
    });
  }
}
