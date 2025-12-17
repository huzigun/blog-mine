import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AdminAuthService, AdminAuthController } from './auth';
import { AdminUsersService, AdminUsersController } from './users';
import {
  AdminSubscriptionsService,
  AdminSubscriptionsController,
} from './subscriptions';
import {
  AdminPaymentsService,
  AdminPaymentsController,
} from './payments';
import { AdminJwtStrategy } from './guards/admin-jwt.strategy';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'admin-jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: '15m', // 관리자는 짧은 만료 시간
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [
    AdminAuthController,
    AdminUsersController,
    AdminSubscriptionsController,
    AdminPaymentsController,
  ],
  providers: [
    AdminAuthService,
    AdminUsersService,
    AdminSubscriptionsService,
    AdminPaymentsService,
    AdminJwtStrategy,
  ],
  exports: [AdminAuthService],
})
export class AdminModule {}
