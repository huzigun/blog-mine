import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../lib/database/prisma.service';
import { ConfigService } from '../../lib/config/config.service';
import { UpdateBusinessInfoDto } from './dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService implements OnModuleInit {
  private readonly logger = new Logger(UserService.name);
  private readonly SALT_ROUNDS = 10;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    await this.createSeedUserIfNotExists();
  }

  private async createSeedUserIfNotExists() {
    const seedEmail = this.configService.seedUserEmail;
    const seedName = this.configService.seedUserName;
    const seedPassword = this.configService.seedUserPassword;

    // Seed user 정보가 없으면 스킵
    if (!seedEmail || !seedPassword) {
      this.logger.log('Seed user configuration not found, skipping...');
      return;
    }

    try {
      // 이미 존재하는지 확인
      const existingUser = await this.prisma.user.findUnique({
        where: { email: seedEmail },
      });

      if (existingUser) {
        this.logger.log(`Seed user already exists: ${seedEmail}`);
        return;
      }

      // 비밀번호 암호화
      const hashedPassword = await bcrypt.hash(seedPassword, this.SALT_ROUNDS);

      // Seed user 생성
      const user = await this.prisma.user.create({
        data: {
          email: seedEmail,
          name: seedName ?? undefined,
          password: hashedPassword,
        },
      });

      this.logger.log(`Seed user created successfully: ${user.email}`);
    } catch (error) {
      this.logger.error('Failed to create seed user', error);
      throw error;
    }
  }

  async findById(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async validatePassword(
    plainPassword: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  /**
   * 사용자의 사업자 정보 조회
   */
  async getBusinessInfo(userId: number) {
    return this.prisma.businessInfo.findUnique({
      where: { userId },
    });
  }

  /**
   * 사용자의 사업자 정보 생성 또는 업데이트
   */
  async upsertBusinessInfo(
    userId: number,
    dto: UpdateBusinessInfoDto,
  ) {
    return this.prisma.businessInfo.upsert({
      where: { userId },
      create: {
        userId,
        ...dto,
      },
      update: dto,
    });
  }

  /**
   * 사용자 정보 조회 (사업자 정보 포함)
   */
  async findByIdWithBusinessInfo(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        businessInfo: true,
      },
    });
  }
}
