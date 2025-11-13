import { Global, Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { NiceBillingService } from './nice.billing.service';

@Global()
@Module({
  imports: [HttpModule],
  providers: [NiceBillingService],
  exports: [NiceBillingService],
})
export class NicepayModule {}
