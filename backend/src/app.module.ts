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
import { NaverApiModule } from './lib/integrations/naver/naver-api/naver-api.module';
import { NicepayModule } from './lib/integrations/nicepay/nicepay.module';
import { DateModule } from './lib/date';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: [`.env.${process.env.NODE_ENV || 'development'}`, '.env'],
      cache: true,
    }),
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 5,
    }),
    ConfigServiceModule,
    DateModule,
    PrismaModule,
    NicepayModule,
    UserModule,
    AuthModule,
    PersonaModule,
    BlogPostModule,
    CardModule,
    CreditModule,
    NaverApiModule,
  ],
  controllers: [AppController],
  providers: [AppService],
  exports: [HttpModule],
})
export class AppModule {}
