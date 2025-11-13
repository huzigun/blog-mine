import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import { nanoid } from 'nanoid';
import iconv from 'iconv-lite';
import * as crypto from 'crypto';
import { cipher, decipher } from '../../encrypt';
import {
  IApprovePaymentResult,
  IBillingResult,
  ICancelPaymentResult,
  ICardExtraInfo,
  ICardInfo,
} from './nicepay.dto';
import { PrismaService } from '@lib/database';
import { DateService } from '@lib/date';

/**
 * 나이스페이 빌링키 관련 서비스
 * @see https://developers.nicepay.co.kr/manual-card-billing.php
 */
@Injectable()
export class NiceBillingService {
  private UNAUTH_MID: string;
  private UNAUTH_KEY: string;
  private readonly billingUrl =
    'https://webapi.nicepay.co.kr/webapi/billing/billing_regist.jsp';

  private readonly cardKeyinUrl =
    'https://webapi.nicepay.co.kr/webapi/card_keyin.jsp';

  private readonly logger = new Logger(NiceBillingService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly dateService: DateService,
    private readonly configService: ConfigService,
    private prisma: PrismaService,
  ) {
    this.UNAUTH_MID = configService.get<string>('NICEPAY_UNAUTH_MID') || '';
    this.UNAUTH_KEY = configService.get<string>('NICEPAY_UNAUTH_KEY') || '';
  }

  /**
   * HMAC 암호화
   * @param str 암호화할 문자열
   * @returns 암호화된 문자열
   */
  private getSignData(str: string) {
    const hash = crypto.createHash('sha256');
    hash.update(str);
    return hash.digest('hex');
  }

  /**
   * 결제 정보 암호화 데이터
   * @param text 암호화할 문자열
   * @param key 암호화 키
   * @returns 암호화된 문자열
   */
  private getAES(text: string, key: string) {
    const encKey = key.substring(0, 16);
    const cipher = crypto.createCipheriv(
      'aes-128-ecb',
      encKey,
      Buffer.alloc(0),
    );
    const ciphertext = Buffer.concat([
      cipher.update(text, 'utf8'),
      cipher.final(),
    ]).toString('hex');
    return ciphertext;
  }

  /**
   * 빌링키 암호화
   * @param billingKey 빌링키
   * @returns 암호화된 빌링키
   */
  private encryptBillingKey(billingKey: string) {
    return cipher(billingKey, this.UNAUTH_KEY);
  }

  /**
   * 빌링키 복호화
   * @param encryptedBillingKey 암호화된 빌링키
   * @returns 복호화된 빌링키
   */
  private decryptBillingKey(encryptedBillingKey: string) {
    return decipher(encryptedBillingKey, this.UNAUTH_KEY);
  }

  /**
   * 나이스페이 빌링키 발급
   * @param cardInfo 카드 정보
   * @param userId 사용자 ID
   * @returns 빌링키 발급 결과
   */
  async getBillingKey(cardInfo: ICardInfo, userId: string) {
    this.logger.debug(`Received cardInfo: ${JSON.stringify(cardInfo)}`);
    const { cardNo, expireYear, expireMonth, idNo, cardPw } = cardInfo;

    if (!cardNo || !expireYear || !expireMonth || !idNo || !cardPw) {
      throw new Error(
        `Missing required card information: cardNo=${cardNo}, expireYear=${expireYear}, expireMonth=${expireMonth}, idNo=${idNo}, cardPw=${cardPw}`,
      );
    }

    const ediDate = this.dateService.now().format('YYYYMMDDHHmmss');
    const aesString = `CardNo=${cardNo}&ExpYear=${expireYear}&ExpMonth=${expireMonth}&IDNo=${idNo}&CardPw=${cardPw}`;
    const moid = 'nicepay-billingkey-' + nanoid(); // Nicepay 빌링키 발급 주문번호
    try {
      const signature = this.getSignData(
        this.UNAUTH_MID + ediDate + moid + this.UNAUTH_KEY,
      );
      const { data: result } =
        await this.httpService.axiosRef.request<IBillingResult>({
          method: 'POST',
          url: this.billingUrl,
          headers: {
            'User-Agent': 'Super Agent/0.0.1',
            'Content-Type': 'application/x-www-form-urlencoded; charset=euc-kr',
          },
          data: {
            MID: this.UNAUTH_MID,
            EdiDate: ediDate,
            Moid: moid,
            EncData: this.getAES(aesString, this.UNAUTH_KEY),
            SignData: signature,
            CharSet: 'utf-8',
          },
        });

      const success = result.ResultCode === 'F100';

      const maskingCardNo = cardNo.replace(
        /^(.{8})(.{4})(.{3})(.{1})$/,
        '$1****$3*',
      );

      // 결과 저장
      await this.prisma.nicepayResult.create({
        data: {
          resultCode: result.ResultCode,
          resultMsg: result.ResultMsg,
          tid: result.TID,
          moid,
          signature,
          userId,
          cardCode: result.CardCode,
          cardName: result.CardName,
          cardCl: result.CardCl,
          goodsName: '빌링키 발급',
          mid: this.UNAUTH_MID,
          authDate: result.AuthDate,
          cardNo: maskingCardNo,
          approvedAt: success ? this.dateService.now().toDate() : null, // 발급 성공시에만 현재 시간
        },
      });

      return {
        success,
        code: result.ResultCode,
        message: result.ResultMsg,
        originalData:
          success && result.BID
            ? {
                ...result,
                Moid: moid,
                cardNo: maskingCardNo,
                BID: this.encryptBillingKey(result.BID),
              }
            : null,
      };
    } catch (error) {
      if (error instanceof AxiosError) {
        this.logger.error(error.response?.data);
      } else {
        this.logger.error(error.message);
      }
      throw error;
    }
  }

  /**
   * 나이스페이 빌링키 삭제
   * @param billingKey 빌링키
   * @returns 빌링키 삭제 결과
   */
  async removeBillingKey(encryptedBillingKey: string) {
    const billingKey = this.decryptBillingKey(encryptedBillingKey);
    const merchantID = this.UNAUTH_MID;
    const merchantKey = this.UNAUTH_KEY;
    const ediDate = this.dateService.now().format('YYYYMMDDHHmmss');
    const moid = 'atms-billing-remove-' + nanoid();
    const signData = this.getSignData(
      merchantID + ediDate + moid + billingKey + merchantKey,
    );

    try {
      const { data } = await this.httpService.axiosRef.request({
        url: 'https://webapi.nicepay.co.kr/webapi/billing/billkey_remove.jsp',
        method: 'POST',
        headers: {
          'User-Agent': 'Super Agent/0.0.1',
          'Content-Type': 'application/x-www-form-urlencoded; charset=euc-kr',
        },
        data: {
          BID: billingKey,
          MID: merchantID,
          EdiDate: ediDate,
          Moid: moid,
          SignData: signData,
          CharSet: 'utf-8',
        },
      });

      return {
        success: data.ResultCode === 'F101',
        code: data.ResultCode,
        message: data.ResultMsg,
        originalData: data,
      };
    } catch (error) {
      let errorResult: any;
      if (error instanceof AxiosError) {
        errorResult = error.response?.data;
      } else {
        errorResult = error.message;
      }

      throw new Error(errorResult.ResultMsg);
    }
  }

  /**
   * 빌링 결제 요청
   * @param encryptedBillingKey 암호화된 빌링키
   * @param options 결제 옵션
   * @param options.amount 결제 금액
   * @param options.userId 사용자 ID - 선택
   * @param options.goodsName 상품명 (기본값: ATMS 상품 결제)
   * @returns 결제 결과
   */
  async approvePayment(
    encryptedBillingKey: string,
    options: {
      amount: number;
      userId?: string;
      name?: string;
      phone?: string;
      email?: string;
      goodsName?: string;
    },
  ) {
    const { amount, userId } = options;
    const billingKey = this.decryptBillingKey(encryptedBillingKey);
    const merchantID = this.UNAUTH_MID;
    const merchantKey = this.UNAUTH_KEY;
    const goodsName = options.goodsName ?? 'ATMS PAYMENT'; // 상품명
    const moid = 'atms-payment-' + nanoid(); // 가맹점 주문번호
    const cardInterest = '0'; // 무이자 여부
    const cardQuota = '00'; // 할부 개월 수

    const ediDate = this.dateService.now().format('YYYYMMDDHHmmss');

    // 요청할 거래번호(TID)를 생성합니다.
    const ranNum = Math.floor(Math.random() * (9999 - 1000 + 1)) + 1000;
    const transactionID = merchantID + '0116' + ediDate.substring(2) + ranNum;

    // 데이터 위변조 검증값을 생성합니다. (거래 위변조를 막기 위한 방법입니다. 수정을 금지합니다.)
    const signData = this.getSignData(
      merchantID + ediDate + moid + amount + billingKey + merchantKey,
    );

    try {
      const { data } =
        await this.httpService.axiosRef.request<IApprovePaymentResult>({
          url: 'https://webapi.nicepay.co.kr/webapi/billing/billing_approve.jsp',
          method: 'POST',
          headers: {
            'User-Agent': 'Super Agent/0.0.1',
            'Content-Type': 'application/x-www-form-urlencoded; charset=euc-kr',
          },
          data: {
            TID: transactionID,
            BID: billingKey,
            MID: merchantID,
            EdiDate: ediDate,
            Moid: moid,
            Amt: amount,
            GoodsName: goodsName,
            SignData: signData,
            CardInterest: cardInterest,
            CardQuota: cardQuota,
            BuyerEmail: options.email || undefined,
            BuyerTel: options.phone
              ? decipher(options.phone, process.env.PRIVATE_ENCRYPT_KEY || '')
              : undefined,
            BuyerName: options.name || undefined,
            CharSet: 'utf-8',
          },
        });

      // 결과 저장
      await this.prisma.nicepayResult.create({
        data: {
          resultCode: data.ResultCode,
          resultMsg: data.ResultMsg,
          mid: merchantID,
          tid: data.TID,
          moid: data.Moid,
          amt: data.Amt ?? amount.toString(),
          authCode: data.AuthCode,
          authDate: data.AuthDate,
          cardNo: data.CardNo,
          cardCode: data.CardCode,
          cardName: data.CardName,
          cardCl: data.CardCl,
          ccPartCl: data.CcPartCl,
          cardInterest: data.CardInterest,
          mallReserved: data.MallReserved,
          userId: userId || '',
          signature: signData,
          goodsName,
        },
      });

      return {
        success: data.ResultCode === '3001',
        message: data.ResultMsg,
        originalData: {
          ...data,
          goodsName,
        },
      };
    } catch (error) {
      let errorResult: any;
      if (error instanceof AxiosError) {
        errorResult = error.response?.data;
      } else {
        errorResult = error.message;
      }

      throw new Error(errorResult.ResultMsg);
    }
  }

  /**
   * 결제 취소
   * @param tid 거래번호
   * @param cancelAmt 취소 금액
   * @param message 취소 메시지
   * @returns 취소 결과
   */
  async cancelPayment(
    tid: string,
    options: {
      cancelAmt: number;
      message?: string;
      userId?: string;
    },
  ) {
    const merchantID = this.UNAUTH_MID;
    const merchantKey = this.UNAUTH_KEY;
    const moid = 'atms-payment-' + nanoid(); // 가맹점 주문번호
    const ediDate = this.dateService.now().format('YYYYMMDDHHmmss');
    const cancelMsg = iconv.encode(options.message ?? '취소 처리', 'euc-kr');

    const signData = this.getSignData(
      merchantID + options.cancelAmt + ediDate + merchantKey,
    );

    try {
      const { data } =
        await this.httpService.axiosRef.request<ICancelPaymentResult>({
          url: 'https://webapi.nicepay.co.kr/webapi/cancel_process.jsp',
          method: 'POST',
          headers: {
            'User-Agent': 'Super Agent/0.0.1',
            'Content-Type': 'application/x-www-form-urlencoded; charset=euc-kr',
          },
          data: {
            TID: tid,
            MID: merchantID,
            Moid: moid,
            CancelAmt: options.cancelAmt,
            CancelMsg: cancelMsg, // 취소 메세지 한글 처리 시 인코딩 euc-kr로 요청.
            PartialCancelCode: '0', // 부분취소 여부 0: 전체취소, 1: 부분취소(별도 계약 필요)
            EdiDate: ediDate,
            SignData: signData,
            CharSet: 'utf-8',
          },
        });

      await this.prisma.nicepayResult.create({
        data: {
          resultCode: data.ResultCode,
          resultMsg: data.ResultMsg,
          mid: merchantID,
          tid: tid,
          moid: moid,
          signature: signData,
          userId: options.userId || '',
          mallReserved: data.MallReserved,
          goodsName: options.message ?? '취소 처리',
          msgSource: data.MsgSource,
          cancelAmt: data.CancelAmt,
          cancelDate: data.CancelDate,
          cancelTime: data.CancelTime,
          cancelNum: data.CancelNum,
          remainAmt: data.RemainAmt,
          errorCd: data.ErrorCD,
          errorMsg: data.ErrorMsg,
          payMethod: data.PayMethod,
          couponAmt: data.CouponAmt,
          clickpayCl: data.ClickpayCl,
          multiCardAcquAmt: data.MultiCardAcquAmt,
          multiPointAmt: data.MultiPointAmt,
          multiCouponAmt: data.MultiCouponAmt,
          multiDiscountAmt: data.MultiDiscountAmt,
        },
      });

      return {
        success: data.ResultCode === '2001',
        message: data.ResultMsg,
        originalData: data,
      };
    } catch (error) {
      // console.log(error);
      let errorResult: any;
      if (error instanceof AxiosError) {
        errorResult = error.response?.data;
      } else {
        errorResult = error.message;
      }
      throw new Error(errorResult);
    }
  }

  /**
   * 카드 키인 결제
   * @params userId 유저 아이디
   * @params cardInfo 카드정보
   * @returns 결제 결과
   */
  async cardKeyin(cardInfo: ICardInfo & ICardExtraInfo) {
    const {
      cardNo,
      expireYear,
      expireMonth,
      idNo,
      cardPw,
      cardInterest,
      cardQuota,
      orderName = 'ATMS 수동 결제',
      amt,
    } = cardInfo;

    const ediDate = this.dateService.now().format('YYYYMMDDHHmmss');
    // 요청할 거래번호(TID)를 생성합니다.
    const ranNum = Math.floor(Math.random() * (9999 - 1000 + 1)) + 1000;
    const transactionID =
      this.UNAUTH_MID + '0101' + ediDate.substring(2, 14) + ranNum;

    const moid = 'atms-billing-' + nanoid();

    const cardExpire = `${expireYear}${expireMonth}`;
    const aesString = `CardNo=${cardNo}&CardExpire=${cardExpire}&BuyerAuthNum=${idNo}&CardPwd=${cardPw}`;

    const signData = this.getSignData(
      this.UNAUTH_MID + amt + ediDate + moid + this.UNAUTH_KEY,
    );

    const payload = {
      TID: transactionID,
      MID: this.UNAUTH_MID,
      EdiDate: ediDate,
      Moid: moid,
      Amt: amt,
      GoodsName: orderName,
      EncData: this.getAES(aesString, this.UNAUTH_KEY),
      SignData: signData,
      CardInterest: cardInterest,
      CardQuota: cardQuota,
      CharSet: 'utf-8',
    };

    try {
      const { data: result } = await this.httpService.axiosRef.request({
        method: 'POST',
        url: this.cardKeyinUrl,
        headers: {
          'User-Agent': 'Super Agent/0.0.1',
          'Content-Type': 'application/x-www-form-urlencoded; charset=euc-kr',
        },
        data: payload,
      });

      return {
        result,
        signData,
      };
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
