import { PrismaService } from '@lib/database';
import { DateService } from '@lib/date';
import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosError, Method } from 'axios';
import * as crypto from 'crypto';

import {
  GetRelatedKeywordResult,
  ISignature,
  KeywordStat,
  KeywordToolResponse,
  SearchAdApiError,
} from './dto/search-ad.dto';

@Injectable()
export class SearchAdService {
  private readonly logger = new Logger(SearchAdService.name);
  private readonly customerId: string;
  private readonly license: string;
  private readonly secretKey: string;

  private readonly serviceUrl = 'https://api.searchad.naver.com';
  constructor(
    private readonly httpService: HttpService,
    private readonly prisma: PrismaService,
    private readonly dateService: DateService,
    private readonly configService: ConfigService,
  ) {
    this.customerId = configService.get('NAVER_SEARCH_AD_CUSTOMER_ID') ?? '';
    this.license = configService.get('NAVER_SEARCH_AD_LICENSE') ?? '';
    this.secretKey = configService.get('NAVER_SEARCH_AD_SECRET_KEY') ?? '';
  }

  /**
   * 네이버 검색광고 API 요청 시 필요한 서명을 생성합니다.
   * @see https://naver.github.io/searchad-apidoc/#/samples
   */
  private createSign({ secretKey, requestEndpoint, method }: ISignature) {
    const timestamp = new Date().valueOf().toString();
    const hmac = crypto.createHmac('sha256', secretKey);
    hmac.update(`${timestamp}.${method}.${requestEndpoint}`);
    const hash = hmac.digest('base64');
    return { timestamp, hash };
  }

  /**
   * 네이버 검색광고 API 요청 시 필요한 헤더를 생성합니다.
   */
  createHeader(
    requestEndpoint: string,
    method: Method,
    account: {
      secretKey: string;
      license: string;
      customerId: string;
    },
  ) {
    // 시그니처 생성
    const { timestamp, hash } = this.createSign({
      secretKey: account.secretKey,
      requestEndpoint,
      method,
    });

    return {
      'X-Timestamp': timestamp,
      'X-API-KEY': account.license,
      'X-Customer': account.customerId,
      'X-Signature': hash,
      'Accept-Encoding': 'gzip,deflate,compress',
    };
  }

  /**
   * 오늘 날짜를 YYYYMMDD 형식으로 반환
   */
  private getTodayDateStr(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  }

  /**
   * 네이버 검색광고 연관 검색어 조회 (일일 캐싱 적용)
   * - 동일 키워드는 하루에 1번만 API 호출
   * - 캐시된 결과가 있으면 DB에서 반환
   * @see https://naver.github.io/searchad-apidoc/#/operations/GET/~2Fkeywordstool
   * @param keywords 조회할 키워드 배열
   * @returns 성공 시 키워드 통계 데이터, 실패 시 에러 정보
   */
  async getRelatedKeyword(
    keywords: string[],
  ): Promise<GetRelatedKeywordResult> {
    // 키워드 검증
    if (!keywords || keywords.length === 0) {
      return {
        success: false,
        error: {
          code: 400,
          title: 'Bad Request',
          detail: '조회할 키워드를 입력해주세요.',
        },
      };
    }

    // 키워드 정규화: 공백 제거
    const normalizedKeyword = keywords
      .map((k) => k.replace(/\s+/g, ''))
      .filter((k) => k.length > 0)
      .join(',');

    if (!normalizedKeyword) {
      return {
        success: false,
        error: {
          code: 400,
          title: 'Bad Request',
          detail: '유효한 키워드가 없습니다.',
        },
      };
    }

    const dateStr = this.getTodayDateStr();

    // 1. 캐시 조회
    try {
      const cached = await this.prisma.keywordStatCache.findUnique({
        where: {
          keyword_dateStr: {
            keyword: normalizedKeyword,
            dateStr,
          },
        },
      });

      if (cached) {
        const keywordList = cached.keywordList as unknown as KeywordStat[];
        this.logger.debug(
          `캐시 히트: ${normalizedKeyword} (${dateStr}) → ${keywordList.length}개 결과`,
        );
        return {
          success: true,
          data: { keywordList },
        };
      }
    } catch (error) {
      this.logger.warn(`캐시 조회 실패: ${error}`);
      // 캐시 조회 실패해도 API 호출 진행
    }

    // 2. 캐시 미스 - API 호출
    this.logger.debug(
      `캐시 미스: ${normalizedKeyword} (${dateStr}) - API 호출`,
    );
    const result = await this.fetchRelatedKeywordFromApi(keywords);

    // 3. 성공 시 캐시 저장
    if (result.success) {
      try {
        await this.prisma.keywordStatCache.upsert({
          where: {
            keyword_dateStr: {
              keyword: normalizedKeyword,
              dateStr,
            },
          },
          create: {
            keyword: normalizedKeyword,
            dateStr,
            keywordList: result.data.keywordList as object[],
          },
          update: {
            keywordList: result.data.keywordList as object[],
            fetchedAt: new Date(),
          },
        });
        this.logger.debug(`캐시 저장 완료: ${normalizedKeyword} (${dateStr})`);
      } catch (error) {
        this.logger.warn(`캐시 저장 실패: ${error}`);
        // 캐시 저장 실패해도 결과는 반환
      }
    }

    return result;
  }

  /**
   * 네이버 검색광고 API 직접 호출 (내부용)
   * @param keywords 조회할 키워드 배열
   * @returns 성공 시 키워드 통계 데이터, 실패 시 에러 정보
   */
  private async fetchRelatedKeywordFromApi(
    keywords: string[],
  ): Promise<GetRelatedKeywordResult> {
    // API 설정 검증
    if (!this.customerId || !this.license || !this.secretKey) {
      this.logger.error('네이버 검색광고 API 설정이 누락되었습니다.');
      return {
        success: false,
        error: {
          code: 0,
          title: 'Configuration Error',
          detail:
            '네이버 검색광고 API 설정(NAVER_SEARCH_AD_CUSTOMER_ID, NAVER_SEARCH_AD_LICENSE, NAVER_SEARCH_AD_SECRET_KEY)이 필요합니다.',
        },
      };
    }

    // 키워드 검증
    if (!keywords || keywords.length === 0) {
      return {
        success: false,
        error: {
          code: 400,
          title: 'Bad Request',
          detail: '조회할 키워드를 입력해주세요.',
        },
      };
    }

    const requestEndpoint = '/keywordstool';
    const method: Method = 'GET';
    const headers = this.createHeader(requestEndpoint, method, {
      secretKey: this.secretKey,
      license: this.license,
      customerId: this.customerId,
    });

    // 키워드 전처리: 공백 제거 후 쉼표로 연결
    const hintKeywords = keywords
      .map((keyword) => keyword.replace(/\s+/g, ''))
      .filter((keyword) => keyword.length > 0)
      .join(',');

    if (!hintKeywords) {
      return {
        success: false,
        error: {
          code: 400,
          title: 'Bad Request',
          detail: '유효한 키워드가 없습니다.',
        },
      };
    }

    const url = new URL(this.serviceUrl + requestEndpoint);
    url.searchParams.set('hintKeywords', hintKeywords);
    url.searchParams.set('showDetail', '1');

    try {
      const { data } = await this.httpService.axiosRef.get<KeywordToolResponse>(
        url.toString(),
        { headers },
      );

      this.logger.debug(
        `키워드 조회 성공: ${keywords.join(', ')} → ${data.keywordList?.length || 0}개 결과`,
      );

      return {
        success: true,
        data,
      };
    } catch (error) {
      const axiosError = error as AxiosError<SearchAdApiError>;

      // API 에러 응답이 있는 경우
      if (axiosError.response?.data) {
        const apiError = axiosError.response.data;
        this.logger.warn(
          `네이버 검색광고 API 에러: [${apiError.code}] ${apiError.title} - ${apiError.detail}`,
        );
        return {
          success: false,
          error: {
            code: apiError.code || axiosError.response.status,
            title: apiError.title || 'API Error',
            detail: apiError.detail || '알 수 없는 에러가 발생했습니다.',
          },
        };
      }

      // 네트워크 에러 등
      const statusCode = axiosError.response?.status || 500;
      const errorMessage =
        axiosError.message || '네트워크 에러가 발생했습니다.';

      this.logger.error(
        `네이버 검색광고 API 요청 실패: ${errorMessage}`,
        axiosError.stack,
      );

      return {
        success: false,
        error: {
          code: statusCode,
          title: 'Request Failed',
          detail: errorMessage,
        },
      };
    }
  }
}
