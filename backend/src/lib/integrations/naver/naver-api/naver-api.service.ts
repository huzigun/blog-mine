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
  private readonly userAgent =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/142.0.0.0';

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * 네이버 블로그 검색
   * @param keyword - 검색 키워드
   * @param display - 검색 결과 수 (기본 40, 최대 100)
   * @returns 검색 결과 및 총 결과 수
   */
  async searchBlogsByKeyword(
    keyword: string,
    display: number = 40,
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
  async getBlogContent(url: string): Promise<{
    success: boolean;
    nickname: string;
    title: string;
    content: string;
    blogDate: string;
    description: string;
    url: string;
  }> {
    try {
      // const mainFrameUrl = this.extractNaverBlogFrameUrl(url);
      // this.logger.debug(`main: ${mainFrameUrl}, url: ${url}`);

      const finalHtml = await firstValueFrom(
        this.httpService
          .get<string>(url, {
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

      const title = $$('.se-title-text')?.text().trim() || 'No Title';
      // const nickname = $$('.nick')?.text().trim() || 'Unknown';
      const finalNickname =
        $$('meta[property="naverblog:nickname"]').attr('content') || 'Unknown';
      const description =
        $$('meta[property="og:description"]').attr('content') || 'Unknown';

      const blogDate = $$('.blog_authorArea p')?.text().trim() || 'No Date';

      return {
        success: true,
        nickname: finalNickname,
        title,
        content,
        description,
        blogDate,
        url,
      };
    } catch (error) {
      this.logger.warn(`Failed to fetch content from ${url}: ${error.message}`);
      // 콘텐츠 수집 실패 시 빈 문자열 반환 (순위 수집은 계속 진행)
      return {
        success: false,
        nickname: 'Unknown',
        title: 'No Title',
        content: '',
        description: '',
        blogDate: 'No Date',
        url,
      };
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

  // NestJS 환경에서 사용하시는 것을 고려하여 작성합니다. (httpService 사용)
  async blogsCrawler(keyword: string) {
    const q = encodeURIComponent(keyword);
    const url = `https://m.search.naver.com/search.naver?sm=tab_hty.top&ssc=tab.m_blog.all&query=${q}`;

    try {
      const { data } = await this.httpService.axiosRef.get<string>(url, {
        headers: {
          // 크롤링 시 User-Agent는 모바일 환경으로 유지합니다.
          'User-Agent': this.userAgent,
        },
      });
      const $ = cheerio.load(data);

      // 이전과 동일하게, 개별 블로그 아이템을 감싸는 컨테이너를 선택합니다.
      const blogItems = $(
        '.sds-comps-vertical-layout>a[href^="https://m.blog.naver.com/"]',
      );

      this.logger.debug(`블로그 아이탬스 ${blogItems.length}`);

      const results: {
        author: string | null;
        title: string | null;
        link: string | null;
        description: string;
        content: string;
        date: string;
        rank: number;
      }[] = [];

      let rank = 1;
      // 각 블로그 아이템을 순회하며 정보 추출
      // blogItems.each((index, element) => {});

      for (let i = 0; i < blogItems.length; i++) {
        const $item = $(blogItems[i]);

        // ⭐ 1. 광고 태그 확인 및 필터링
        // data-heatmap-target="articleSourceJSX_adtag" 속성을 가진 요소를 찾습니다.
        const isAd =
          $item.find('[data-heatmap-target="articleSourceJSX_adtag"]').length >
          0;

        if (isAd) {
          // 광고 아이템인 경우, 현재 루프를 건너뛰고 다음 아이템으로 이동
          continue;
        }

        const link = $item.attr('href');

        if (!link) {
          continue;
        }

        const exist = results.find((el) => el.link === link);

        if (exist) {
          continue;
        }

        // 2. 작성자 (Author) 추출 (이전과 동일)
        // const authorElement = $item.find(
        //   '.sds-comps-profile-info-title-text a',
        // );
        // const author = authorElement.find('span').text().trim() || null;

        // 3. 제목 (Title) 및 링크 (Link) 추출
        // 제목을 감싸고 있는 <a> 태그를 정확히 선택합니다.
        // .YCo7LmMCOpaHxE7wX0Fr 은 게시글 내용 전체를 담는 컨테이너입니다.
        // const titleLinkElement = $item
        //   .find('.YCo7LmMCOpaHxE7wX0Fr a.bptVF1SgHzUVp98UnCKw')
        //   .first();

        // 4. 요약 (Description) 추출
        // const descriptionElement = $item
        //   .find('.RBG98J1qM1Bx_drC9bWN .fds-ugc-ellipsis2')
        //   .first();

        // const title = titleLinkElement.find('span').text().trim() || null;
        // const link = titleLinkElement.attr('href') || '';

        // const description = descriptionElement.text()?.trim() || '';
        const detail = await this.getBlogContent(link);

        // 추출된 정보를 결과 배열에 추가
        if (detail.nickname || detail.title) {
          results.push({
            author: detail.nickname,
            title: detail.title,
            link,
            description: detail.description,
            rank: rank,
            content: detail.content,
            date: detail.blogDate,
          });
          rank++;
        }
      }
      return results.filter((el) => !!el.author && !!el.title && !!el.link);
    } catch (error) {
      console.error('크롤링 중 오류 발생:', error);
      return [];
    }
  }
}
