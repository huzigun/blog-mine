import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@lib/database/prisma.service';
import { Prisma, AdminRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

export interface AdminAdminsQuery {
  page?: number;
  limit?: number;
  search?: string;
  role?: 'all' | AdminRole;
  isActive?: 'all' | 'true' | 'false';
  sortBy?: 'createdAt' | 'name' | 'email' | 'lastLoginAt';
  sortOrder?: 'asc' | 'desc';
}

export interface CreateAdminDto {
  email: string;
  password: string;
  name: string;
  role: AdminRole;
}

export interface UpdateAdminDto {
  name?: string;
  role?: AdminRole;
  isActive?: boolean;
}

export interface ResetPasswordDto {
  newPassword: string;
}

@Injectable()
export class AdminAdminsService {
  private readonly SALT_ROUNDS = 10;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 관리자 목록 조회 (SUPER_ADMIN 전용)
   */
  async findAll(query: AdminAdminsQuery) {
    const {
      page = 1,
      limit = 20,
      search,
      role = 'all',
      isActive = 'all',
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 20;
    const skip = (pageNum - 1) * limitNum;

    const where: Prisma.AdminWhereInput = {
      deletedAt: null, // 삭제되지 않은 관리자만
    };

    // 검색 조건
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }

    // 역할 필터
    if (role !== 'all') {
      where.role = role;
    }

    // 활성화 상태 필터
    if (isActive !== 'all') {
      where.isActive = isActive === 'true';
    }

    const orderBy: Prisma.AdminOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    const total = await this.prisma.admin.count({ where });

    const admins = await this.prisma.admin.findMany({
      where,
      skip,
      take: limitNum,
      orderBy,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        lastLoginIp: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      data: admins,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  /**
   * 관리자 상세 조회
   */
  async findOne(adminId: number) {
    const admin = await this.prisma.admin.findFirst({
      where: {
        id: adminId,
        deletedAt: null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        lastLoginIp: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            activityLogs: true,
          },
        },
      },
    });

    if (!admin) {
      throw new NotFoundException('관리자를 찾을 수 없습니다.');
    }

    return {
      ...admin,
      activityLogsCount: admin._count.activityLogs,
      _count: undefined,
    };
  }

  /**
   * 관리자 통계 조회
   */
  async getStats() {
    const [
      totalAdmins,
      activeAdmins,
      inactiveAdmins,
      superAdmins,
      normalAdmins,
      supportAdmins,
      viewerAdmins,
    ] = await Promise.all([
      this.prisma.admin.count({ where: { deletedAt: null } }),
      this.prisma.admin.count({ where: { deletedAt: null, isActive: true } }),
      this.prisma.admin.count({ where: { deletedAt: null, isActive: false } }),
      this.prisma.admin.count({
        where: { deletedAt: null, role: 'SUPER_ADMIN' },
      }),
      this.prisma.admin.count({ where: { deletedAt: null, role: 'ADMIN' } }),
      this.prisma.admin.count({ where: { deletedAt: null, role: 'SUPPORT' } }),
      this.prisma.admin.count({ where: { deletedAt: null, role: 'VIEWER' } }),
    ]);

    return {
      totalAdmins,
      activeAdmins,
      inactiveAdmins,
      superAdmins,
      normalAdmins,
      supportAdmins,
      viewerAdmins,
    };
  }

  /**
   * 관리자 생성
   */
  async create(dto: CreateAdminDto, creatorId: number) {
    const existingAdmin = await this.prisma.admin.findUnique({
      where: { email: dto.email },
    });

    if (existingAdmin) {
      throw new ConflictException('이미 존재하는 이메일입니다.');
    }

    const hashedPassword = await bcrypt.hash(dto.password, this.SALT_ROUNDS);

    const admin = await this.prisma.admin.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        name: dto.name,
        role: dto.role,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    // 활동 로그 기록
    await this.prisma.adminActivityLog.create({
      data: {
        adminId: creatorId,
        action: 'admin.create',
        targetType: 'admin',
        targetId: admin.id,
        details: {
          newValue: {
            email: admin.email,
            name: admin.name,
            role: admin.role,
          },
        },
      },
    });

    return {
      ...admin,
      message: '관리자가 생성되었습니다.',
    };
  }

  /**
   * 관리자 정보 수정
   */
  async update(adminId: number, dto: UpdateAdminDto, updaterId: number) {
    const admin = await this.prisma.admin.findFirst({
      where: { id: adminId, deletedAt: null },
    });

    if (!admin) {
      throw new NotFoundException('관리자를 찾을 수 없습니다.');
    }

    // 자기 자신의 역할은 변경 불가
    if (adminId === updaterId && dto.role && dto.role !== admin.role) {
      throw new BadRequestException('자신의 역할은 변경할 수 없습니다.');
    }

    // 자기 자신의 활성화 상태는 변경 불가
    if (adminId === updaterId && dto.isActive === false) {
      throw new BadRequestException('자신의 계정을 비활성화할 수 없습니다.');
    }

    const oldValue = {
      name: admin.name,
      role: admin.role,
      isActive: admin.isActive,
    };

    const updated = await this.prisma.admin.update({
      where: { id: adminId },
      data: {
        name: dto.name,
        role: dto.role,
        isActive: dto.isActive,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        updatedAt: true,
      },
    });

    // 활동 로그 기록
    await this.prisma.adminActivityLog.create({
      data: {
        adminId: updaterId,
        action: 'admin.update',
        targetType: 'admin',
        targetId: adminId,
        details: {
          oldValue,
          newValue: {
            name: updated.name,
            role: updated.role,
            isActive: updated.isActive,
          },
        },
      },
    });

    return {
      ...updated,
      message: '관리자 정보가 수정되었습니다.',
    };
  }

  /**
   * 관리자 비밀번호 재설정
   */
  async resetPassword(
    adminId: number,
    dto: ResetPasswordDto,
    updaterId: number,
  ) {
    const admin = await this.prisma.admin.findFirst({
      where: { id: adminId, deletedAt: null },
    });

    if (!admin) {
      throw new NotFoundException('관리자를 찾을 수 없습니다.');
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, this.SALT_ROUNDS);

    await this.prisma.admin.update({
      where: { id: adminId },
      data: { password: hashedPassword },
    });

    // 해당 관리자의 모든 리프레시 토큰 무효화
    await this.prisma.adminRefreshToken.deleteMany({
      where: { adminId },
    });

    // 활동 로그 기록
    await this.prisma.adminActivityLog.create({
      data: {
        adminId: updaterId,
        action: 'admin.reset_password',
        targetType: 'admin',
        targetId: adminId,
      },
    });

    return {
      message: '비밀번호가 재설정되었습니다.',
    };
  }

  /**
   * 관리자 삭제 (소프트 삭제)
   */
  async remove(adminId: number, deleterId: number) {
    const admin = await this.prisma.admin.findFirst({
      where: { id: adminId, deletedAt: null },
    });

    if (!admin) {
      throw new NotFoundException('관리자를 찾을 수 없습니다.');
    }

    // 자기 자신은 삭제 불가
    if (adminId === deleterId) {
      throw new BadRequestException('자신의 계정은 삭제할 수 없습니다.');
    }

    // 소프트 삭제
    await this.prisma.admin.update({
      where: { id: adminId },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });

    // 해당 관리자의 모든 리프레시 토큰 삭제
    await this.prisma.adminRefreshToken.deleteMany({
      where: { adminId },
    });

    // 활동 로그 기록
    await this.prisma.adminActivityLog.create({
      data: {
        adminId: deleterId,
        action: 'admin.delete',
        targetType: 'admin',
        targetId: adminId,
        details: {
          deletedAdmin: {
            email: admin.email,
            name: admin.name,
            role: admin.role,
          },
        },
      },
    });

    return {
      message: '관리자가 삭제되었습니다.',
    };
  }

  /**
   * 관리자 활동 로그 조회
   */
  async getActivityLogs(adminId: number, page = 1, limit = 20) {
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 20;
    const skip = (pageNum - 1) * limitNum;

    const admin = await this.prisma.admin.findFirst({
      where: { id: adminId, deletedAt: null },
    });

    if (!admin) {
      throw new NotFoundException('관리자를 찾을 수 없습니다.');
    }

    const total = await this.prisma.adminActivityLog.count({
      where: { adminId },
    });

    const logs = await this.prisma.adminActivityLog.findMany({
      where: { adminId },
      skip,
      take: limitNum,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        action: true,
        targetType: true,
        targetId: true,
        details: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
      },
    });

    return {
      data: logs,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }
}
