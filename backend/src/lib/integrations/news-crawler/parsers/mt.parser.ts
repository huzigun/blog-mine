import * as cheerio from 'cheerio';
import { NewsArticle } from '../news-crawler.interface';
import { BaseNewsParser } from './base.parser';

/**
 * 머니투데이 (www.mt.co.kr) 파서
 *
 * HTML 구조:
 * - 제목: h1.headline
 * - 카테고리: .breadcrumb a[data-testid="category"]
 * - 기자명: .name.col1 strong
 * - 입력일: .col2 .date (2025.12.16 05:32 형식)
 * - 본문: #articleView p (excluding .ept class)
 * - 이미지: #articleView figure picture img
 * - 이미지 캡션: #articleView figure figcaption
 */
export class MtParser extends BaseNewsParser {
  readonly supportedDomains = ['www.mt.co.kr', 'mt.co.kr', 'news.mt.co.kr'];
  readonly sourceName = '머니투데이';

  parse(html: string, url: string): NewsArticle {
    const $ = this.loadHtml(html);

    // 제목 추출
    const title = this.cleanText($('h1.headline').text());
    if (!title) {
      throw new Error('기사 제목을 찾을 수 없습니다.');
    }

    // 카테고리 추출
    const category = this.cleanText(
      $('.breadcrumb a[data-testid="category"]').text(),
    );

    // 기자명 추출
    let author: string | undefined;
    const authorElement = $('.name.col1 strong').first();
    if (authorElement.length > 0) {
      author = this.cleanText(authorElement.text());
    }

    // 입력일 추출 (2025.12.16 05:32 형식)
    let publishedAt: string | undefined;
    const dateElement = $('.col2 .date');
    if (dateElement.length > 0) {
      const dateText = this.cleanText(dateElement.text());
      // "2025.12.16 05:32" 형식을 "2025-12-16 05:32"로 변환
      const dateMatch = dateText.match(
        /(\d{4})\.(\d{2})\.(\d{2})\s+(\d{2}):(\d{2})/,
      );
      if (dateMatch) {
        const [, year, month, day, hour, minute] = dateMatch;
        publishedAt = `${year}-${month}-${day} ${hour}:${minute}`;
      }
    }

    // 본문 추출
    const contentParts: string[] = [];

    // #articleView 내의 p 태그 추출 (.ept 클래스 제외)
    $('#articleView p').each((_, element) => {
      const $el = $(element);

      // .ept 클래스(빈 문단) 제외
      if ($el.hasClass('ept')) {
        return;
      }

      const text = this.cleanText($el.text());
      if (text) {
        // 저작권/광고 문구 제거
        if (
          text.includes('ⓒ') ||
          text.includes('저작권자') ||
          text.includes('무단 전재') ||
          text.includes('▶') ||
          text.includes('머니투데이 주, 야') ||
          text.includes('[머니투데이]')
        ) {
          return;
        }

        // 기자 이메일만 있는 줄 제거
        if (text.match(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)) {
          return;
        }

        contentParts.push(text);
      }
    });

    const content = contentParts.join('\n\n');
    if (!content) {
      throw new Error('기사 본문을 찾을 수 없습니다.');
    }

    // 이미지 추출
    const images = this.extractMtImages($, url);

    // 태그 추출 (카테고리 활용)
    const tags: string[] = [];
    if (category) {
      tags.push(category);
    }

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
   * 머니투데이 전용 이미지 추출
   * #articleView figure picture img
   */
  private extractMtImages($: cheerio.Root, baseUrl: string): string[] {
    const images: string[] = [];
    const baseUrlObj = new URL(baseUrl);

    // 기사 본문 내 이미지 추출
    $('#articleView figure picture img').each((_, element) => {
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

          // 중복 제거, 썸네일/아이콘/광고/플레이스홀더 제외
          if (
            !images.includes(absoluteUrl) &&
            !src.includes('icon') &&
            !src.includes('logo') &&
            !src.includes('blank') &&
            !src.includes('ad') &&
            (src.includes('mt.co.kr') || src.includes('moneytoday'))
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
