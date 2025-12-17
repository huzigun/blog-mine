import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AdminRole } from '@prisma/client';

export interface CurrentAdminData {
  id: number;
  email: string;
  name: string;
  role: AdminRole;
}

export const CurrentAdmin = createParamDecorator(
  (data: keyof CurrentAdminData | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const admin = request.user as CurrentAdminData;

    if (data) {
      return admin?.[data];
    }

    return admin;
  },
);
