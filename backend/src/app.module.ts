import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { configuration, ConfigServiceModule } from './lib/config';
import { PrismaModule } from './lib/database';
import { UserModule } from './modules/user/user.module';
import { AuthModule } from './modules/auth/auth.module';
import { PersonaModule } from './modules/persona/persona.module';
import { BlogPostModule } from './modules/blog-post/blog-post.module';
import { CardModule } from './modules/card/card.module';
import { CreditModule } from './modules/credit/credit.module';
import { SubscriptionModule } from './modules/subscription/subscription.module';
import { KeywordTrackingModule } from './modules/keyword-tracking/keyword-tracking.module';
import { ContactModule } from './modules/contact/contact.module';
import { PaymentModule } from './modules/payment/payment.module';
import { NotificationModule } from './modules/notification/notification.module';
import { AdminModule } from './modules/admin/admin.module';
import { NaverApiModule } from './lib/integrations/naver/naver-api/naver-api.module';
import { NicepayModule } from './lib/integrations/nicepay/nicepay.module';
import { EmailModule } from './lib/integrations/email/email.module';
import { DateModule } from './lib/date';
import { SchedulerModule } from './lib/scheduler';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath:
        process.env.NODE_ENV === 'production'
          ? '.env' // Production: backend/.env
          : '.env.development', // Development: backend/.env.development
      cache: true,
    }),
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 5,
    }),
    ConfigServiceModule,
    DateModule,
    PrismaModule,
    SchedulerModule,
    NicepayModule,
    EmailModule,
    UserModule,
    AuthModule,
    PersonaModule,
    BlogPostModule,
    CardModule,
    CreditModule,
    PaymentModule,
    SubscriptionModule,
    KeywordTrackingModule,
    ContactModule,
    NotificationModule,
    AdminModule,
    NaverApiModule,
  ],
  controllers: [AppController],
  providers: [AppService],
  exports: [HttpModule],
})
export class AppModule {}
