import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Logger,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../lib/database/prisma.service';
import { UserService } from '../user/user.service';
import { CreditService } from '../credit/credit.service';
import { EmailService } from '../../lib/integrations/email/email.service';
import { VerificationCodeService } from './verification-code.service';
import {
  RegisterDto,
  LoginDto,
  AuthResponseDto,
  RefreshTokenResponseDto,
} from './dto';
import { JwtPayload } from './strategies/jwt.strategy';
import { SubscriptionStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly SALT_ROUNDS = 10;
  private readonly REFRESH_TOKEN_EXPIRY_DAYS = 7;

  constructor(
    private readonly prisma: PrismaService,
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly creditService: CreditService,
    private readonly emailService: EmailService,
    private readonly verificationCodeService: VerificationCodeService,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    const { email, password, name, emailVerified } = registerDto;

    // 이메일 인증 확인
    if (!emailVerified) {
      throw new BadRequestException(
        '이메일 인증이 필요합니다. 먼저 인증 코드를 확인해주세요.',
      );
    }

    // 이미 존재하는 이메일인지 확인
    const existingUser = await this.userService.findByEmail(email);
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    // 비밀번호 암호화
    const hashedPassword = await bcrypt.hash(password, this.SALT_ROUNDS);

    // FREE 플랜 조회 (name으로 조회하여 ID 문제 해결)
    const freePlan = await this.prisma.subscriptionPlan.findUnique({
      where: { name: 'FREE' },
    });

    if (!freePlan) {
      throw new InternalServerErrorException(
        'Default subscription plan not found. Please run database seed.',
      );
    }

    // 트랜잭션으로 사용자 생성 + 구독 + 크레딧 계정 생성
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. 사용자 생성
      const user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          name: name || null,
        },
      });

      // 2. FREE 구독 생성 (체험 기간 7일)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7일 체험

      const subscription = await tx.userSubscription.create({
        data: {
          userId: user.id,
          planId: freePlan.id,
          status: SubscriptionStatus.TRIAL,
          startedAt: new Date(),
          expiresAt,
          autoRenewal: false, // FREE 플랜은 자동 갱신 안 함
        },
      });

      // 3. 크레딧 계정 생성 및 초기 크레딧 지급
      const creditAccount = await tx.creditAccount.create({
        data: {
          userId: user.id,
          subscriptionCredits: freePlan.monthlyCredits,
          purchasedCredits: 0,
          bonusCredits: 0,
          totalCredits: freePlan.monthlyCredits,
        },
      });

      // 4. 크레딧 거래 내역 생성
      await tx.creditTransaction.create({
        data: {
          accountId: creditAccount.id, // 올바른 accountId 사용
          userId: user.id,
          type: 'SUBSCRIPTION_GRANT',
          amount: freePlan.monthlyCredits,
          balanceBefore: 0,
          balanceAfter: freePlan.monthlyCredits,
          creditType: 'SUBSCRIPTION',
          referenceType: 'subscription',
          referenceId: subscription.id,
        },
      });

      // 5. 구독 히스토리 생성
      await tx.subscriptionHistory.create({
        data: {
          userId: user.id,
          subscriptionId: subscription.id,
          action: 'CREATED',
          oldStatus: null,
          newStatus: SubscriptionStatus.TRIAL,
          planId: freePlan.id,
          planName: freePlan.displayName,
          planPrice: freePlan.price,
          creditsGranted: freePlan.monthlyCredits,
          startedAt: subscription.startedAt,
          expiresAt: subscription.expiresAt,
        },
      });

      return user;
    });

    this.logger.log(
      `New user registered with FREE trial: ${result.email} (7 days, ${freePlan.monthlyCredits} credits)`,
    );

    // JWT 토큰 생성
    const accessToken = await this.generateAccessToken(result.id);
    const refreshToken = await this.generateRefreshToken(result.id);

    return {
      accessToken,
      refreshToken,
      user: {
        id: result.id,
        email: result.email,
        name: result.name,
      },
    };
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const { email, password } = loginDto;

    // 사용자 조회
    const user = await this.userService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('아이디 또는 비밀번호가 잘못되었습니다');
    }

    // 비밀번호 검증
    const isPasswordValid = await this.userService.validatePassword(
      password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('아이디 또는 비밀번호가 잘못되었습니다');
    }

    this.logger.log(`User logged in: ${user.email}`);

    // JWT 토큰 생성
    const accessToken = await this.generateAccessToken(user.id);
    const refreshToken = await this.generateRefreshToken(user.id);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    };
  }

  async logout(userId: number): Promise<{ message: string }> {
    // Refresh token 삭제
    await this.prisma.refreshToken.deleteMany({
      where: { userId },
    });

    this.logger.log(`User logged out: ${userId}`);

    return {
      message: 'Successfully logged out',
    };
  }

  async refreshAccessToken(
    refreshToken: string,
  ): Promise<RefreshTokenResponseDto> {
    // Refresh token 검증
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!storedToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // 만료 확인
    if (new Date() > storedToken.expiresAt) {
      // 만료된 토큰 삭제
      await this.prisma.refreshToken.delete({
        where: { id: storedToken.id },
      });
      throw new UnauthorizedException('Refresh token expired');
    }

    // 새로운 access token 생성
    const accessToken = await this.generateAccessToken(storedToken.userId);

    this.logger.log(
      `Access token refreshed for user: ${storedToken.user.email}`,
    );

    return { accessToken };
  }

  private async generateAccessToken(userId: number): Promise<string> {
    const payload: JwtPayload = {
      sub: userId,
    };

    return this.jwtService.signAsync(payload);
  }

  private async generateRefreshToken(userId: number): Promise<string> {
    // 기존 refresh token 삭제 (한 사용자당 하나만 유지)
    await this.prisma.refreshToken.deleteMany({
      where: { userId },
    });

    // 새로운 refresh token 생성
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.REFRESH_TOKEN_EXPIRY_DAYS);

    await this.prisma.refreshToken.create({
      data: {
        token,
        userId,
        expiresAt,
      },
    });

    return token;
  }

  /**
   * 이메일 인증 코드 발송
   */
  async sendVerificationCode(email: string): Promise<{ message: string }> {
    // 이미 가입된 이메일인지 확인
    const existingUser = await this.userService.findByEmail(email);
    if (existingUser) {
      throw new ConflictException('이미 가입된 이메일입니다.');
    }

    // 인증 코드 생성
    const code =
      await this.verificationCodeService.createVerificationCode(email);

    // 이메일 전송
    await this.emailService.sendVerificationCode(email, code);

    this.logger.log(`✅ 인증 코드 발송 완료: ${email}`);

    return {
      message: '인증 코드가 이메일로 전송되었습니다. 5분 이내에 입력해주세요.',
    };
  }

  /**
   * 이메일 인증 코드 확인
   */
  async verifyCode(
    email: string,
    code: string,
  ): Promise<{ message: string; verified: boolean }> {
    const isValid = await this.verificationCodeService.verifyCode(email, code);

    if (!isValid) {
      // 실패 시 시도 횟수 증가
      await this.verificationCodeService.incrementAttempts(email);
      throw new BadRequestException(
        '인증 코드가 올바르지 않거나 만료되었습니다.',
      );
    }

    this.logger.log(`✅ 이메일 인증 성공: ${email}`);

    return {
      message: '이메일 인증이 완료되었습니다.',
      verified: true,
    };
  }
}
