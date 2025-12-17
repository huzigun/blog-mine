import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '../../config/config.service';

/**
 * 이메일 전송 서비스
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    // SMTP 설정
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_SMTP,
      port: 465,
      secure: true, // SSL
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // 연결 테스트
    this.verifyConnection();
  }

  /**
   * SMTP 연결 확인
   */
  private async verifyConnection() {
    try {
      await this.transporter.verify();
      this.logger.log('✅ SMTP 연결 성공');
    } catch (error) {
      this.logger.error('❌ SMTP 연결 실패:', error);
    }
  }

  /**
   * 이메일 인증 코드 전송
   */
  async sendVerificationCode(email: string, code: string): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: `"BloC" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: '[BloC] 이메일 인증 코드',
        html: `
          <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
            <div style="text-align: center; padding: 40px 0;">
              <h1 style="color: #3b82f6; margin: 0;">BloC</h1>
              <p style="color: #6b7280; margin-top: 8px;">블로그 원고 생성 서비스</p>
            </div>

            <div style="background-color: #f9fafb; border-radius: 8px; padding: 30px; margin: 20px 0;">
              <h2 style="color: #111827; margin: 0 0 16px 0;">이메일 인증 코드</h2>
              <p style="color: #4b5563; margin: 0 0 24px 0;">
                회원가입을 완료하기 위해 아래 인증 코드를 입력해주세요.
              </p>

              <div style="background-color: white; border: 2px solid #e5e7eb; border-radius: 8px; padding: 24px; text-align: center;">
                <p style="color: #6b7280; font-size: 14px; margin: 0 0 8px 0;">인증 코드</p>
                <p style="font-size: 32px; font-weight: bold; color: #3b82f6; letter-spacing: 8px; margin: 0;">
                  ${code}
                </p>
              </div>

              <p style="color: #9ca3af; font-size: 14px; margin: 24px 0 0 0;">
                ⏱️ 이 코드는 <strong>5분간</strong> 유효합니다.
              </p>
            </div>

            <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0; border-radius: 4px;">
              <p style="color: #92400e; margin: 0; font-size: 14px;">
                <strong>⚠️ 주의사항</strong><br/>
                본인이 요청하지 않은 경우, 이 이메일을 무시하셔도 됩니다.
              </p>
            </div>

            <div style="text-align: center; padding: 20px 0; border-top: 1px solid #e5e7eb; margin-top: 40px;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                © 2025 BloC. All rights reserved.
              </p>
            </div>
          </div>
        `,
      });

      this.logger.log(`✅ 인증 코드 이메일 전송 완료: ${email}`);
    } catch (error) {
      this.logger.error(`❌ 이메일 전송 실패: ${email}`, error);
      throw new Error('이메일 전송에 실패했습니다.');
    }
  }

  /**
   * 비밀번호 재설정 인증 코드 전송
   */
  async sendPasswordResetCode(email: string, code: string): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: `"BloC" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: '[BloC] 비밀번호 재설정 인증 코드',
        html: `
          <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
            <div style="text-align: center; padding: 40px 0;">
              <h1 style="color: #3b82f6; margin: 0;">BloC</h1>
              <p style="color: #6b7280; margin-top: 8px;">블로그 원고 생성 서비스</p>
            </div>

            <div style="background-color: #f9fafb; border-radius: 8px; padding: 30px; margin: 20px 0;">
              <h2 style="color: #111827; margin: 0 0 16px 0;">비밀번호 재설정</h2>
              <p style="color: #4b5563; margin: 0 0 24px 0;">
                비밀번호 재설정을 위한 인증 코드입니다.
              </p>

              <div style="background-color: white; border: 2px solid #e5e7eb; border-radius: 8px; padding: 24px; text-align: center;">
                <p style="color: #6b7280; font-size: 14px; margin: 0 0 8px 0;">인증 코드</p>
                <p style="font-size: 32px; font-weight: bold; color: #3b82f6; letter-spacing: 8px; margin: 0;">
                  ${code}
                </p>
              </div>

              <p style="color: #9ca3af; font-size: 14px; margin: 24px 0 0 0;">
                ⏱️ 이 코드는 <strong>5분간</strong> 유효합니다.
              </p>
            </div>

            <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0; border-radius: 4px;">
              <p style="color: #92400e; margin: 0; font-size: 14px;">
                <strong>⚠️ 주의사항</strong><br/>
                본인이 요청하지 않은 경우, 이 이메일을 무시하셔도 됩니다.
              </p>
            </div>

            <div style="text-align: center; padding: 20px 0; border-top: 1px solid #e5e7eb; margin-top: 40px;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                © 2025 BloC. All rights reserved.
              </p>
            </div>
          </div>
        `,
      });

      this.logger.log(`✅ 비밀번호 재설정 인증 코드 이메일 전송 완료: ${email}`);
    } catch (error) {
      this.logger.error(`❌ 이메일 전송 실패: ${email}`, error);
      throw new Error('이메일 전송에 실패했습니다.');
    }
  }

  /**
   * 비밀번호 재설정 이메일 전송 (링크 방식 - 미사용)
   */
  async sendPasswordResetEmail(
    email: string,
    resetToken: string,
  ): Promise<void> {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    try {
      await this.transporter.sendMail({
        from: `"BloC" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: '[BloC] 비밀번호 재설정',
        html: `
          <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
            <div style="text-align: center; padding: 40px 0;">
              <h1 style="color: #3b82f6; margin: 0;">BloC</h1>
              <p style="color: #6b7280; margin-top: 8px;">블로그 원고 생성 서비스</p>
            </div>

            <div style="background-color: #f9fafb; border-radius: 8px; padding: 30px; margin: 20px 0;">
              <h2 style="color: #111827; margin: 0 0 16px 0;">비밀번호 재설정</h2>
              <p style="color: #4b5563; margin: 0 0 24px 0;">
                비밀번호 재설정 요청을 받았습니다. 아래 버튼을 클릭하여 새 비밀번호를 설정하세요.
              </p>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" style="display: inline-block; background-color: #3b82f6; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600;">
                  비밀번호 재설정
                </a>
              </div>

              <p style="color: #9ca3af; font-size: 14px; margin: 24px 0 0 0;">
                ⏱️ 이 링크는 <strong>1시간</strong> 동안 유효합니다.
              </p>

              <p style="color: #9ca3af; font-size: 12px; margin: 16px 0 0 0; word-break: break-all;">
                버튼이 작동하지 않는 경우 아래 링크를 복사하여 브라우저에 붙여넣으세요:<br/>
                ${resetUrl}
              </p>
            </div>

            <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0; border-radius: 4px;">
              <p style="color: #92400e; margin: 0; font-size: 14px;">
                <strong>⚠️ 주의사항</strong><br/>
                본인이 요청하지 않은 경우, 이 이메일을 무시하셔도 됩니다.
              </p>
            </div>

            <div style="text-align: center; padding: 20px 0; border-top: 1px solid #e5e7eb; margin-top: 40px;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                © 2025 BloC. All rights reserved.
              </p>
            </div>
          </div>
        `,
      });

      this.logger.log(`✅ 비밀번호 재설정 이메일 전송 완료: ${email}`);
    } catch (error) {
      this.logger.error(`❌ 이메일 전송 실패: ${email}`, error);
      throw new Error('이메일 전송에 실패했습니다.');
    }
  }
}
