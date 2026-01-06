import { NewsArticle } from '../news-crawler.interface';
import { BaseNewsParser } from './base.parser';

/**
 * 한국일보 (www.hankookilbo.com) 파서
 *
 * HTML 구조:
 * - 카테고리: .depth1-grp-tit (정치, 경제 등)
 * - 제목: h2.news-view-ttl (기사 제목)
 * - 부제: p.news-view-lead (리드 문구)
 * - 기자명: .writer-info .name (김기자)
 * - 입력일: .writer-info .date (2026-01-06 15:30)
 * - 본문: .end-body p, .end-body (텍스트 노드)
 * - 이미지: .end-body figure img, .img-box img
 * - 저작권: ⓒ한국일보
 */
export class HankookilboParser extends BaseNewsParser {
  readonly supportedDomains = ['www.hankookilbo.com', 'hankookilbo.com'];
  readonly sourceName = '한국일보';

  parse(html: string, url: string): NewsArticle {
    const $ = this.loadHtml(html);

    // 제목 추출 (여러 선택자 시도)
    let title = this.cleanText($('h2.news-view-ttl').text());
    if (!title) {
      title = this.cleanText($('.news-view-head h2').text());
    }
    if (!title) {
      title = this.cleanText($('meta[property="og:title"]').attr('content') || '');
    }
    if (!title) {
      throw new Error('기사 제목을 찾을 수 없습니다.');
    }

    // 카테고리 추출
    const categories: string[] = [];
    $('.depth1-grp-tit').each((_, element) => {
      const cat = this.cleanText($(element).text());
      if (cat) {
        categories.push(cat);
      }
    });
    // breadcrumb에서도 추출
    $('.breadcrumb a, .breadcrumb span').each((_, element) => {
      const cat = this.cleanText($(element).text());
      if (cat && cat !== 'HOME' && cat !== '홈' && !categories.includes(cat)) {
        categories.push(cat);
      }
    });

    // 기자명 추출
    let author: string | undefined;
    const authorElement = $('.writer-info .name');
    if (authorElement.length > 0) {
      author = this.cleanText(authorElement.text());
    }
    if (!author) {
      // 대체 선택자
      const bylineElement = $('.byline, .reporter-name, .news-view-reporter');
      if (bylineElement.length > 0) {
        author = this.cleanText(bylineElement.text());
      }
    }

    // 입력일 추출
    let publishedAt: string | undefined;
    const dateElement = $('.writer-info .date');
    if (dateElement.length > 0) {
      publishedAt = this.cleanText(dateElement.text());
    }
    if (!publishedAt) {
      // 대체 선택자
      const timeElement = $('time[datetime], .news-view-date, .article-date');
      if (timeElement.length > 0) {
        publishedAt = this.cleanText(
          timeElement.attr('datetime') || timeElement.text(),
        );
      }
    }

    // 본문 추출
    const contentParts: string[] = [];

    // 리드 문구 추출
    const lead = this.cleanText($('p.news-view-lead').text());
    if (lead) {
      contentParts.push(lead);
    }

    // 본문 영역 추출 (여러 선택자 시도)
    const contentSelectors = [
      '.end-body',
      '.news-view-body',
      '.article-body',
      '#article-body',
      '.news-content',
    ];

    let contentFound = false;
    for (const selector of contentSelectors) {
      const contentArea = $(selector);
      if (contentArea.length > 0) {
        // p 태그 내용 추출
        contentArea.find('p').each((_, element) => {
          const text = this.cleanText($(element).text());
          if (text && this.isValidContent(text)) {
            contentParts.push(text);
            contentFound = true;
          }
        });

        // p 태그 외 직접 텍스트도 추출
        if (!contentFound) {
          const htmlContent = contentArea.html() || '';
          const cleanedHtml = htmlContent
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/<figure[^>]*>[\s\S]*?<\/figure>/gi, '')
            .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '');

          const paragraphs = cleanedHtml.split(/<br\s*\/?>/gi);
          for (const para of paragraphs) {
            const text = this.cleanText(para.replace(/<[^>]*>/g, ''));
            if (text && this.isValidContent(text)) {
              contentParts.push(text);
              contentFound = true;
            }
          }
        }

        if (contentFound) break;
      }
    }

    const content = contentParts.join('\n\n');
    if (!content) {
      throw new Error('기사 본문을 찾을 수 없습니다.');
    }

    // 이미지 추출
    const images = this.extractHankookilboImages($, url);

    // 태그 (카테고리 포함)
    const tags: string[] = [...categories];

    // 기사 태그 추출
    $('.tag-list a, .article-tag a, .news-tag a').each((_, element) => {
      const tag = this.cleanText($(element).text());
      if (tag && !tags.includes(tag)) {
        tags.push(tag);
      }
    });

    return {
      title,
      content,
      author,
      publishedAt,
      images: images.length > 0 ? images : undefined,
      tags: tags.length > 0 ? tags : undefined,
      sourceUrl: url,
      sourceName: this.sourceName,
    };
  }

  /**
   * 유효한 본문 내용인지 확인
   */
  private isValidContent(text: string): boolean {
    // 저작권/광고 문구 제거
    if (
      text.includes('ⓒ한국일보') ||
      text.includes('ⓒ 한국일보') ||
      text.includes('Copyright') ||
      text.includes('저작권자') ||
      text.includes('무단전재') ||
      text.includes('재배포') ||
      text.includes('구독') ||
      text.includes('뉴스레터') ||
      text.includes('관련기사') ||
      text.includes('기자의 다른기사')
    ) {
      return false;
    }

    // 빈 문자열이나 공백만 있는 경우 제외
    if (text.trim().length === 0) {
      return false;
    }

    return true;
  }

  /**
   * 한국일보 전용 이미지 추출
   */
  private extractHankookilboImages(
    $: ReturnType<typeof this.loadHtml>,
    baseUrl: string,
  ): string[] {
    const images: string[] = [];
    const baseUrlObj = new URL(baseUrl);

    // 기사 본문 내 이미지 추출
    const imageSelectors = [
      '.end-body figure img',
      '.end-body img',
      '.news-view-body img',
      '.article-body img',
      '.img-box img',
      'figure.photo img',
    ];

    for (const selector of imageSelectors) {
      $(selector).each((_, element) => {
        const src =
          $(element).attr('data-src') ||
          $(element).attr('src') ||
          $(element).attr('data-lazy-src');

        if (src) {
          try {
            // 절대 URL 변환
            let absoluteUrl = src;
            if (src.startsWith('//')) {
              absoluteUrl = 'https:' + src;
            } else if (!src.startsWith('http')) {
              absoluteUrl = new URL(src, baseUrlObj.origin).href;
            }

            // 중복 제거, 아이콘/로고/광고/배너 제외
            if (
              !images.includes(absoluteUrl) &&
              !src.includes('icon') &&
              !src.includes('logo') &&
              !src.includes('blank') &&
              !src.includes('ad') &&
              !src.includes('banner') &&
              !src.includes('btn_') &&
              !src.includes('button') &&
              !src.includes('reporter') &&
              !src.includes('profile')
            ) {
              images.push(absoluteUrl);
            }
          } catch {
            // URL 파싱 실패 시 무시
          }
        }
      });

      // 이미지를 찾았으면 중단
      if (images.length > 0) break;
    }

    return images;
  }
}
