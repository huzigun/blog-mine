import * as cheerio from 'cheerio';
import { NewsArticle } from '../news-crawler.interface';
import { BaseNewsParser } from './base.parser';

/**
 * 경향신문 (khan.co.kr) 파서
 *
 * HTML 구조:
 * - 제목: article header h1
 * - 본문: #articleBody p.content_text
 * - 기자명: header .bottom .editor a
 * - 입력일: .date .inner p (첫 번째)
 * - 이미지: .art_photo img
 * - 카테고리: header .category a
 */
export class KhanParser extends BaseNewsParser {
  readonly supportedDomains = ['www.khan.co.kr', 'khan.co.kr'];
  readonly sourceName = '경향신문';

  parse(html: string, url: string): NewsArticle {
    const $ = this.loadHtml(html);

    // 제목 추출
    const title = this.cleanText($('article header h1').text());
    if (!title) {
      throw new Error('기사 제목을 찾을 수 없습니다.');
    }

    // 본문 추출 (불필요한 요소 제거)
    this.cleanArticleBody($, '#articleBody');

    // 본문에서 p.content_text 내용만 추출
    const contentParts: string[] = [];
    $('#articleBody p.content_text').each((_, element) => {
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
    const author =
      this.cleanText($('header .bottom .editor a').text()) || undefined;

    // 입력일 추출 (첫 번째 p 태그)
    let publishedAt: string | undefined;
    const dateText = $('.date .inner p').first().text();
    if (dateText) {
      publishedAt = this.normalizeDate(dateText);
    }

    // 이미지 추출
    const images = this.extractKhanImages($, url);

    // 카테고리 추출 (태그로 활용)
    const tags: string[] = [];
    $('header .category a').each((_, element) => {
      const category = this.cleanText($(element).text());
      if (category) {
        tags.push(category);
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
   * 경향신문 전용 이미지 추출
   * .art_photo img
   */
  private extractKhanImages($: cheerio.Root, baseUrl: string): string[] {
    const images: string[] = [];
    const baseUrlObj = new URL(baseUrl);

    // 기사 본문 내 이미지 추출
    $('#articleBody .art_photo img').each((_, element) => {
      const src = $(element).attr('src') || $(element).attr('data-src');
      if (src) {
        try {
          const absoluteUrl = new URL(src, baseUrlObj.origin).href;
          // 중복 제거 및 유효한 이미지만 추가
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
