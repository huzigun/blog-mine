import * as cheerio from 'cheerio';
import { NewsArticle } from '../news-crawler.interface';
import { BaseNewsParser } from './base.parser';

/**
 * 뉴스타파 (newstapa.org) 파서
 *
 * HTML 구조:
 * - 제목: h3.entry-title
 * - 카테고리: .category-container h6
 * - 기자명(복수): .journalist-item h6.font-weight-bold a
 * - 입력일: .journalist-item .flex-grow-1 p (2025년 12월 26일 15시 12분)
 * - 본문: .ce-block .ce-paragraph.cdx-block (문단), .ce-block h3.ce-header (제목)
 * - 이미지: .image-tool__image-picture
 * - 이미지 캡션: .image-tool__caption
 * - 태그: .tags-container .tags-list a
 * - 유튜브: input[name="youtubeId"]
 */
export class NewstapaParser extends BaseNewsParser {
  readonly supportedDomains = ['newstapa.org', 'www.newstapa.org'];
  readonly sourceName = '뉴스타파';

  parse(html: string, url: string): NewsArticle {
    const $ = this.loadHtml(html);

    // 제목 추출
    const title = this.cleanText($('h3.entry-title').text());
    if (!title) {
      throw new Error('기사 제목을 찾을 수 없습니다.');
    }

    // 카테고리 추출
    const category = this.cleanText($('.category-container h6').text());

    // 기자명 추출 (복수 기자 지원)
    const authors: string[] = [];
    $('.journalist-item h6.font-weight-bold a').each((_, element) => {
      const authorName = this.cleanText($(element).text());
      if (authorName && !authors.includes(authorName)) {
        authors.push(authorName);
      }
    });
    const author = authors.length > 0 ? authors.join(', ') : undefined;

    // 입력일 추출 (2025년 12월 26일 15시 12분 형식)
    let publishedAt: string | undefined;
    const dateElement = $('.journalist-item .flex-grow-1 p').first();
    if (dateElement.length > 0) {
      const dateText = this.cleanText(dateElement.text());
      // 한글 날짜 형식을 표준 형식으로 변환
      const dateMatch = dateText.match(
        /(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일\s*(\d{1,2})시\s*(\d{1,2})분/,
      );
      if (dateMatch) {
        const [, year, month, day, hour, minute] = dateMatch;
        publishedAt = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')} ${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
      } else {
        publishedAt = dateText;
      }
    }

    // 본문 추출 (EditorJS 블록 기반 구조)
    const contentParts: string[] = [];

    // ce-block 내의 모든 콘텐츠 추출
    $('.ce-block').each((_, block) => {
      const $block = $(block);

      // 제목 블록 (h3.ce-header)
      const header = $block.find('h3.ce-header');
      if (header.length > 0) {
        const headerText = this.cleanText(header.text());
        if (headerText) {
          contentParts.push(`## ${headerText}`);
        }
        return;
      }

      // 문단 블록 (.ce-paragraph)
      const paragraph = $block.find('.ce-paragraph.cdx-block');
      if (paragraph.length > 0) {
        // HTML 태그 제거하고 텍스트 추출
        let text = paragraph.html() || '';
        // <br> 태그를 줄바꿈으로 변환
        text = text.replace(/<br\s*\/?>/gi, '\n');
        // 링크 텍스트 유지
        text = text.replace(/<a[^>]*>([^<]*)<\/a>/gi, '$1');
        // 기타 HTML 태그 제거
        text = text.replace(/<[^>]+>/g, '');
        text = this.cleanText(text);

        if (text) {
          // 저작권/광고 문구 제거
          if (
            text.includes('저작권자') ||
            text.includes('무단 전재') ||
            text.includes('ⓒ') ||
            text.includes('▶')
          ) {
            return;
          }
          contentParts.push(text);
        }
      }
    });

    const content = contentParts.join('\n\n');
    if (!content) {
      throw new Error('기사 본문을 찾을 수 없습니다.');
    }

    // 이미지 추출
    const images = this.extractNewstapaImages($, url);

    // 태그 추출
    const tags: string[] = [];
    if (category) {
      tags.push(category);
    }
    $('.tags-container .tags-list a').each((_, element) => {
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
   * 뉴스타파 전용 이미지 추출
   * .image-tool__image-picture
   */
  private extractNewstapaImages($: cheerio.Root, baseUrl: string): string[] {
    const images: string[] = [];
    const baseUrlObj = new URL(baseUrl);

    // 기사 본문 내 이미지 추출
    $('.image-tool__image-picture').each((_, element) => {
      const src = $(element).attr('src');

      if (src) {
        try {
          // 절대 URL 변환
          let absoluteUrl = src;
          if (src.startsWith('//')) {
            absoluteUrl = 'https:' + src;
          } else if (!src.startsWith('http')) {
            absoluteUrl = new URL(src, baseUrlObj.origin).href;
          }

          // 중복 제거, 썸네일/아이콘/광고 제외
          if (
            !images.includes(absoluteUrl) &&
            !src.includes('thumb') &&
            !src.includes('icon') &&
            !src.includes('logo') &&
            !src.includes('blank') &&
            !src.includes('ad')
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
}
