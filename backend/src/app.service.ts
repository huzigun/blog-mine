import { Injectable } from '@nestjs/common';
import { ConfigService } from './config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
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

@Injectable()
export class AppService {
  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
  ) {}

  getHello(): string {
    const appName = this.configService.appName;
    const appVersion = this.configService.appVersion;
    const env = this.configService.appEnv;
    const port = this.configService.port;

    return `${appName} v${appVersion} - Running on port ${port} (${env} mode)`;
  }

  async getSearchNaver() {
    const clientId = this.configService.naverClientId;
    const clientSecret = this.configService.naverClientSecret;
    const endpoint = 'https://openapi.naver.com/v1/search/blog.json';
    const display = 20;
    const searchKey = '매곡동 맛집';

    const url = new URL(endpoint);
    url.searchParams.append('display', display.toString());
    url.searchParams.append('query', searchKey);

    const response = await firstValueFrom(
      this.httpService
        .get<NaverBlogSearchResponse>(url.toString(), {
          headers: {
            'X-Naver-Client-Id': clientId || '',
            'X-Naver-Client-Secret': clientSecret || '',
          },
        })
        .pipe(map((res) => res.data)),
    );

    const allItems = await Promise.all(
      response.items.map(async (item) => {
        const res = await this.getBlogContent(item.link);
        return { ...item, content: res.content, contentUrl: res.url };
      }),
    );

    return allItems;
  }

  /**
   * 블로그 URL에서 HTML 콘텐츠를 가져와 파싱합니다.
   * @param url - 블로그 게시글 URL
   * @returns 파싱된 블로그 콘텐츠 (텍스트)
   */
  async getBlogContent(url: string): Promise<{
    content: string;
    url: string;
  }> {
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
          .pipe(
            map((res) => res.data),
            catchError((err) => {
              throw err;
            }),
          ),
      );

      const $$ = cheerio.load(finalHtml);

      // 주요 콘텐츠 선택자 (블로그 플랫폼별로 다를 수 있음)
      const contentSelectors = [
        '.se-main-container', // 네이버 블로그
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

      return { content, url: mainFrameUrl || url };
    } catch (error) {
      throw new Error(
        `Failed to fetch blog content: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * 네이버 블로그 URL에서 실제 콘텐츠가 있는 iframe URL을 추출합니다.
   * @param url - 네이버 블로그 URL
   * @returns iframe URL 또는 null
   *
   * @example
   * // 일반 블로그 URL
   * extractNaverBlogFrameUrl('https://blog.naver.com/username/221234567890')
   * // returns 'https://blog.naver.com/PostView.naver?blogId=username&logNo=221234567890'
   *
   * // 이미 iframe URL인 경우
   * extractNaverBlogFrameUrl('https://blog.naver.com/PostView.naver?blogId=username&logNo
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

      // 경로가 /blogId/logNo 형태인지 확인
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
}
