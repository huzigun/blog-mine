import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../lib/database/prisma.service';

/**
 * 이메일 인증 코드 관리 서비스
 */
@Injectable()
export class VerificationCodeService {
  private readonly logger = new Logger(VerificationCodeService.name);
  private readonly CODE_EXPIRY_MINUTES = 5; // 인증 코드 유효 시간 (5분)
  private readonly MAX_ATTEMPTS = 5; // 최대 시도 횟수

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 6자리 랜덤 숫자 코드 생성
   */
  private generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * 인증 코드 생성 및 저장
   */
  async createVerificationCode(email: string): Promise<string> {
    // 기존 코드 삭제 (하나의 이메일에 하나의 활성 코드만 존재)
    await this.prisma.emailVerification.deleteMany({
      where: { email },
    });

    const code = this.generateCode();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + this.CODE_EXPIRY_MINUTES);

    await this.prisma.emailVerification.create({
      data: {
        email,
        code,
        expiresAt,
        attempts: 0,
      },
    });

    this.logger.log(
      `✅ 인증 코드 생성: ${email} (만료: ${expiresAt.toISOString()})`,
    );
    return code;
  }

  /**
   * 인증 코드 검증
   */
  async verifyCode(email: string, code: string): Promise<boolean> {
    const verification = await this.prisma.emailVerification.findFirst({
      where: {
        email,
        code,
      },
    });

    // 코드가 존재하지 않음
    if (!verification) {
      this.logger.warn(`❌ 인증 코드 불일치: ${email}`);
      return false;
    }

    // 시도 횟수 초과
    if (verification.attempts >= this.MAX_ATTEMPTS) {
      this.logger.warn(`❌ 최대 시도 횟수 초과: ${email}`);
      await this.prisma.emailVerification.delete({
        where: { id: verification.id },
      });
      return false;
    }

    // 만료 확인
    if (new Date() > verification.expiresAt) {
      this.logger.warn(`❌ 인증 코드 만료: ${email}`);
      await this.prisma.emailVerification.delete({
        where: { id: verification.id },
      });
      return false;
    }

    // 인증 성공 - 코드 삭제
    await this.prisma.emailVerification.delete({
      where: { id: verification.id },
    });

    this.logger.log(`✅ 인증 성공: ${email}`);
    return true;
  }

  /**
   * 인증 실패 시도 횟수 증가
   */
  async incrementAttempts(email: string): Promise<void> {
    await this.prisma.emailVerification.updateMany({
      where: { email },
      data: {
        attempts: {
          increment: 1,
        },
      },
    });
  }

  /**
   * 만료된 인증 코드 정리 (cron job용)
   */
  async cleanupExpiredCodes(): Promise<number> {
    const result = await this.prisma.emailVerification.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    this.logger.log(`🧹 만료된 인증 코드 ${result.count}개 정리 완료`);
    return result.count;
  }

  /**
   * 특정 이메일의 인증 코드 삭제
   */
  async deleteVerificationCode(email: string): Promise<void> {
    await this.prisma.emailVerification.deleteMany({
      where: { email },
    });

    this.logger.log(`🗑️ 인증 코드 삭제: ${email}`);
  }
}
