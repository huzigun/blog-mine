import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TokenExpiredException } from '@common/exceptions/token-expired.exception';

interface JwtError {
  name: string;
  message: string;
}

@Injectable()
export class AdminJwtAuthGuard extends AuthGuard('admin-jwt') {
  handleRequest<TUser = any>(
    err: Error | null,
    user: TUser | false,
    info: JwtError | null,
  ): TUser {
    if (info?.name === 'TokenExpiredError') {
      throw new TokenExpiredException('Token expired');
    }

    if (info?.name === 'JsonWebTokenError') {
      throw new TokenExpiredException('Invalid token');
    }

    if (err || !user) {
      throw err || new TokenExpiredException('Authentication failed');
    }

    return user;
  }
}
