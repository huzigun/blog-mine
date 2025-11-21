import { Module } from '@nestjs/common';
import { KeywordTrackingService } from './keyword-tracking.service';
import { KeywordTrackingController } from './keyword-tracking.controller';
import { PrismaModule } from '@lib/database/prisma.module';
import { NaverApiModule } from '@lib/integrations/naver/naver-api/naver-api.module';

@Module({
  imports: [PrismaModule, NaverApiModule],
  controllers: [KeywordTrackingController],
  providers: [KeywordTrackingService],
  exports: [KeywordTrackingService],
})
export class KeywordTrackingModule {}
