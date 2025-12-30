import { ConfigService } from '@lib/config';
import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import {
  RequestPostDto,
  RequestPostResultDto,
  GetBlogListRequestDto,
  GetBlogListResultDto,
} from './dto';

/**
 * HelloDM API 응답 타입 (내부용)
 */
interface HelloDmPostingResponse {
  code: string;
  message: string;
  post_no?: number;
}

interface HelloDmBlogListResponse {
  code: string;
  message: string;
  total_cnt?: string;
  title?: string;
  post_no: number;
  page: number;
  limit: number;
  items?: {
    state_no: string;
    sort: string;
    date: string;
    url: string;
  }[];
}

@Injectable()
export class HelloDmService {
  private readonly logger = new Logger(HelloDmService.name);
  private openApiKey: string = 'rlc6dwBFw4ybFV9Lv7qvAv1tvXopa3hg';
  private readonly API_URL = 'https://marketing.hello-dm.kr/api';

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  private createHeader(headers?: { [key: string]: string }) {
    return {
      ...headers,
      openapi_key: this.openApiKey,
    };
  }

  /**
   * HelloDM 포스팅 등록 요청
   */
  async requestPost(input: RequestPostDto): Promise<RequestPostResultDto> {
    const headers = this.createHeader();
    const endpoint = this.API_URL + '/posting.php';

    try {
      const { data } =
        await this.httpService.axiosRef.post<HelloDmPostingResponse>(
          endpoint,
          {
            ...input,
            title: '테스트', // 개발중에는 타이틀에 테스트 표기, 추후 제거 예정
            modify6: '1',
          },
          { headers },
        );

      return {
        success: data.code === '200',
        message: data.message,
        postNo: data.post_no,
      };
    } catch (error: any) {
      this.logger.error(`포스팅 등록 실패: ${error.message}`);
      return {
        success: false,
        message: error.message || '블로그 등록 요청에 실패하였습니다.',
      };
    }
  }

  /**
   * HelloDM 배포 결과 조회 (페이징 지원)
   * @param request 조회 요청 DTO
   * @returns 블로그 포스팅 목록 및 페이징 정보
   */
  async getBlogList(
    request: GetBlogListRequestDto,
  ): Promise<GetBlogListResultDto> {
    const { postNo, page = 1, limit = 30 } = request;
    const endpoint = this.API_URL + '/posting_state.php';
    const headers = this.createHeader();

    try {
      const { data } =
        await this.httpService.axiosRef.get<HelloDmBlogListResponse>(endpoint, {
          headers,
          params: {
            post_no: postNo,
            page,
            limit,
          },
        });

      const totalCount = data.total_cnt ? parseInt(data.total_cnt, 10) : 0;
      const totalPages = Math.ceil(totalCount / limit);

      // API 응답 아이템을 DTO로 변환 (snake_case → camelCase)
      const items = (data.items || []).map((item) => ({
        stateNo: item.state_no,
        sort: item.sort,
        date: item.date,
        url: item.url,
      }));

      // code가 200이어도 items가 없으면 조회 실패(결과 없음)로 처리
      const hasItems = !!(data.items && data.items.length > 0);
      const success = data.code === '200' && hasItems;
      const message = success
        ? data.message
        : hasItems
          ? data.message
          : '배포 결과가 없습니다.';

      return {
        success,
        message,
        postNo: data.post_no,
        title: data.title,
        items,
        pagination: {
          currentPage: page,
          limit,
          totalCount,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      };
    } catch (error: any) {
      this.logger.error(`배포 결과 조회 실패: ${error.message}`);
      return {
        success: false,
        message: error.message || '배포 결과 조회에 실패하였습니다.',
        postNo,
        items: [],
        pagination: {
          currentPage: page,
          limit,
          totalCount: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };
    }
  }
}
