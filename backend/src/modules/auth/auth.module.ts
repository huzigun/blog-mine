import { Module } from '@nestjs/common';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { VerificationCodeService } from './verification-code.service';
import { KakaoService } from './kakao.service';
import { ConfigService } from '../../lib/config/config.service';
import { UserModule } from '../user/user.module';
import { CreditModule } from '../credit/credit.module';
import { EmailModule } from '../../lib/integrations/email/email.module';

@Module({
  imports: [
    UserModule,
    CreditModule,
    EmailModule,
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService): JwtModuleOptions => {
        // ConfigService returns string but JWT expects string | number

        const expiresIn: any = configService.jwtExpiresIn;
        return {
          secret: configService.jwtSecret,
          signOptions: {
            expiresIn,
          },
        };
      },
    }),
  ],
  providers: [AuthService, JwtStrategy, VerificationCodeService, KakaoService],
  controllers: [AuthController],
  exports: [AuthService, KakaoService, JwtModule],
})
export class AuthModule {}
