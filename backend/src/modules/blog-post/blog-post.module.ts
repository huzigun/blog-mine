import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { BlogPostController } from './blog-post.controller';
import { BlogPostService } from './blog-post.service';
import { PrismaModule } from '../../lib/database/prisma.module';
import { OpenAIModule } from '../../lib/integrations/openai/openai/openai.module';
import { NaverApiModule } from '../../lib/integrations/naver/naver-api/naver-api.module';
import { CreditModule } from '../credit/credit.module';
import { PromptLogModule } from '@lib/integrations/openai/prompt-log';
import { NotificationModule } from '../notification/notification.module';
import { SubscriptionModule } from '../subscription/subscription.module';
import { OrderService } from './order.service';

@Module({
  imports: [
    PrismaModule,
    OpenAIModule,
    NaverApiModule,
    CreditModule,
    PromptLogModule,
    NotificationModule,
    SubscriptionModule,
    HttpModule,
  ],
  controllers: [BlogPostController],
  providers: [BlogPostService, OrderService],
  exports: [BlogPostService, OrderService],
})
export class BlogPostModule {}
