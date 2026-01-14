import {
  Injectable,
  Logger,
  OnModuleInit,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../lib/database/prisma.service';
import { ConfigService } from '../../lib/config/config.service';
import {
  UpdateBusinessInfoDto,
  ChangePasswordDto,
  ChangeEmailRequestDto,
  VerifyEmailChangeDto,
  SetPasswordDto,
} from './dto';
import * as bcrypt from 'bcryptjs';

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

  async findById(id: number, includeDeleted: boolean = false) {
    return this.prisma.user.findUnique({
      where: {
        id,
        ...(includeDeleted ? {} : { deletedAt: null }),
      },
    });
  }

  async findByEmail(email: string, includeDeleted: boolean = false) {
    return this.prisma.user.findUnique({
      where: {
        email,
        ...(includeDeleted ? {} : { deletedAt: null }),
      },
    });
  }

  async findByKakaoId(kakaoId: string, includeDeleted: boolean = false) {
    return this.prisma.user.findUnique({
      where: {
        kakaoId,
        ...(includeDeleted ? {} : { deletedAt: null }),
      },
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
   * 사용자 정보 조회 (사업자 정보, 구독, 크레딧 포함)
   */
  async findByIdWithBusinessInfo(id: number, includeDeleted: boolean = false) {
    return this.prisma.user.findUnique({
      where: {
        id,
        ...(includeDeleted ? {} : { deletedAt: null }),
      },
      include: {
        businessInfo: true,
        subscriptions: {
          where: {
            status: {
              in: ['ACTIVE', 'TRIAL'],
            },
          },
          include: {
            plan: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
        creditAccount: true,
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

    if (!user.password) {
      throw new BadRequestException('비밀번호가 설정되지 않은 사용자입니다.');
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

  /**
   * 이메일 변경 요청 (인증 코드 전송)
   */
  async requestEmailChange(userId: number, dto: ChangeEmailRequestDto) {
    const { newEmail } = dto;

    // 새 이메일이 이미 사용 중인지 확인
    const existingUser = await this.prisma.user.findUnique({
      where: { email: newEmail },
    });

    if (existingUser) {
      throw new ConflictException('이미 사용 중인 이메일입니다.');
    }

    // 현재 사용자 정보 확인
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    if (user.email === newEmail) {
      throw new BadRequestException('현재 이메일과 동일합니다.');
    }

    // 인증 코드는 AuthService의 sendVerificationCode를 재사용
    // 여기서는 검증만 하고 실제 코드 전송은 컨트롤러에서 처리
    return {
      success: true,
      message: '새 이메일로 인증 코드가 전송되었습니다.',
    };
  }

  /**
   * 이메일 변경 확인 (인증 코드 검증 후 이메일 업데이트)
   */
  async verifyAndChangeEmail(userId: number, dto: VerifyEmailChangeDto) {
    const { email } = dto;

    // 이메일이 이미 사용 중인지 다시 확인
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser && existingUser.id !== userId) {
      throw new ConflictException('이미 사용 중인 이메일입니다.');
    }

    // 이메일 업데이트
    await this.prisma.user.update({
      where: { id: userId },
      data: { email },
    });

    this.logger.log(`User ${userId} changed email to ${email}`);

    return {
      success: true,
      message: '이메일이 성공적으로 변경되었습니다.',
    };
  }

  /**
   * 비밀번호 설정/변경 (카카오 사용자용)
   * - 기존 비밀번호가 있으면 검증 필요
   * - 기존 비밀번호가 없으면 바로 설정
   */
  async setPassword(userId: number, dto: SetPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    // 기존 비밀번호가 있는 경우 검증 필요
    if (user.password) {
      if (!dto.currentPassword) {
        throw new BadRequestException('현재 비밀번호를 입력해주세요.');
      }

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

    const message = user.password
      ? '비밀번호가 성공적으로 변경되었습니다.'
      : '비밀번호가 성공적으로 설정되었습니다.';

    this.logger.log(
      `User ${userId} ${user.password ? 'changed' : 'set'} password`,
    );

    return { success: true, message };
  }

  /**
   * 회원 탈퇴 (Soft Delete)
   * - deletedAt 필드를 현재 시각으로 설정
   * - 실제 데이터는 삭제하지 않음
   * - 모든 refresh token 삭제
   */
  async softDeleteUser(userId: number) {
    // 탈퇴 여부 확인을 위해 탈퇴된 사용자도 조회
    const user = await this.findById(userId, true);

    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    if (user.deletedAt) {
      throw new BadRequestException('이미 탈퇴한 사용자입니다.');
    }

    // Soft delete 처리 및 refresh token 삭제
    await this.prisma.$transaction([
      // 사용자 soft delete
      this.prisma.user.update({
        where: { id: userId },
        data: {
          deletedAt: new Date(),
        },
      }),
      // 모든 refresh token 삭제 (로그아웃 처리)
      this.prisma.refreshToken.deleteMany({
        where: { userId },
      }),
    ]);

    this.logger.log(`User ${userId} (${user.email}) soft deleted`);

    return { success: true, message: '회원 탈퇴가 완료되었습니다.' };
  }
}
