import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@lib/database/prisma.service';
import {
  AdminLoginDto,
  CreateAdminDto,
  AdminAuthResponseDto,
  AdminRefreshTokenResponseDto,
  ChangePasswordDto,
} from '../dto';
import { AdminJwtPayload } from '../guards/admin-jwt.strategy';
import { AdminRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

@Injectable()
export class AdminAuthService {
  private readonly logger = new Logger(AdminAuthService.name);
  private readonly SALT_ROUNDS = 10;
  private readonly REFRESH_TOKEN_EXPIRY_DAYS = 7;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * 관리자 로그인
   */
  async login(
    loginDto: AdminLoginDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AdminAuthResponseDto> {
    const { email, password } = loginDto;

    const admin = await this.prisma.admin.findUnique({
      where: { email },
    });

    if (!admin || admin.deletedAt) {
      throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');
    }

    if (!admin.isActive) {
      throw new UnauthorizedException('비활성화된 계정입니다. 관리자에게 문의하세요.');
    }

    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');
    }

    // 마지막 로그인 정보 업데이트
    await this.prisma.admin.update({
      where: { id: admin.id },
      data: {
        lastLoginAt: new Date(),
        lastLoginIp: ipAddress,
      },
    });

    // 활동 로그 기록
    await this.logActivity(admin.id, 'auth.login', null, null, null, ipAddress, userAgent);

    // 토큰 발급
    const accessToken = this.generateAccessToken(admin);
    const refreshToken = await this.createRefreshToken(admin.id, ipAddress, userAgent);

    return {
      accessToken,
      refreshToken,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
      },
    };
  }

  /**
   * 관리자 생성 (SUPER_ADMIN 전용)
   */
  async createAdmin(
    createDto: CreateAdminDto,
    creatorId: number,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const { email, password, name, role } = createDto;

    const existingAdmin = await this.prisma.admin.findUnique({
      where: { email },
    });

    if (existingAdmin) {
      throw new ConflictException('이미 존재하는 이메일입니다.');
    }

    const hashedPassword = await bcrypt.hash(password, this.SALT_ROUNDS);

    const admin = await this.prisma.admin.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: role || AdminRole.ADMIN,
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
    await this.logActivity(
      creatorId,
      'admin.create',
      'admin',
      admin.id,
      { email, name, role: role || AdminRole.ADMIN },
      ipAddress,
      userAgent,
    );

    this.logger.log(`Admin created: ${email} by admin ${creatorId}`);

    return admin;
  }

  /**
   * 리프레시 토큰으로 액세스 토큰 갱신
   */
  async refreshToken(
    refreshToken: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AdminRefreshTokenResponseDto> {
    const storedToken = await this.prisma.adminRefreshToken.findUnique({
      where: { token: refreshToken },
      include: {
        admin: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            isActive: true,
            deletedAt: true,
          },
        },
      },
    });

    if (!storedToken) {
      throw new UnauthorizedException('유효하지 않은 리프레시 토큰입니다.');
    }

    if (storedToken.expiresAt < new Date()) {
      await this.prisma.adminRefreshToken.delete({
        where: { id: storedToken.id },
      });
      throw new UnauthorizedException('만료된 리프레시 토큰입니다.');
    }

    if (!storedToken.admin.isActive || storedToken.admin.deletedAt) {
      throw new UnauthorizedException('비활성화된 계정입니다.');
    }

    // 마지막 사용 시간 업데이트
    await this.prisma.adminRefreshToken.update({
      where: { id: storedToken.id },
      data: {
        lastUsedAt: new Date(),
        ipAddress,
        userAgent,
      },
    });

    const accessToken = this.generateAccessToken(storedToken.admin);

    return { accessToken };
  }

  /**
   * 로그아웃
   */
  async logout(refreshToken: string, adminId: number) {
    await this.prisma.adminRefreshToken.deleteMany({
      where: {
        token: refreshToken,
        adminId,
      },
    });

    this.logger.log(`Admin ${adminId} logged out`);
  }

  /**
   * 비밀번호 변경
   */
  async changePassword(
    adminId: number,
    changePasswordDto: ChangePasswordDto,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const { currentPassword, newPassword } = changePasswordDto;

    const admin = await this.prisma.admin.findUnique({
      where: { id: adminId },
    });

    if (!admin) {
      throw new NotFoundException('관리자를 찾을 수 없습니다.');
    }

    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, admin.password);
    if (!isCurrentPasswordValid) {
      throw new BadRequestException('현재 비밀번호가 올바르지 않습니다.');
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, this.SALT_ROUNDS);

    await this.prisma.admin.update({
      where: { id: adminId },
      data: { password: hashedNewPassword },
    });

    // 모든 리프레시 토큰 무효화 (보안 강화)
    await this.prisma.adminRefreshToken.deleteMany({
      where: { adminId },
    });

    // 활동 로그 기록
    await this.logActivity(adminId, 'auth.password_change', null, null, null, ipAddress, userAgent);

    this.logger.log(`Admin ${adminId} changed password`);

    return { message: '비밀번호가 변경되었습니다. 다시 로그인해주세요.' };
  }

  /**
   * 내 정보 조회
   */
  async getProfile(adminId: number) {
    const admin = await this.prisma.admin.findUnique({
      where: { id: adminId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    if (!admin) {
      throw new NotFoundException('관리자를 찾을 수 없습니다.');
    }

    return admin;
  }

  /**
   * Access Token 생성
   */
  private generateAccessToken(admin: {
    id: number;
    email: string;
    role: AdminRole;
  }): string {
    const payload: AdminJwtPayload = {
      sub: admin.id,
      email: admin.email,
      role: admin.role,
      type: 'admin',
    };

    return this.jwtService.sign(payload, {
      expiresIn: '15m', // 관리자는 짧은 만료 시간
    });
  }

  /**
   * Refresh Token 생성 및 저장
   */
  private async createRefreshToken(
    adminId: number,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<string> {
    const token = crypto.randomBytes(64).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.REFRESH_TOKEN_EXPIRY_DAYS);

    // 기존 토큰 삭제 (한 번에 하나의 세션만 유지)
    await this.prisma.adminRefreshToken.deleteMany({
      where: { adminId },
    });

    await this.prisma.adminRefreshToken.create({
      data: {
        token,
        adminId,
        expiresAt,
        ipAddress,
        userAgent,
      },
    });

    return token;
  }

  /**
   * 활동 로그 기록
   */
  async logActivity(
    adminId: number,
    action: string,
    targetType?: string | null,
    targetId?: number | null,
    details?: Record<string, any> | null,
    ipAddress?: string,
    userAgent?: string,
  ) {
    await this.prisma.adminActivityLog.create({
      data: {
        adminId,
        action,
        targetType,
        targetId,
        details: details ?? undefined,
        ipAddress,
        userAgent,
      },
    });
  }
}
