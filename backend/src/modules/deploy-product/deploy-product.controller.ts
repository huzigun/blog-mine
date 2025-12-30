import { Controller, Get } from '@nestjs/common';
import { DeployProductService } from './deploy-product.service';

@Controller('deploy-products')
export class DeployProductController {
  constructor(private readonly deployProductService: DeployProductService) {}

  /**
   * 활성화된 배포 상품 목록 조회 (공개 API)
   * GET /deploy-products
   */
  @Get()
  async getActiveProducts() {
    return this.deployProductService.findActiveProducts();
  }
}
