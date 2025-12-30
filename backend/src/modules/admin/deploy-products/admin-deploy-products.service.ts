import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@lib/database/prisma.service';
import { DeployProduct } from '@prisma/client';

export interface CreateDeployProductDto {
  itemId: number;
  name: string;
  tag: string;
  credit: number;
  description?: string;
  features: string[];
  sortOrder?: number;
  isActive?: boolean;
}

export interface UpdateDeployProductDto {
  itemId?: number;
  name?: string;
  tag?: string;
  credit?: number;
  description?: string;
  features?: string[];
  sortOrder?: number;
  isActive?: boolean;
}

export interface UpdateSortOrderDto {
  items: { id: number; sortOrder: number }[];
}

@Injectable()
export class AdminDeployProductsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 모든 배포 상품 목록 조회
   */
  async findAll(): Promise<DeployProduct[]> {
    return this.prisma.deployProduct.findMany({
      orderBy: { sortOrder: 'asc' },
    });
  }

  /**
   * 배포 상품 단건 조회
   */
  async findOne(id: number): Promise<DeployProduct> {
    const product = await this.prisma.deployProduct.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException(`배포 상품을 찾을 수 없습니다. (ID: ${id})`);
    }

    return product;
  }

  /**
   * 배포 상품 생성
   */
  async create(dto: CreateDeployProductDto): Promise<DeployProduct> {
    // 현재 최대 sortOrder 조회
    const maxSortOrder = await this.prisma.deployProduct.aggregate({
      _max: { sortOrder: true },
    });

    return this.prisma.deployProduct.create({
      data: {
        itemId: dto.itemId,
        name: dto.name,
        tag: dto.tag,
        credit: dto.credit,
        description: dto.description,
        features: dto.features,
        sortOrder: dto.sortOrder ?? (maxSortOrder._max.sortOrder ?? 0) + 1,
        isActive: dto.isActive ?? true,
      },
    });
  }

  /**
   * 배포 상품 수정
   */
  async update(
    id: number,
    dto: UpdateDeployProductDto,
  ): Promise<DeployProduct> {
    // 존재 여부 확인
    await this.findOne(id);

    return this.prisma.deployProduct.update({
      where: { id },
      data: dto,
    });
  }

  /**
   * 배포 상품 삭제
   */
  async delete(id: number): Promise<DeployProduct> {
    // 존재 여부 확인
    await this.findOne(id);

    return this.prisma.deployProduct.delete({
      where: { id },
    });
  }

  /**
   * 정렬 순서 일괄 업데이트
   */
  async updateSortOrders(dto: UpdateSortOrderDto): Promise<void> {
    await this.prisma.$transaction(
      dto.items.map((item) =>
        this.prisma.deployProduct.update({
          where: { id: item.id },
          data: { sortOrder: item.sortOrder },
        }),
      ),
    );
  }

  /**
   * 상품 활성화/비활성화 토글
   */
  async toggleActive(id: number): Promise<DeployProduct> {
    const product = await this.findOne(id);

    return this.prisma.deployProduct.update({
      where: { id },
      data: { isActive: !product.isActive },
    });
  }
}
