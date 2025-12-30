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
import { AdminPaymentsService, AdminPaymentsController } from './payments';
import { AdminPostsService, AdminPostsController } from './posts';
import { AdminContactsService, AdminContactsController } from './contacts';
import { AdminAdminsService, AdminAdminsController } from './admins';
import { AdminPlansService, AdminPlansController } from './plans';
import { AdminDashboardService, AdminDashboardController } from './dashboard';
import {
  AdminDeployProductsService,
  AdminDeployProductsController,
} from './deploy-products';
import { AdminJwtStrategy } from './guards/admin-jwt.strategy';
import { SubscriptionModule } from '@modules/subscription/subscription.module';

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
    SubscriptionModule,
  ],
  controllers: [
    AdminAuthController,
    AdminUsersController,
    AdminSubscriptionsController,
    AdminPaymentsController,
    AdminPostsController,
    AdminContactsController,
    AdminAdminsController,
    AdminPlansController,
    AdminDashboardController,
    AdminDeployProductsController,
  ],
  providers: [
    AdminAuthService,
    AdminUsersService,
    AdminSubscriptionsService,
    AdminPaymentsService,
    AdminPostsService,
    AdminContactsService,
    AdminAdminsService,
    AdminPlansService,
    AdminDashboardService,
    AdminDeployProductsService,
    AdminJwtStrategy,
  ],
  exports: [AdminAuthService],
})
export class AdminModule {}
