import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { SchedulerService } from './scheduler.service';
import { NaverApiModule } from '@lib/integrations/naver/naver-api/naver-api.module';
import { SchedulerController } from './scheduler.controller';
import { SubscriptionModule } from '@modules/subscription/subscription.module';
import { NotificationModule } from '@modules/notification/notification.module';

@Module({
  controllers: [SchedulerController],
  imports: [
    ScheduleModule.forRoot(),
    NaverApiModule,
    SubscriptionModule,
    NotificationModule,
  ],
  providers: [SchedulerService],
  exports: [SchedulerService],
})
export class SchedulerModule {}
