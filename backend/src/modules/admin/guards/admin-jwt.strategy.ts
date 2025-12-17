import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '@lib/database/prisma.service';
import { AdminRole } from '@prisma/client';

export interface AdminJwtPayload {
  sub: number; // adminId
  email: string;
  role: AdminRole;
  type: 'admin'; // 일반 사용자와 구분
}

@Injectable()
export class AdminJwtStrategy extends PassportStrategy(Strategy, 'admin-jwt') {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'your-secret-key',
    });
  }

  async validate(payload: AdminJwtPayload) {
    // type이 admin이 아니면 거부
    if (payload.type !== 'admin') {
      throw new UnauthorizedException('관리자 권한이 필요합니다.');
    }

    const admin = await this.prisma.admin.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        deletedAt: true,
      },
    });

    if (!admin || !admin.isActive || admin.deletedAt) {
      throw new UnauthorizedException('관리자 계정이 비활성화되었습니다.');
    }

    return {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
    };
  }
}
