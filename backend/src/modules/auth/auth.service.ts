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
import { KakaoService } from './kakao.service';
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
    private readonly kakaoService: KakaoService,
  ) {}

  async register(
    registerDto: RegisterDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthResponseDto> {
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
    const refreshToken = await this.generateRefreshToken(
      result.id,
      ipAddress,
      userAgent,
    );

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

  async login(
    loginDto: LoginDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthResponseDto> {
    const { email, password } = loginDto;

    // 사용자 조회
    const user = await this.userService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('아이디 또는 비밀번호가 잘못되었습니다');
    }

    // 비밀번호가 없는 사용자 (카카오 전용 계정) 체크
    if (!user.password) {
      throw new UnauthorizedException(
        '카카오 계정으로 가입한 사용자입니다. 카카오 로그인을 이용해주세요.',
      );
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
    const refreshToken = await this.generateRefreshToken(
      user.id,
      ipAddress,
      userAgent,
    );

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

  async logout(
    userId: number,
    refreshToken?: string,
  ): Promise<{ message: string }> {
    if (refreshToken) {
      // 특정 디바이스(토큰)만 로그아웃
      await this.prisma.refreshToken.deleteMany({
        where: {
          userId,
          token: refreshToken,
        },
      });
      this.logger.log(`User logged out from specific device: ${userId}`);
    } else {
      // 모든 디바이스에서 로그아웃 (기존 동작 유지)
      await this.prisma.refreshToken.deleteMany({
        where: { userId },
      });
      this.logger.log(`User logged out from all devices: ${userId}`);
    }

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

    // 토큰 사용 시간 업데이트
    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { lastUsedAt: new Date() },
    });

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

  private async generateRefreshToken(
    userId: number,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<string> {
    // 새로운 refresh token 생성 (중복 로그인 허용 - 기존 토큰 삭제하지 않음)
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.REFRESH_TOKEN_EXPIRY_DAYS);

    // User-Agent에서 디바이스 이름 추출
    const deviceName = this.extractDeviceName(userAgent);

    await this.prisma.refreshToken.create({
      data: {
        token,
        userId,
        expiresAt,
        ipAddress,
        userAgent,
        deviceName,
      },
    });

    return token;
  }

  /**
   * User-Agent에서 간단한 디바이스 이름 추출
   */
  private extractDeviceName(userAgent?: string): string | null {
    if (!userAgent) return null;

    // 브라우저 감지
    let browser = 'Unknown Browser';
    if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
      browser = 'Chrome';
    } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
      browser = 'Safari';
    } else if (userAgent.includes('Firefox')) {
      browser = 'Firefox';
    } else if (userAgent.includes('Edg')) {
      browser = 'Edge';
    }

    // OS 감지
    let os = 'Unknown OS';
    if (userAgent.includes('Windows')) {
      os = 'Windows';
    } else if (userAgent.includes('Mac OS X')) {
      os = 'macOS';
    } else if (userAgent.includes('Linux')) {
      os = 'Linux';
    } else if (userAgent.includes('Android')) {
      os = 'Android';
    } else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
      os = 'iOS';
    }

    return `${browser} on ${os}`;
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

  /**
   * Kakao 계정 연결
   * - 인가 코드로 토큰 교환 후 사용자 정보 조회
   * - 중복 연결 방지 (이미 다른 사용자와 연결된 Kakao 계정)
   * - User 모델에 Kakao 정보 저장
   */
  async connectKakao(
    userId: number,
    code: string,
  ): Promise<{ message: string; success: boolean }> {
    try {
      // 1. 인가 코드로 액세스 토큰 교환
      const tokenData = await this.kakaoService.exchangeCodeForToken(code);

      // 2. 액세스 토큰으로 사용자 정보 조회
      const kakaoUserInfo = await this.kakaoService.getUserInfo(
        tokenData.access_token,
      );

      const kakaoId = String(kakaoUserInfo.id);
      const kakaoNickname =
        kakaoUserInfo.kakao_account?.profile?.nickname || null;
      const kakaoProfileImage =
        kakaoUserInfo.kakao_account?.profile?.profile_image_url || null;

      // 3. 중복 연결 확인 - 다른 사용자가 이미 연결한 Kakao 계정인지 확인
      const existingConnection = await this.userService.findByKakaoId(kakaoId);

      if (existingConnection && existingConnection.id !== userId) {
        throw new ConflictException(
          '이미 다른 계정과 연결된 카카오 계정입니다.',
        );
      }

      // 4. 현재 사용자 조회
      const user = await this.userService.findById(userId);

      if (!user) {
        throw new UnauthorizedException('사용자를 찾을 수 없습니다.');
      }

      // 5. 이미 연결된 경우 확인
      if (user.kakaoId) {
        throw new ConflictException('이미 카카오 계정이 연결되어 있습니다.');
      }

      // 6. Kakao 정보 저장
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          kakaoId,
          kakaoNickname,
          kakaoProfileImage,
          kakaoConnectedAt: new Date(),
        },
      });

      this.logger.log(`Kakao account connected for user ${userId}: ${kakaoId}`);

      return {
        message: '카카오 계정이 성공적으로 연결되었습니다.',
        success: true,
      };
    } catch (error) {
      this.logger.error(`Kakao connection failed: ${error.message}`);

      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }

      throw new InternalServerErrorException(
        '카카오 연결 중 오류가 발생했습니다.',
      );
    }
  }

  /**
   * Kakao 계정 연결 해제
   * - User 모델에서 Kakao 정보 제거
   */
  async disconnectKakao(
    userId: number,
  ): Promise<{ message: string; success: boolean }> {
    try {
      // 1. 현재 사용자 조회
      const user = await this.userService.findById(userId);

      if (!user) {
        throw new UnauthorizedException('사용자를 찾을 수 없습니다.');
      }

      // 2. 연결된 Kakao 계정이 없는 경우
      if (!user.kakaoId) {
        throw new BadRequestException('연결된 카카오 계정이 없습니다.');
      }

      // 3. 카카오 서버에서 연결 해제
      try {
        await this.kakaoService.unlinkKakaoAccount(user.kakaoId);
      } catch (kakaoError) {
        // 카카오 API 호출 실패 시 로그만 남기고 계속 진행
        // (이미 연결이 해제되었거나, 일시적인 오류일 수 있음)
        this.logger.warn(
          `Kakao API unlink failed, but continuing: ${kakaoError.message}`,
        );
      }

      // 4. DB에서 Kakao 정보 제거
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          kakaoId: null,
          kakaoNickname: null,
          kakaoProfileImage: null,
          kakaoConnectedAt: null,
        },
      });

      this.logger.log(`Kakao account disconnected for user ${userId}`);

      return {
        message: '카카오 계정 연결이 해제되었습니다.',
        success: true,
      };
    } catch (error) {
      this.logger.error(`Kakao disconnection failed: ${error.message}`);

      if (
        error instanceof BadRequestException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }

      throw new InternalServerErrorException(
        '카카오 연결 해제 중 오류가 발생했습니다.',
      );
    }
  }

  /**
   * 카카오 로그인/회원가입
   * - 카카오 인가 코드로 사용자 정보를 가져와서
   * - 기존 사용자면 로그인, 신규 사용자면 자동 회원가입
   */
  async kakaoLogin(
    code: string,
    redirectUri?: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthResponseDto> {
    try {
      // 1. 카카오 인가 코드로 액세스 토큰 받기
      const tokenResponse = await this.kakaoService.exchangeCodeForToken(
        code,
        redirectUri,
      );

      // 2. 액세스 토큰으로 사용자 정보 조회
      const kakaoUserInfo = await this.kakaoService.getUserInfo(
        tokenResponse.access_token,
      );

      // 3. 카카오 이메일 확인
      const kakaoEmail = kakaoUserInfo.kakao_account?.email;
      if (!kakaoEmail) {
        throw new BadRequestException(
          '카카오 계정에서 이메일 정보를 가져올 수 없습니다. 카카오 계정에 이메일을 등록해주세요.',
        );
      }

      const kakaoId = String(kakaoUserInfo.id);
      const kakaoNickname =
        kakaoUserInfo.kakao_account?.profile?.nickname || null;
      const kakaoProfileImage =
        kakaoUserInfo.kakao_account?.profile?.profile_image_url || null;

      // 4. 카카오 ID로 기존 사용자 찾기
      let user = await this.userService.findByKakaoId(kakaoId);

      // 5. 카카오 ID로 사용자를 찾지 못한 경우, 이메일로 찾아보기
      let isAccountLinked = false;
      if (!user) {
        user = await this.userService.findByEmail(kakaoEmail);

        // 이메일로 찾은 사용자가 있으면 카카오 정보 연결
        if (user) {
          user = await this.prisma.user.update({
            where: { id: user.id },
            data: {
              kakaoId,
              kakaoNickname,
              kakaoProfileImage,
              kakaoConnectedAt: new Date(),
            },
          });

          isAccountLinked = true;
          this.logger.log(
            `Existing user linked with Kakao: ${user.email} (kakaoId: ${kakaoId})`,
          );
        }
      }

      // 6. 신규 사용자인 경우 자동 회원가입
      if (!user) {
        // FREE 플랜 조회
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
          // 사용자 생성 (password는 null)
          const newUser = await tx.user.create({
            data: {
              email: kakaoEmail,
              password: null,
              name: kakaoNickname,
              kakaoId,
              kakaoNickname,
              kakaoProfileImage,
              kakaoConnectedAt: new Date(),
            },
          });

          // FREE 구독 생성 (체험 기간 7일)
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + 7);

          const subscription = await tx.userSubscription.create({
            data: {
              userId: newUser.id,
              planId: freePlan.id,
              status: SubscriptionStatus.TRIAL,
              startedAt: new Date(),
              expiresAt,
              autoRenewal: false,
            },
          });

          // 크레딧 계정 생성 및 초기 크레딧 지급
          const creditAccount = await tx.creditAccount.create({
            data: {
              userId: newUser.id,
              subscriptionCredits: freePlan.monthlyCredits,
              purchasedCredits: 0,
              bonusCredits: 0,
              totalCredits: freePlan.monthlyCredits,
            },
          });

          // 크레딧 거래 내역 생성
          await tx.creditTransaction.create({
            data: {
              accountId: creditAccount.id,
              userId: newUser.id,
              type: 'SUBSCRIPTION_GRANT',
              amount: freePlan.monthlyCredits,
              balanceBefore: 0,
              balanceAfter: freePlan.monthlyCredits,
              creditType: 'SUBSCRIPTION',
              referenceType: 'subscription',
              referenceId: subscription.id,
            },
          });

          // 구독 히스토리 생성
          await tx.subscriptionHistory.create({
            data: {
              userId: newUser.id,
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

          return newUser;
        });

        user = result;

        this.logger.log(
          `New user registered via Kakao: ${user.email} (kakaoId: ${kakaoId})`,
        );
      } else {
        this.logger.log(`User logged in via Kakao: ${user.email}`);
      }

      // 7. JWT 토큰 생성
      const accessToken = await this.generateAccessToken(user.id);
      const refreshToken = await this.generateRefreshToken(
        user.id,
        ipAddress,
        userAgent,
      );

      return {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
        isAccountLinked, // 기존 계정에 카카오 연동되었는지 여부
      };
    } catch (error) {
      this.logger.error(`Kakao login failed: ${error.message}`);

      if (
        error instanceof BadRequestException ||
        error instanceof UnauthorizedException ||
        error instanceof ConflictException
      ) {
        throw error;
      }

      throw new InternalServerErrorException(
        '카카오 로그인 중 오류가 발생했습니다.',
      );
    }
  }

  /**
   * 아이디(이메일) 찾기
   * 이름으로 조회하여 마스킹된 이메일 반환
   */
  async findEmail(
    name: string,
  ): Promise<{ maskedEmail: string; createdAt: Date; hasKakao: boolean }[]> {
    // 이름으로 사용자 조회 (삭제되지 않은 사용자만)
    const users = await this.prisma.user.findMany({
      where: {
        name,
        deletedAt: null,
      },
      select: {
        email: true,
        createdAt: true,
        kakaoId: true,
      },
    });

    if (users.length === 0) {
      throw new BadRequestException(
        '일치하는 회원 정보를 찾을 수 없습니다.',
      );
    }

    // 이메일 마스킹 처리
    return users.map((user) => ({
      maskedEmail: this.maskEmail(user.email),
      createdAt: user.createdAt,
      hasKakao: !!user.kakaoId,
    }));
  }

  /**
   * 이메일 마스킹 처리
   * ex) test@example.com → te**@example.com
   */
  private maskEmail(email: string): string {
    const [localPart, domain] = email.split('@');

    if (localPart.length <= 2) {
      return `${localPart[0]}*@${domain}`;
    }

    const visibleChars = Math.min(2, Math.floor(localPart.length / 2));
    const maskedPart = '*'.repeat(localPart.length - visibleChars);
    return `${localPart.slice(0, visibleChars)}${maskedPart}@${domain}`;
  }

  /**
   * 비밀번호 재설정용 인증 코드 발송
   * 기존 가입된 사용자만 발송 가능
   */
  async sendPasswordResetCode(email: string): Promise<{ message: string }> {
    // 가입된 사용자인지 확인
    const user = await this.userService.findByEmail(email);
    if (!user) {
      // 보안을 위해 가입 여부를 노출하지 않음
      return {
        message: '해당 이메일로 인증 코드가 발송되었습니다.',
      };
    }

    // 카카오 전용 계정인 경우 (password가 null)
    if (!user.password) {
      throw new BadRequestException(
        '카카오 계정으로 가입한 사용자입니다. 카카오 로그인을 이용해주세요.',
      );
    }

    // 인증 코드 생성 (기존 회원가입용과 동일한 서비스 사용)
    const code =
      await this.verificationCodeService.createVerificationCode(email);

    // 비밀번호 재설정용 이메일 전송
    await this.emailService.sendPasswordResetCode(email, code);

    this.logger.log(`✅ 비밀번호 재설정 인증 코드 발송 완료: ${email}`);

    return {
      message: '해당 이메일로 인증 코드가 발송되었습니다. 5분 이내에 입력해주세요.',
    };
  }

  /**
   * 비밀번호 재설정 인증 코드 검증
   */
  async verifyPasswordResetCode(
    email: string,
    code: string,
  ): Promise<{ message: string; verified: boolean }> {
    // 가입된 사용자인지 확인
    const user = await this.userService.findByEmail(email);
    if (!user) {
      throw new BadRequestException(
        '일치하는 회원 정보를 찾을 수 없습니다.',
      );
    }

    // 인증 코드 검증 (삭제하지 않고 검증만 수행)
    const isValid = await this.verificationCodeService.verifyCodeWithoutDelete(
      email,
      code,
    );

    if (!isValid) {
      await this.verificationCodeService.incrementAttempts(email);
      throw new BadRequestException(
        '인증 코드가 올바르지 않거나 만료되었습니다.',
      );
    }

    this.logger.log(`✅ 비밀번호 재설정 인증 성공: ${email}`);

    return {
      message: '인증이 완료되었습니다. 새 비밀번호를 설정해주세요.',
      verified: true,
    };
  }

  /**
   * 비밀번호 재설정
   */
  async resetPassword(
    email: string,
    code: string,
    newPassword: string,
    confirmPassword: string,
  ): Promise<{ message: string }> {
    // 비밀번호 확인 일치 검증
    if (newPassword !== confirmPassword) {
      throw new BadRequestException('비밀번호가 일치하지 않습니다.');
    }

    // 가입된 사용자인지 확인
    const user = await this.userService.findByEmail(email);
    if (!user) {
      throw new BadRequestException(
        '일치하는 회원 정보를 찾을 수 없습니다.',
      );
    }

    // 카카오 전용 계정인 경우
    if (!user.password) {
      throw new BadRequestException(
        '카카오 계정으로 가입한 사용자입니다. 카카오 로그인을 이용해주세요.',
      );
    }

    // 인증 코드 검증 (검증만 수행, 삭제는 아래에서)
    const isValid = await this.verificationCodeService.verifyCodeWithoutDelete(
      email,
      code,
    );
    if (!isValid) {
      throw new BadRequestException(
        '인증 코드가 올바르지 않거나 만료되었습니다. 다시 시도해주세요.',
      );
    }

    // 새 비밀번호 암호화 및 저장
    const hashedPassword = await bcrypt.hash(newPassword, this.SALT_ROUNDS);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    // 비밀번호 변경 완료 후 인증 코드 삭제
    await this.verificationCodeService.deleteVerificationCode(email);

    this.logger.log(`✅ 비밀번호 재설정 완료: ${email}`);

    return {
      message: '비밀번호가 성공적으로 변경되었습니다. 새 비밀번호로 로그인해주세요.',
    };
  }
}
