import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { SchedulerService } from './scheduler.service';
import { NaverApiModule } from '@lib/integrations/naver/naver-api/naver-api.module';

@Module({
  imports: [ScheduleModule.forRoot(), NaverApiModule],
  providers: [SchedulerService],
  exports: [SchedulerService],
})
export class SchedulerModule {}
