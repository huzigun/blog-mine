import {
  Injectable,
  Logger,
  OnModuleInit,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../lib/database/prisma.service';
import { ConfigService } from '../../lib/config/config.service';
import { UpdateBusinessInfoDto, ChangePasswordDto } from './dto';
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
  async upsertBusinessInfo(userId: number, dto: UpdateBusinessInfoDto) {
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

  /**
   * 비밀번호 변경
   */
  async changePassword(userId: number, dto: ChangePasswordDto) {
    // 사용자 조회
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    // 현재 비밀번호 확인
    const isCurrentPasswordValid = await this.validatePassword(
      dto.currentPassword,
      user.password,
    );

    if (!isCurrentPasswordValid) {
      throw new BadRequestException('현재 비밀번호가 일치하지 않습니다.');
    }

    // 새 비밀번호가 현재 비밀번호와 같은지 확인
    const isSameAsOld = await this.validatePassword(
      dto.newPassword,
      user.password,
    );

    if (isSameAsOld) {
      throw new BadRequestException(
        '새 비밀번호는 현재 비밀번호와 달라야 합니다.',
      );
    }

    // 새 비밀번호 암호화
    const hashedNewPassword = await bcrypt.hash(
      dto.newPassword,
      this.SALT_ROUNDS,
    );

    // 비밀번호 업데이트
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedNewPassword,
      },
    });

    return { success: true, message: '비밀번호가 성공적으로 변경되었습니다.' };
  }
}
