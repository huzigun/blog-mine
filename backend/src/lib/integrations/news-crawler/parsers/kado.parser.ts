import * as cheerio from 'cheerio';
import { NewsArticle } from '../news-crawler.interface';
import { BaseNewsParser } from './base.parser';

/**
 * 강원도민일보 (kado.net) 파서
 *
 * HTML 구조:
 * - 제목: h1.heading
 * - 부제목: h2.subheading
 * - 본문: #article-view-content-div p
 * - 기자명: .info-name
 * - 입력일: .info-group .breadcrumbs li (두 번째)
 * - 이미지: .photo-layout img
 * - 태그: .tag-group .tag
 */
export class KadoParser extends BaseNewsParser {
  readonly supportedDomains = ['www.kado.net', 'kado.net'];
  readonly sourceName = '강원도민일보';

  parse(html: string, url: string): NewsArticle {
    const $ = this.loadHtml(html);

    // 제목 추출
    const title = this.cleanText($('h1.heading').text());
    if (!title) {
      throw new Error('기사 제목을 찾을 수 없습니다.');
    }

    // 부제목 추출
    const subtitle = this.cleanText($('h2.subheading').text()) || undefined;

    // 본문 추출 (불필요한 요소 제거)
    this.cleanArticleBody($, '#article-view-content-div');

    // 본문에서 p 태그 내용만 추출 (script, figure 등 제외)
    const contentParts: string[] = [];
    $('#article-view-content-div p').each((_, element) => {
      const text = this.cleanText($(element).text());
      if (text && text.length > 0) {
        contentParts.push(text);
      }
    });

    const content = contentParts.join('\n\n');
    if (!content) {
      throw new Error('기사 본문을 찾을 수 없습니다.');
    }

    // 기자명 추출
    const author = this.cleanText($('.info-name').text()) || undefined;

    // 입력일 추출
    let publishedAt: string | undefined;
    $('.info-group .breadcrumbs li').each((_, element) => {
      const text = $(element).text();
      if (text.includes('입력')) {
        publishedAt = this.normalizeDate(text);
      }
    });

    // 이미지 추출
    const images = this.extractKadoImages($, url);

    // 태그 추출
    const tags: string[] = [];
    $('.tag-group .tag').each((_, element) => {
      const tag = this.cleanText($(element).text()).replace(/^#/, '');
      if (tag) {
        tags.push(tag);
      }
    });

    return {
      title,
      subtitle,
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
   * 강원도민일보 전용 이미지 추출
   * .photo-layout img 또는 figure img
   */
  private extractKadoImages($: cheerio.Root, baseUrl: string): string[] {
    const images: string[] = [];
    const baseUrlObj = new URL(baseUrl);

    // 기사 본문 내 이미지 추출
    $(
      '#article-view-content-div .photo-layout img, #article-view-content-div figure img',
    ).each((_, element) => {
      const src = $(element).attr('src');
      if (src) {
        try {
          const absoluteUrl = new URL(src, baseUrlObj.origin).href;
          // 썸네일이 아닌 원본 이미지만 추출
          if (!images.includes(absoluteUrl) && !src.includes('thumbnail')) {
            images.push(absoluteUrl);
          }
        } catch {
          // URL 파싱 실패 시 무시
        }
      }
    });

    return images;
  }
}
