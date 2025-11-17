import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { RequestUser } from '../strategies/jwt.strategy';

interface RequestWithUser extends Request {
  user: RequestUser;
}

export const GetRequestUser = createParamDecorator(
  (data: keyof RequestUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    // If data is provided (e.g., 'id'), return that specific property
    // Otherwise return the entire user object
    return data ? user?.[data] : user;
  },
);
