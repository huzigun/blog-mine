import { Module } from '@nestjs/common';
import { DeployProductController } from './deploy-product.controller';
import { DeployProductService } from './deploy-product.service';

@Module({
  controllers: [DeployProductController],
  providers: [DeployProductService],
  exports: [DeployProductService],
})
export class DeployProductModule {}
