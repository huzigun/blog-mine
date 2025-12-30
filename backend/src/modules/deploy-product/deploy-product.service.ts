import { Injectable } from '@nestjs/common';
import { PrismaService } from '@lib/database/prisma.service';
import { DeployProduct, Prisma } from '@prisma/client';

@Injectable()
export class DeployProductService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 활성화된 배포 상품 목록 조회 (정렬순)
   */
  async findActiveProducts(): Promise<DeployProduct[]> {
    return this.prisma.deployProduct.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  /**
   * 모든 배포 상품 목록 조회 (어드민용)
   */
  async findAll(): Promise<DeployProduct[]> {
    return this.prisma.deployProduct.findMany({
      orderBy: { sortOrder: 'asc' },
    });
  }

  /**
   * 배포 상품 단건 조회
   */
  async findById(id: number): Promise<DeployProduct | null> {
    return this.prisma.deployProduct.findUnique({
      where: { id },
    });
  }

  /**
   * 배포 상품 생성
   */
  async create(data: Prisma.DeployProductCreateInput): Promise<DeployProduct> {
    return this.prisma.deployProduct.create({ data });
  }

  /**
   * 배포 상품 수정
   */
  async update(
    id: number,
    data: Prisma.DeployProductUpdateInput,
  ): Promise<DeployProduct> {
    return this.prisma.deployProduct.update({
      where: { id },
      data,
    });
  }

  /**
   * 배포 상품 삭제 (soft delete 대신 isActive = false)
   */
  async deactivate(id: number): Promise<DeployProduct> {
    return this.prisma.deployProduct.update({
      where: { id },
      data: { isActive: false },
    });
  }

  /**
   * 배포 상품 활성화
   */
  async activate(id: number): Promise<DeployProduct> {
    return this.prisma.deployProduct.update({
      where: { id },
      data: { isActive: true },
    });
  }

  /**
   * 정렬 순서 일괄 업데이트
   */
  async updateSortOrders(
    items: { id: number; sortOrder: number }[],
  ): Promise<void> {
    await this.prisma.$transaction(
      items.map((item) =>
        this.prisma.deployProduct.update({
          where: { id: item.id },
          data: { sortOrder: item.sortOrder },
        }),
      ),
    );
  }
}
