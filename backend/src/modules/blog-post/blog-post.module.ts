import { Module } from '@nestjs/common';
import { BlogPostController } from './blog-post.controller';
import { BlogPostService } from './blog-post.service';
import { PrismaModule } from '../../lib/database/prisma.module';
import { OpenAIModule } from '../../lib/integrations/openai/openai/openai.module';
import { NaverApiModule } from '../../lib/integrations/naver/naver-api/naver-api.module';
import { CreditModule } from '../credit/credit.module';

@Module({
  imports: [PrismaModule, OpenAIModule, NaverApiModule, CreditModule],
  controllers: [BlogPostController],
  providers: [BlogPostService],
  exports: [BlogPostService],
})
export class BlogPostModule {}
