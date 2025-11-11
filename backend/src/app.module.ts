import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { configuration, ConfigServiceModule } from './config';
import { PrismaModule } from './prisma';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { PersonaModule } from './persona/persona.module';
import { BlogPostModule } from './blog-post/blog-post.module';
import { NaverApiModule } from './naver-api/naver-api.module';
import { DateModule } from './date';

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
    UserModule,
    AuthModule,
    PersonaModule,
    BlogPostModule,
    NaverApiModule,
  ],
  controllers: [AppController],
  providers: [AppService],
  exports: [HttpModule],
})
export class AppModule {}
