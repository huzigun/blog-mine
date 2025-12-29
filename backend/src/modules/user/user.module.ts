import { Module, forwardRef } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { SubscriptionModule } from '@modules/subscription/subscription.module';

@Module({
  imports: [forwardRef(() => SubscriptionModule)],
  providers: [UserService],
  controllers: [UserController],
  exports: [UserService],
})
export class UserModule {}
