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
   * 결제 완료 인보이스 이메일 전송
   */
  async sendPaymentInvoice(data: {
    email: string;
    userName: string;
    invoiceNumber: string; // 결제 ID 또는 트랜잭션 ID
    planName: string;
    amount: number;
    paymentMethod: string; // 예: "신한카드 **** 1234"
    paymentDate: Date;
    billingPeriodStart: Date;
    billingPeriodEnd: Date;
    creditsGranted?: number;
    isUpgrade?: boolean;
    isRenewal?: boolean;
  }): Promise<void> {
    const {
      email,
      userName,
      invoiceNumber,
      planName,
      amount,
      paymentMethod,
      paymentDate,
      billingPeriodStart,
      billingPeriodEnd,
      creditsGranted,
      isUpgrade,
      isRenewal,
    } = data;

    // 날짜 포맷팅
    const formatDate = (date: Date) =>
      date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

    const formatDateTime = (date: Date) =>
      date.toLocaleString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

    // 결제 유형 텍스트
    let paymentTypeText = '구독 결제';
    if (isUpgrade) paymentTypeText = '플랜 업그레이드';
    else if (isRenewal) paymentTypeText = '구독 갱신';

    try {
      await this.transporter.sendMail({
        from: `"BloC" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: `[BloC] 결제 완료 - ${planName} ${paymentTypeText}`,
        html: `
          <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
            <!-- 헤더 -->
            <div style="text-align: center; padding: 40px 0 30px 0;">
              <h1 style="color: #3b82f6; margin: 0; font-size: 32px;">BloC</h1>
              <p style="color: #6b7280; margin-top: 8px; font-size: 14px;">블로그 원고 생성 서비스</p>
            </div>

            <!-- 메인 카드 -->
            <div style="background-color: white; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <!-- 성공 아이콘 & 제목 -->
              <div style="text-align: center; margin-bottom: 32px;">
                <div style="width: 64px; height: 64px; background-color: #dcfce7; border-radius: 50%; margin: 0 auto 16px; line-height: 64px;">
                  <span style="font-size: 32px;">✓</span>
                </div>
                <h2 style="color: #111827; margin: 0 0 8px 0; font-size: 24px;">결제가 완료되었습니다</h2>
                <p style="color: #6b7280; margin: 0; font-size: 14px;">${userName}님, ${paymentTypeText}이 성공적으로 처리되었습니다.</p>
              </div>

              <!-- 인보이스 정보 -->
              <div style="background-color: #f9fafb; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                      <span style="color: #6b7280; font-size: 14px;">인보이스 번호</span>
                    </td>
                    <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
                      <span style="color: #111827; font-size: 14px; font-weight: 600;">#${invoiceNumber}</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                      <span style="color: #6b7280; font-size: 14px;">결제일시</span>
                    </td>
                    <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
                      <span style="color: #111827; font-size: 14px;">${formatDateTime(paymentDate)}</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                      <span style="color: #6b7280; font-size: 14px;">결제수단</span>
                    </td>
                    <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
                      <span style="color: #111827; font-size: 14px;">${paymentMethod}</span>
                    </td>
                  </tr>
                </table>
              </div>

              <!-- 구독 상세 -->
              <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
                <h3 style="color: #111827; margin: 0 0 16px 0; font-size: 16px;">구독 상세</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0;">
                      <span style="color: #111827; font-size: 14px; font-weight: 500;">${planName} 플랜</span>
                      <br/>
                      <span style="color: #6b7280; font-size: 12px;">${formatDate(billingPeriodStart)} ~ ${formatDate(billingPeriodEnd)}</span>
                    </td>
                    <td style="padding: 8px 0; text-align: right;">
                      <span style="color: #111827; font-size: 14px; font-weight: 600;">${amount.toLocaleString()}원</span>
                    </td>
                  </tr>
                  ${
                    creditsGranted
                      ? `
                  <tr>
                    <td colspan="2" style="padding: 12px 0 0 0; border-top: 1px solid #e5e7eb; margin-top: 12px;">
                      <span style="color: #6b7280; font-size: 12px;">포함된 BloC 크레딧</span>
                      <span style="color: #3b82f6; font-size: 14px; font-weight: 600; float: right;">+${creditsGranted.toLocaleString()} BloC</span>
                    </td>
                  </tr>
                  `
                      : ''
                  }
                </table>
              </div>

              <!-- 총 결제금액 -->
              <div style="background-color: #3b82f6; border-radius: 8px; padding: 20px; text-align: center;">
                <span style="color: rgba(255,255,255,0.8); font-size: 14px;">총 결제금액</span>
                <div style="color: white; font-size: 28px; font-weight: bold; margin-top: 4px;">
                  ${amount.toLocaleString()}원
                </div>
              </div>

              <!-- 안내 메시지 -->
              <div style="margin-top: 24px; padding: 16px; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
                <p style="color: #92400e; margin: 0; font-size: 13px;">
                  <strong>📌 안내사항</strong><br/>
                  • 결제 내역은 <a href="${process.env.FRONTEND_URL}/mypage/payment" style="color: #3b82f6;">마이페이지 > 결제 관리</a>에서 확인하실 수 있습니다.<br/>
                  • 세금계산서 발행이 필요하신 경우 고객센터로 문의해주세요.
                </p>
              </div>
            </div>

            <!-- 푸터 -->
            <div style="text-align: center; padding: 24px 0; margin-top: 20px;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0 0 8px 0;">
                본 메일은 BloC 서비스 결제 완료 시 자동 발송되는 메일입니다.
              </p>
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                © 2025 BloC. All rights reserved.
              </p>
            </div>
          </div>
        `,
      });

      this.logger.log(
        `✅ 인보이스 이메일 전송 완료: ${email} (${invoiceNumber})`,
      );
    } catch (error) {
      this.logger.error(`❌ 인보이스 이메일 전송 실패: ${email}`, error);
      // 인보이스 이메일 실패는 결제에 영향을 주지 않도록 throw하지 않음
    }
  }

  /**
   * 크레딧 충전 완료 이메일 전송
   */
  async sendCreditPurchaseReceipt(data: {
    email: string;
    userName: string;
    receiptNumber: string; // 결제 ID 또는 트랜잭션 ID
    creditAmount: number; // 충전한 크레딧 수량
    paymentAmount: number; // 결제 금액 (원)
    paymentMethod: string; // 예: "신한카드 **** 1234"
    paymentDate: Date;
    totalCredits: number; // 충전 후 총 크레딧 잔액
  }): Promise<void> {
    const {
      email,
      userName,
      receiptNumber,
      creditAmount,
      paymentAmount,
      paymentMethod,
      paymentDate,
      totalCredits,
    } = data;

    // 날짜 포맷팅
    const formatDateTime = (date: Date) =>
      date.toLocaleString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

    try {
      await this.transporter.sendMail({
        from: `"BloC" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: `[BloC] 크레딧 충전 완료 - ${creditAmount.toLocaleString()} BloC`,
        html: `
          <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
            <!-- 헤더 -->
            <div style="text-align: center; padding: 40px 0 30px 0;">
              <h1 style="color: #3b82f6; margin: 0; font-size: 32px;">BloC</h1>
              <p style="color: #6b7280; margin-top: 8px; font-size: 14px;">블로그 원고 생성 서비스</p>
            </div>

            <!-- 메인 카드 -->
            <div style="background-color: white; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <!-- 성공 아이콘 & 제목 -->
              <div style="text-align: center; margin-bottom: 32px;">
                <div style="width: 64px; height: 64px; background-color: #dbeafe; border-radius: 50%; margin: 0 auto 16px; line-height: 64px;">
                  <span style="font-size: 32px;">⚡</span>
                </div>
                <h2 style="color: #111827; margin: 0 0 8px 0; font-size: 24px;">크레딧 충전 완료</h2>
                <p style="color: #6b7280; margin: 0; font-size: 14px;">${userName}님, 크레딧 충전이 성공적으로 완료되었습니다.</p>
              </div>

              <!-- 충전 결과 -->
              <div style="background-color: #eff6ff; border-radius: 8px; padding: 24px; margin-bottom: 24px; text-align: center;">
                <p style="color: #6b7280; font-size: 14px; margin: 0 0 8px 0;">충전된 크레딧</p>
                <p style="color: #3b82f6; font-size: 36px; font-weight: bold; margin: 0;">
                  +${creditAmount.toLocaleString()} <span style="font-size: 20px;">BloC</span>
                </p>
                <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #bfdbfe;">
                  <p style="color: #6b7280; font-size: 12px; margin: 0;">충전 후 총 잔액</p>
                  <p style="color: #1e40af; font-size: 18px; font-weight: 600; margin: 4px 0 0 0;">
                    ${totalCredits.toLocaleString()} BloC
                  </p>
                </div>
              </div>

              <!-- 결제 정보 -->
              <div style="background-color: #f9fafb; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
                <h3 style="color: #111827; margin: 0 0 16px 0; font-size: 16px;">결제 정보</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                      <span style="color: #6b7280; font-size: 14px;">영수증 번호</span>
                    </td>
                    <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
                      <span style="color: #111827; font-size: 14px; font-weight: 600;">#${receiptNumber}</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                      <span style="color: #6b7280; font-size: 14px;">결제일시</span>
                    </td>
                    <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
                      <span style="color: #111827; font-size: 14px;">${formatDateTime(paymentDate)}</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                      <span style="color: #6b7280; font-size: 14px;">결제수단</span>
                    </td>
                    <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
                      <span style="color: #111827; font-size: 14px;">${paymentMethod}</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 0;">
                      <span style="color: #6b7280; font-size: 14px;">상품</span>
                    </td>
                    <td style="padding: 12px 0; text-align: right;">
                      <span style="color: #111827; font-size: 14px;">BloC 크레딧 ${creditAmount.toLocaleString()}개</span>
                    </td>
                  </tr>
                </table>
              </div>

              <!-- 총 결제금액 -->
              <div style="background-color: #3b82f6; border-radius: 8px; padding: 20px; text-align: center;">
                <span style="color: rgba(255,255,255,0.8); font-size: 14px;">총 결제금액</span>
                <div style="color: white; font-size: 28px; font-weight: bold; margin-top: 4px;">
                  ${paymentAmount.toLocaleString()}원
                </div>
              </div>

              <!-- 안내 메시지 -->
              <div style="margin-top: 24px; padding: 16px; background-color: #ecfdf5; border-left: 4px solid #10b981; border-radius: 4px;">
                <p style="color: #065f46; margin: 0; font-size: 13px;">
                  <strong>✨ 충전 완료!</strong><br/>
                  충전된 크레딧으로 블로그 원고를 생성하실 수 있습니다.<br/>
                  결제 내역은 <a href="${process.env.FRONTEND_URL}/mypage/payment" style="color: #3b82f6;">마이페이지 > 결제 관리</a>에서 확인하세요.
                </p>
              </div>
            </div>

            <!-- 푸터 -->
            <div style="text-align: center; padding: 24px 0; margin-top: 20px;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0 0 8px 0;">
                본 메일은 BloC 서비스 크레딧 충전 시 자동 발송되는 메일입니다.
              </p>
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                © 2025 BloC. All rights reserved.
              </p>
            </div>
          </div>
        `,
      });

      this.logger.log(
        `✅ 크레딧 충전 완료 이메일 전송 완료: ${email} (${receiptNumber})`,
      );
    } catch (error) {
      this.logger.error(`❌ 크레딧 충전 완료 이메일 전송 실패: ${email}`, error);
      // 이메일 실패는 충전에 영향을 주지 않도록 throw하지 않음
    }
  }

  /**
   * 문의 답변 이메일 전송
   */
  async sendContactResponse(data: {
    email: string;
    name: string;
    subject: string;
    originalMessage: string;
    responseMessage: string;
    respondedAt: Date;
  }): Promise<void> {
    const { email, name, subject, originalMessage, responseMessage, respondedAt } =
      data;

    // 날짜 포맷팅
    const formatDateTime = (date: Date) =>
      date.toLocaleString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

    try {
      await this.transporter.sendMail({
        from: `"BloC 고객센터" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: `[BloC] 문의에 대한 답변 - ${subject}`,
        html: `
          <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
            <!-- 헤더 -->
            <div style="text-align: center; padding: 40px 0 30px 0;">
              <h1 style="color: #3b82f6; margin: 0; font-size: 32px;">BloC</h1>
              <p style="color: #6b7280; margin-top: 8px; font-size: 14px;">블로그 원고 생성 서비스</p>
            </div>

            <!-- 메인 카드 -->
            <div style="background-color: white; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <!-- 제목 -->
              <div style="margin-bottom: 24px;">
                <h2 style="color: #111827; margin: 0 0 8px 0; font-size: 20px;">문의에 대한 답변 드립니다</h2>
                <p style="color: #6b7280; margin: 0; font-size: 14px;">${name}님, 문의해 주셔서 감사합니다.</p>
              </div>

              <!-- 원본 문의 -->
              <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                <h3 style="color: #6b7280; font-size: 12px; text-transform: uppercase; margin: 0 0 12px 0;">문의 내용</h3>
                <p style="color: #374151; font-size: 14px; font-weight: 600; margin: 0 0 8px 0;">${subject}</p>
                <p style="color: #6b7280; font-size: 14px; margin: 0; line-height: 1.6; white-space: pre-wrap;">${originalMessage}</p>
              </div>

              <!-- 답변 내용 -->
              <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 0 8px 8px 0; padding: 20px; margin-bottom: 24px;">
                <h3 style="color: #1e40af; font-size: 12px; text-transform: uppercase; margin: 0 0 12px 0;">답변</h3>
                <p style="color: #1e3a8a; font-size: 14px; margin: 0; line-height: 1.8; white-space: pre-wrap;">${responseMessage}</p>
              </div>

              <!-- 답변 일시 -->
              <p style="color: #9ca3af; font-size: 12px; text-align: right; margin: 0;">
                답변일시: ${formatDateTime(respondedAt)}
              </p>

              <!-- 추가 문의 안내 -->
              <div style="margin-top: 24px; padding: 16px; background-color: #f0fdf4; border-left: 4px solid #22c55e; border-radius: 4px;">
                <p style="color: #166534; margin: 0; font-size: 13px;">
                  <strong>💬 추가 문의사항이 있으신가요?</strong><br/>
                  궁금하신 점이 더 있으시면 <a href="${process.env.FRONTEND_URL}/support" style="color: #3b82f6;">고객센터</a>를 통해 문의해 주세요.
                </p>
              </div>
            </div>

            <!-- 푸터 -->
            <div style="text-align: center; padding: 24px 0; margin-top: 20px;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0 0 8px 0;">
                본 메일은 BloC 고객센터에서 발송되는 답변 메일입니다.
              </p>
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                © 2025 BloC. All rights reserved.
              </p>
            </div>
          </div>
        `,
      });

      this.logger.log(`✅ 문의 답변 이메일 전송 완료: ${email}`);
    } catch (error) {
      this.logger.error(`❌ 문의 답변 이메일 전송 실패: ${email}`, error);
      // 이메일 실패는 답변 등록에 영향을 주지 않도록 throw하지 않음
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
