import { Module } from '@nestjs/common';
import { AdminDeployProductsController } from './admin-deploy-products.controller';
import { AdminDeployProductsService } from './admin-deploy-products.service';

@Module({
  controllers: [AdminDeployProductsController],
  providers: [AdminDeployProductsService],
  exports: [AdminDeployProductsService],
})
export class AdminDeployProductsModule {}
