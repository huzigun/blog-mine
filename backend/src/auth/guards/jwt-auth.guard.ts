import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TokenExpiredException } from '../../common/exceptions/token-expired.exception';

interface JwtError {
  name: string;
  message: string;
}

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  /**
   * Handle authentication errors from passport-jwt
   * Convert JWT expiration errors to 498 status code
   */
  handleRequest<TUser = any>(
    err: Error | null,
    user: TUser | false,
    info: JwtError | null,
  ): TUser {
    // Check if token is expired (passport-jwt provides this info)
    if (info?.name === 'TokenExpiredError') {
      throw new TokenExpiredException('Token expired');
    }

    // Check for other JWT errors
    if (info?.name === 'JsonWebTokenError') {
      throw new TokenExpiredException('Invalid token');
    }

    // Handle other errors or missing user
    if (err || !user) {
      throw err || new TokenExpiredException('Authentication failed');
    }

    return user;
  }
}
