import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AdminRole } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';

// 역할 계층 정의 (높은 권한이 낮은 권한 포함)
const ROLE_HIERARCHY: Record<AdminRole, AdminRole[]> = {
  SUPER_ADMIN: ['SUPER_ADMIN', 'ADMIN', 'SUPPORT', 'VIEWER'],
  ADMIN: ['ADMIN', 'SUPPORT', 'VIEWER'],
  SUPPORT: ['SUPPORT', 'VIEWER'],
  VIEWER: ['VIEWER'],
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<AdminRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // 역할 제한이 없으면 통과
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user?.role) {
      throw new ForbiddenException('권한이 없습니다.');
    }

    // 사용자 역할이 가진 모든 권한
    const userPermissions = ROLE_HIERARCHY[user.role as AdminRole] || [];

    // 필요한 역할 중 하나라도 사용자가 가지고 있으면 통과
    const hasPermission = requiredRoles.some((role) =>
      userPermissions.includes(role),
    );

    if (!hasPermission) {
      throw new ForbiddenException('이 작업을 수행할 권한이 없습니다.');
    }

    return true;
  }
}
