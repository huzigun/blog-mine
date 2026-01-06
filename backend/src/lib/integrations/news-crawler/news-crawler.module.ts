import { Module } from '@nestjs/common';
import { NewsCrawlerService } from './news-crawler.service';

@Module({
  providers: [NewsCrawlerService],
  exports: [NewsCrawlerService],
})
export class NewsCrawlerModule {}
