import { HttpService } from '@nestjs/axios';
import {
  BadRequestException,
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SubmitPostDto } from './dto';
import { AxiosError } from 'axios';

/**
 * 외부 포스팅 API 응답 인터페이스
 */
interface PostingApiResponse {
  code: string;
  message: string;
  post_no?: number;
}

/**
 * 주문 요청 결과 인터페이스
 */
export interface OrderResult {
  postNo: number;
  message: string;
}

/**
 * 여러 주문 처리 결과 인터페이스
 */
export interface MultipleOrdersResult {
  success: OrderResult[];
  failed: Array<{ order: SubmitPostDto; error: string }>;
}

/**
 * API 요청 바디 인터페이스 (snake_case)
 */
interface PostingApiRequestBody {
  adcompany: string;
  adhp: string;
  ademail: string;
  title: string;
  order_item: number;
  mosu: number;
  wg_company: string;
  wg_content: string;
  okday_cnt?: number;
  wg_hugi?: string;
  wg_keyword?: string[];
  wg_ex_site?: string[];
  keyword_option_use?: string;
  keyword_id?: string;
  keyword_pw?: string;
  wg_required_txt?: string;
  wg_url_link?: string;
  wg_map_link?: string;
  wg_tag?: string[];
  wg_cost_image?: number;
}

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);
  private readonly API_URL = 'https://marketing.hello-dm.kr/api';
  private readonly API_KEY: string;
  private readonly REQUEST_TIMEOUT = 30000; // 30초
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000; // 1초

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    // 환경변수에서 API 키 로드 (없으면 기본값 사용)
    this.API_KEY =
      this.configService.get<string>('HELLO_DM_API_KEY') ||
      'rlc6dwBFw4ybFV9Lv7qvAv1tvXopa3hg';
  }

  /**
   * 포스팅 주문 요청
   * @param body - 주문 요청 데이터
   * @returns 주문 결과 (post_no 포함)
   */
  async requestOrder(body: SubmitPostDto): Promise<OrderResult> {
    const requestBody = this.buildRequestBody(body);

    this.logger.log(
      `Requesting order: ${body.title} (${body.mosu}건, order_item: ${body.orderItem})`,
    );

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        const result = await this.executeRequest(requestBody);

        this.logger.log(
          `Order successful: post_no=${result.postNo}, message="${result.message}"`,
        );

        return result;
      } catch (error) {
        lastError = error as Error;

        // 비즈니스 로직 에러는 재시도하지 않음
        if (error instanceof BadRequestException) {
          throw error;
        }

        this.logger.warn(
          `Order request failed (attempt ${attempt}/${this.MAX_RETRIES}): ${lastError.message}`,
        );

        if (attempt < this.MAX_RETRIES) {
          await this.sleep(this.RETRY_DELAY * attempt);
        }
      }
    }

    this.logger.error(
      `Order request failed after ${this.MAX_RETRIES} attempts`,
      lastError?.stack,
    );

    throw new InternalServerErrorException(
      `포스팅 주문 요청 실패: ${lastError?.message || '알 수 없는 오류'}`,
    );
  }

  /**
   * 여러 주문을 순차적으로 처리
   * @param orders - 주문 목록
   * @returns 성공/실패 결과 목록
   */
  async requestMultipleOrders(
    orders: SubmitPostDto[],
  ): Promise<MultipleOrdersResult> {
    const success: OrderResult[] = [];
    const failed: Array<{ order: SubmitPostDto; error: string }> = [];

    for (const order of orders) {
      try {
        const result = await this.requestOrder(order);
        success.push(result);

        // Rate limit 방지를 위한 딜레이
        if (orders.indexOf(order) < orders.length - 1) {
          await this.sleep(500);
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        failed.push({ order, error: errorMessage });

        this.logger.warn(
          `Failed to process order for ${order.title}: ${errorMessage}`,
        );
      }
    }

    this.logger.log(
      `Multiple orders completed: ${success.length} success, ${failed.length} failed`,
    );

    return { success, failed };
  }

  /**
   * 실제 HTTP 요청 실행
   */
  private async executeRequest(
    requestBody: PostingApiRequestBody,
  ): Promise<OrderResult> {
    try {
      const { data } = await this.httpService.axiosRef.post<PostingApiResponse>(
        `${this.API_URL}/posting.php`,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json',
            openapi_key: this.API_KEY,
          },
          timeout: this.REQUEST_TIMEOUT,
        },
      );

      // API 응답 검증
      if (data.code !== '200' || !data.post_no) {
        throw new BadRequestException(
          data.message || '포스팅 등록에 실패했습니다',
        );
      }

      return {
        postNo: data.post_no,
        message: data.message,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      if (error instanceof AxiosError) {
        const status = error.response?.status;
        const responseData = error.response?.data as
          | { message?: string }
          | undefined;
        const message = responseData?.message || error.message;

        if (status === 401 || status === 403) {
          throw new BadRequestException('API 인증에 실패했습니다');
        }

        if (status === 429) {
          throw new InternalServerErrorException(
            'API 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.',
          );
        }

        throw new InternalServerErrorException(
          `API 요청 실패 (${status || 'network error'}): ${message}`,
        );
      }

      throw error;
    }
  }

  /**
   * 요청 바디 빌드 (camelCase → snake_case 변환)
   */
  private buildRequestBody(body: SubmitPostDto): PostingApiRequestBody {
    const requestBody: PostingApiRequestBody = {
      adcompany: body.adcompany,
      adhp: body.adhp,
      ademail: body.ademail,
      title: body.title,
      order_item: body.orderItem,
      mosu: body.mosu,
      wg_company: body.wgCompany,
      wg_content: body.wgContent,
    };

    // 선택적 필드 추가
    if (body.okdayCnt && body.okdayCnt > 0) {
      requestBody.okday_cnt = body.okdayCnt;
    }

    if (body.wgHugi) {
      requestBody.wg_hugi = body.wgHugi;
    }

    // 키워드 배열 필터링
    const wgKeyword = body.wgKeyword;
    if (wgKeyword && wgKeyword.length > 0) {
      const keywords = wgKeyword.filter((k: string) => k.trim().length > 0);
      if (keywords.length > 0) {
        requestBody.wg_keyword = keywords;
      }
    }

    // 참고 사이트 배열 필터링
    const wgExSite = body.wgExSite;
    if (wgExSite && wgExSite.length > 0) {
      const exSites = wgExSite.filter((s: string) => s.trim().length > 0);
      if (exSites.length > 0) {
        requestBody.wg_ex_site = exSites;
      }
    }

    // 플레이스 저인망 키워드 옵션
    if (body.keywordOptionUse) {
      requestBody.keyword_option_use = body.keywordOptionUse;
      if (body.keywordId) requestBody.keyword_id = body.keywordId;
      if (body.keywordPw) requestBody.keyword_pw = body.keywordPw;
    }

    // 추가 선택 필드
    if (body.wgRequiredTxt) {
      requestBody.wg_required_txt = body.wgRequiredTxt;
    }

    if (body.wgUrlLink) {
      requestBody.wg_url_link = body.wgUrlLink;
    }

    if (body.wgMapLink) {
      requestBody.wg_map_link = body.wgMapLink;
    }

    // 태그 배열 필터링
    if (body.wgTag && body.wgTag.length > 0) {
      const tags = body.wgTag.filter((t) => t.trim().length > 0);
      if (tags.length > 0) {
        requestBody.wg_tag = tags;
      }
    }

    // 대가성 문구 (boolean → number)
    requestBody.wg_cost_image = body.wgCostImage ? 4 : 0;

    return requestBody;
  }

  /**
   * 딜레이 유틸리티
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
