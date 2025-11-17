import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { SubscriptionService } from '../subscription.service';

/**
 * 활성 구독 검증 가드
 * - 크레딧 소모 등 구독이 필요한 기능에 적용
 * - ACTIVE 또는 TRIAL 상태만 허용
 */
@Injectable()
export class ActiveSubscriptionGuard implements CanActivate {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;

    if (!userId) {
      throw new ForbiddenException('인증이 필요합니다.');
    }

    const subscription =
      await this.subscriptionService.getCurrentSubscription(userId);

    if (!subscription) {
      throw new ForbiddenException(
        '활성 구독을 찾을 수 없습니다. 플랜을 선택해주세요.',
      );
    }

    // 만료 날짜 체크
    if (new Date() > subscription.expiresAt) {
      throw new ForbiddenException(
        '구독이 만료되었습니다. 구독을 갱신해주세요.',
      );
    }

    return true;
  }
}
