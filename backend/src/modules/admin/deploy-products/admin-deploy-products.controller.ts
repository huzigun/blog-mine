import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import {
  AdminDeployProductsService,
  CreateDeployProductDto,
  UpdateDeployProductDto,
  UpdateSortOrderDto,
} from './admin-deploy-products.service';
import { AdminJwtAuthGuard } from '../guards/admin-jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';

@Controller('admin/deploy-products')
@UseGuards(AdminJwtAuthGuard, RolesGuard)
@Roles('ADMIN') // ADMIN 이상 접근 가능
export class AdminDeployProductsController {
  constructor(private readonly service: AdminDeployProductsService) {}

  /**
   * 배포 상품 목록 조회
   */
  @Get()
  async findAll() {
    return this.service.findAll();
  }

  /**
   * 배포 상품 단건 조회
   */
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  /**
   * 배포 상품 생성
   */
  @Post()
  async create(@Body() dto: CreateDeployProductDto) {
    return this.service.create(dto);
  }

  /**
   * 배포 상품 수정
   */
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDeployProductDto,
  ) {
    return this.service.update(id, dto);
  }

  /**
   * 배포 상품 삭제
   */
  @Delete(':id')
  async delete(@Param('id', ParseIntPipe) id: number) {
    return this.service.delete(id);
  }

  /**
   * 정렬 순서 일괄 업데이트
   */
  @Post('sort-orders')
  async updateSortOrders(@Body() dto: UpdateSortOrderDto) {
    await this.service.updateSortOrders(dto);
    return { success: true };
  }

  /**
   * 상품 활성화/비활성화 토글
   */
  @Patch(':id/toggle')
  async toggleActive(@Param('id', ParseIntPipe) id: number) {
    return this.service.toggleActive(id);
  }
}
