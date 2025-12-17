import { Module, forwardRef } from '@nestjs/common';
import { CreditController } from './credit.controller';
import { CreditService } from './credit.service';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [forwardRef(() => NotificationModule)],
  controllers: [CreditController],
  providers: [CreditService],
  exports: [CreditService], // 다른 모듈에서 사용할 수 있도록 export
})
export class CreditModule {}
