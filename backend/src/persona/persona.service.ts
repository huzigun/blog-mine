import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreatePersonaDto,
  UpdatePersonaDto,
  PaginationDto,
  PaginatedResult,
} from './dto';
import { Persona } from '@prisma/client';

@Injectable()
export class PersonaService {
  constructor(private prisma: PrismaService) {}

  /**
   * 새로운 페르소나를 생성합니다.
   */
  async create(
    userId: number,
    createPersonaDto: CreatePersonaDto,
  ): Promise<Persona> {
    return this.prisma.persona.create({
      data: {
        ...createPersonaDto,
        userId,
      },
    });
  }

  /**
   * 모든 페르소나를 페이지네이션과 함께 조회합니다.
   */
  async findAll(
    paginationDto: PaginationDto,
  ): Promise<PaginatedResult<Persona>> {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.persona.findMany({
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.persona.count(),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  /**
   * 특정 사용자의 모든 페르소나를 페이지네이션과 함께 조회합니다.
   */
  async findByUserId(
    userId: number,
    paginationDto: PaginationDto,
  ): Promise<PaginatedResult<Persona>> {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.persona.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.persona.count({
        where: { userId },
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  /**
   * ID로 특정 페르소나를 조회합니다.
   */
  async findOne(id: number): Promise<Persona> {
    const persona = await this.prisma.persona.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    if (!persona) {
      throw new NotFoundException(`Persona with ID ${id} not found`);
    }

    return persona;
  }

  /**
   * 페르소나 정보를 수정합니다.
   */
  async update(
    id: number,
    userId: number,
    updatePersonaDto: UpdatePersonaDto,
  ): Promise<Persona> {
    // 페르소나가 존재하는지 확인
    const persona = await this.findOne(id);

    // 소유자 확인
    if (persona.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to update this persona',
      );
    }

    return this.prisma.persona.update({
      where: { id },
      data: updatePersonaDto,
    });
  }

  /**
   * 페르소나를 삭제합니다.
   */
  async remove(id: number, userId: number): Promise<Persona> {
    // 페르소나가 존재하는지 확인
    const persona = await this.findOne(id);

    // 소유자 확인
    if (persona.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to delete this persona',
      );
    }

    return this.prisma.persona.delete({
      where: { id },
    });
  }
}
