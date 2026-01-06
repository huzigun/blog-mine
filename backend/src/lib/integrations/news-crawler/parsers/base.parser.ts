import * as cheerio from 'cheerio';
import { NewsArticle, NewsParser } from '../news-crawler.interface';

/**
 * 뉴스 파서 기본 클래스
 * 공통 유틸리티 메서드 제공
 */
export abstract class BaseNewsParser implements NewsParser {
  abstract readonly supportedDomains: string[];
  abstract readonly sourceName: string;

  /**
   * URL이 지원되는 도메인인지 확인
   */
  canParse(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return this.supportedDomains.some(
        (domain) =>
          urlObj.hostname === domain || urlObj.hostname.endsWith(`.${domain}`),
      );
    } catch {
      return false;
    }
  }

  /**
   * HTML 파싱 (각 파서에서 구현)
   */
  abstract parse(html: string, url: string): NewsArticle;

  /**
   * cheerio 인스턴스 생성
   */
  protected loadHtml(html: string): cheerio.Root {
    return cheerio.load(html);
  }

  /**
   * 텍스트 정리 (공백 정규화, 트림)
   */
  protected cleanText(text: string): string {
    return text
      .replace(/\s+/g, ' ') // 연속 공백을 단일 공백으로
      .replace(/\n+/g, '\n') // 연속 줄바꿈 정리
      .trim();
  }

  /**
   * HTML 태그 제거 후 텍스트만 추출
   */
  protected extractText($: cheerio.Root, selector: string): string {
    const $element = $(selector);
    // script, style 태그 제거
    $element.find('script, style, noscript').remove();
    return this.cleanText($element.text());
  }

  /**
   * 본문에서 불필요한 요소 제거
   */
  protected cleanArticleBody($: cheerio.Root, bodySelector: string): void {
    const $body = $(bodySelector);
    // 공통적으로 제거할 요소들
    const removeSelectors = [
      'script',
      'style',
      'noscript',
      'iframe',
      '.ad',
      '.ads',
      '.advertisement',
      '.banner',
      '[class*="ad-"]',
      '[id*="ad-"]',
      '.social-share',
      '.sns-share',
      '.comment',
      '.comments',
      '.related',
      '.relation',
    ];

    removeSelectors.forEach((selector) => {
      $body.find(selector).remove();
    });
  }

  /**
   * 이미지 URL 추출 (상대 경로 → 절대 경로 변환)
   */
  protected extractImageUrls(
    $: cheerio.Root,
    containerSelector: string,
    baseUrl: string,
  ): string[] {
    const images: string[] = [];
    const baseUrlObj = new URL(baseUrl);

    $(containerSelector)
      .find('img')
      .each((_, element) => {
        const src =
          $(element).attr('src') ||
          $(element).attr('data-src') ||
          $(element).attr('data-lazy-src');

        if (src) {
          try {
            // 상대 경로를 절대 경로로 변환
            const absoluteUrl = new URL(src, baseUrlObj.origin).href;
            // 중복 제거 및 유효한 이미지만 추가
            if (
              !images.includes(absoluteUrl) &&
              this.isValidImageUrl(absoluteUrl)
            ) {
              images.push(absoluteUrl);
            }
          } catch {
            // URL 파싱 실패 시 무시
          }
        }
      });

    return images;
  }

  /**
   * 유효한 이미지 URL인지 확인
   */
  protected isValidImageUrl(url: string): boolean {
    // 트래커, 픽셀, 아이콘 등 제외
    const invalidPatterns = [
      /1x1/,
      /pixel/i,
      /tracking/i,
      /beacon/i,
      /spacer/i,
      /\.gif$/i, // 대부분 트래킹 픽셀
      /icon/i,
      /logo.*\.(png|jpg|svg)$/i,
    ];

    return !invalidPatterns.some((pattern) => pattern.test(url));
  }

  /**
   * 날짜 문자열 정규화
   */
  protected normalizeDate(dateStr: string): string {
    // "입력 2026.01.06" → "2026.01.06"
    return dateStr.replace(/^(입력|수정|작성|게시)\s*/i, '').trim();
  }
}
