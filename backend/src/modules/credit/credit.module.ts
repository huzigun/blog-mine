import { Module } from '@nestjs/common';
import { CreditController } from './credit.controller';
import { CreditService } from './credit.service';

@Module({
  controllers: [CreditController],
  providers: [CreditService],
  exports: [CreditService], // 다른 모듈에서 사용할 수 있도록 export
})
export class CreditModule {}
