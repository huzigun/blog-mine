import { Global, Module } from '@nestjs/common';
import { DateService } from './date.service';

@Global() // 전역 모듈로 설정하여 모든 모듈에서 자동으로 사용 가능
@Module({
  providers: [DateService],
  exports: [DateService],
})
export class DateModule {}
