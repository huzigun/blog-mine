import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@lib/config/config.service';
import { UserService } from '../../user/user.service';
import { JwtPayload, RequestUser } from '../strategies/jwt.strategy';
import { TokenExpiredException } from '@common/exceptions/token-expired.exception';

/**
 * SSE 연결을 위한 쿼리스트링 토큰 인증 가드
 * EventSource는 커스텀 헤더를 지원하지 않아 쿼리스트링으로 토큰을 전달받음
 */
@Injectable()
export class SseAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly userService: UserService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // 쿼리스트링에서 토큰 추출
    const token = request.query?.token as string;

    if (!token) {
      throw new UnauthorizedException('Token is required for SSE connection');
    }

    try {
      // JWT 검증
      const payload = this.jwtService.verify<JwtPayload>(token, {
        secret: this.configService.jwtSecret,
      });

      // 사용자 조회
      const user = await this.userService.findById(payload.sub);

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // request에 user 정보 추가 (기존 JwtAuthGuard와 동일한 형식)
      const requestUser: RequestUser = {
        id: user.id,
        email: user.email,
        name: user.name,
      };

      request.user = requestUser;

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      // JWT 에러 처리
      if (error instanceof Error) {
        if (error.name === 'TokenExpiredError') {
          throw new TokenExpiredException('Token expired');
        }
        if (error.name === 'JsonWebTokenError') {
          throw new TokenExpiredException('Invalid token');
        }
      }

      throw new UnauthorizedException('Authentication failed');
    }
  }
}
