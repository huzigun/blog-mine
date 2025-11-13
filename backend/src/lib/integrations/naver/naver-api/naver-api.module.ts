import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { NaverApiService } from './naver-api.service';
import { BlogRankService } from './blog-rank.service';
import { PrismaModule } from '../../../../lib/database/prisma.module';

@Module({
  imports: [
    HttpModule.register({
      timeout: 10000, // 10초 타임아웃
      maxRedirects: 5,
    }),
    PrismaModule,
  ],
  providers: [NaverApiService, BlogRankService],
  exports: [NaverApiService, BlogRankService],
})
export class NaverApiModule {}
