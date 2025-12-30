import { Module } from '@nestjs/common';
import { BlogPostController } from './blog-post.controller';
import { BlogPostService } from './blog-post.service';
import { DeployService } from './deploy.service';
import { PrismaModule } from '../../lib/database/prisma.module';
import { OpenAIModule } from '../../lib/integrations/openai/openai/openai.module';
import { NaverApiModule } from '../../lib/integrations/naver/naver-api/naver-api.module';
import { CreditModule } from '../credit/credit.module';
import { PromptLogModule } from '@lib/integrations/openai/prompt-log';
import { NotificationModule } from '../notification/notification.module';
import { SubscriptionModule } from '../subscription/subscription.module';
import { HelloDmModule } from '@lib/integrations/hello-dm/hello-dm.module';
import { S3Module } from '@lib/integrations/s3';

@Module({
  imports: [
    PrismaModule,
    OpenAIModule,
    NaverApiModule,
    CreditModule,
    PromptLogModule,
    NotificationModule,
    SubscriptionModule,
    HelloDmModule,
    S3Module,
  ],
  controllers: [BlogPostController],
  providers: [BlogPostService, DeployService],
  exports: [BlogPostService, DeployService],
})
export class BlogPostModule {}
