import { Module, forwardRef } from '@nestjs/common';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { AuthModule } from '@modules/auth/auth.module';
import { UserModule } from '@modules/user/user.module';
import { SseAuthGuard } from '@modules/auth/guards/sse-auth.guard';

@Module({
  imports: [
    forwardRef(() => AuthModule), // forwardRef로 순환 의존성 해결
    UserModule,
  ],
  controllers: [NotificationController],
  providers: [NotificationService, SseAuthGuard],
  exports: [NotificationService], // 다른 모듈에서 알림 발송할 수 있도록 export
})
export class NotificationModule {}
