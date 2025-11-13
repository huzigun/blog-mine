import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { RequestUser } from '../strategies/jwt.strategy';

interface RequestWithUser extends Request {
  user: RequestUser;
}

export const GetRequestUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): RequestUser => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    return request.user;
  },
);
