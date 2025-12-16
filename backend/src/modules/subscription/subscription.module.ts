import { Module } from '@nestjs/common';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionService } from './subscription.service';
import { CreditModule } from '../credit/credit.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [CreditModule, NotificationModule],
  controllers: [SubscriptionController],
  providers: [SubscriptionService],
  exports: [SubscriptionService],
})
export class SubscriptionModule {}
