import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '../../../../lib/config';
import { firstValueFrom, map } from 'rxjs';
import * as cheerio from 'cheerio';

export interface NaverBlogSearchResponse {
  lastBuildDate: string;
  total: number;
  start: number;
  display: number;
  items: Array<{
    title: string;
    link: string;
    description: string;
    bloggername: string;
    bloggerlink: string;
    postdate: string;
  }>;
}

export interface BlogSearchResult {
  title: string;
  link: string;
  description: string;
  bloggerName: string;
  bloggerLink: string;
  postDate: string;
  content: string;
  realUrl: string;
  rank: number; // 검색 결과에서의 순위 (1부터 시작)
}

@Injectable()
export class NaverApiService {
  private readonly logger = new Logger(NaverApiService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * 네이버 블로그 검색
   * @param keyword - 검색 키워드
   * @param display - 검색 결과 수 (기본 20, 최대 100)
   * @returns 검색 결과 및 총 결과 수
   */
  async searchBlogsByKeyword(
    keyword: string,
    display: number = 20,
  ): Promise<{
    total: number;
    results: BlogSearchResult[];
  }> {
    const clientId = this.configService.naverClientId;
    const clientSecret = this.configService.naverClientSecret;

    if (!clientId || !clientSecret) {
      throw new Error('Naver API credentials not configured');
    }

    const endpoint = 'https://openapi.naver.com/v1/search/blog.json';
    const url = new URL(endpoint);
    url.searchParams.append('display', display.toString());
    url.searchParams.append('query', keyword);

    this.logger.log(`Searching Naver blogs for keyword: "${keyword}"`);

    try {
      const response = await firstValueFrom(
        this.httpService
          .get<NaverBlogSearchResponse>(url.toString(), {
            headers: {
              'X-Naver-Client-Id': clientId,
              'X-Naver-Client-Secret': clientSecret,
            },
          })
          .pipe(map((res) => res.data)),
      );

      this.logger.log(
        `Found ${response.total} results, fetching ${response.items.length} items`,
      );

      // 각 블로그의 콘텐츠 수집 (병렬 처리)
      const results = await Promise.all(
        response.items.map(async (item, index) => {
          const { content, url: realUrl } = await this.getBlogContent(
            item.link,
          );

          return {
            title: this.stripHtmlTags(item.title),
            link: item.link,
            description: this.stripHtmlTags(item.description),
            bloggerName: item.bloggername,
            bloggerLink: item.bloggerlink,
            postDate: item.postdate,
            content,
            realUrl,
            rank: index + 1, // 순위는 1부터 시작
          };
        }),
      );

      return {
        total: response.total,
        results,
      };
    } catch (error) {
      this.logger.error(
        `Failed to search blogs: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * 블로그 URL에서 HTML 콘텐츠를 가져와 파싱
   * @param url - 블로그 게시글 URL
   * @returns 파싱된 블로그 콘텐츠 및 실제 URL
   */
  private async getBlogContent(
    url: string,
  ): Promise<{ content: string; url: string }> {
    try {
      const mainFrameUrl = this.extractNaverBlogFrameUrl(url);

      const finalHtml = await firstValueFrom(
        this.httpService
          .get<string>(mainFrameUrl || url, {
            responseType: 'text',
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
          })
          .pipe(map((res) => res.data)),
      );

      const $$ = cheerio.load(finalHtml);

      // 주요 콘텐츠 선택자
      const contentSelectors = [
        '.se-main-container', // 네이버 블로그 스마트에디터
        '.se_component_wrap', // 네이버 블로그 (구버전)
      ];

      let content = '';
      for (const selector of contentSelectors) {
        const element = $$(selector);
        if (element.length > 0) {
          content = element.text().trim();
          break;
        }
      }

      // 콘텐츠를 찾지 못한 경우 body 전체에서 텍스트 추출
      if (!content) {
        content = $$('body').text().trim();
      }

      // 중복 공백 제거 및 정리
      content = content.replace(/\s+/g, ' ').trim();

      // 콘텐츠 길이 제한 (너무 길면 처음 5000자만)
      if (content.length > 5000) {
        content = content.substring(0, 5000) + '...';
      }

      return { content, url: mainFrameUrl || url };
    } catch (error) {
      this.logger.warn(`Failed to fetch content from ${url}: ${error.message}`);
      // 콘텐츠 수집 실패 시 빈 문자열 반환 (순위 수집은 계속 진행)
      return { content: '', url };
    }
  }

  /**
   * 네이버 블로그 URL에서 실제 콘텐츠가 있는 iframe URL 추출
   * @param url - 네이버 블로그 URL
   * @returns iframe URL 또는 null
   */
  private extractNaverBlogFrameUrl(url: string): string | null {
    try {
      const urlObj = new URL(url);

      // 이미 iframe URL인 경우
      if (urlObj.pathname.includes('/PostView.')) {
        return url;
      }

      // 일반 블로그 URL에서 logNo 추출
      const splitPath = urlObj.pathname.split('/');

      if (splitPath.length < 3) {
        return null;
      }

      const logNo = splitPath[2];
      const blogId = splitPath[1];

      if (logNo && blogId) {
        return `https://blog.naver.com/PostView.naver?blogId=${blogId}&logNo=${logNo}`;
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * HTML 태그 제거
   */
  private stripHtmlTags(html: string): string {
    return html.replace(/<[^>]*>/g, '').trim();
  }
}
