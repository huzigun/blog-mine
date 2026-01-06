import * as cheerio from 'cheerio';
import { NewsArticle } from '../news-crawler.interface';
import { BaseNewsParser } from './base.parser';

/**
 * 문화일보 (www.munhwa.com) 파서
 *
 * HTML 구조:
 * - 제목: h1.title
 * - 카테고리: .section-title a.depth1, a.depth2
 * - 기자명: .byline .writer span a
 * - 입력일: .byline .date-publish (입력 2026-01-05 23:24 형식)
 * - 부제/요약: .article-subtitle p
 * - 본문: #article-body p.text-l
 * - 이미지: .article-photo-wrap figure.article-img img
 * - 이미지 캡션: .article-photo-wrap figcaption.caption
 */
export class MunhwaParser extends BaseNewsParser {
  readonly supportedDomains = ['www.munhwa.com', 'munhwa.com'];
  readonly sourceName = '문화일보';

  parse(html: string, url: string): NewsArticle {
    const $ = this.loadHtml(html);

    // 제목 추출
    const title = this.cleanText($('h1.title').text());
    if (!title) {
      throw new Error('기사 제목을 찾을 수 없습니다.');
    }

    // 카테고리 추출
    const categories: string[] = [];
    $('.section-title a.depth1').each((_, element) => {
      const cat = this.cleanText($(element).text());
      if (cat) categories.push(cat);
    });
    $('.section-title a.depth2').each((_, element) => {
      const cat = this.cleanText($(element).text());
      if (cat) categories.push(cat);
    });

    // 기자명 추출
    let author: string | undefined;
    const writerElement = $('.byline .writer');
    if (writerElement.length > 0) {
      // span 내의 a 태그에서 기자 이름 추출
      const authorName = this.cleanText(writerElement.find('span a').text());
      // 직책 추출 (선임기자 등)
      const position = this.cleanText(
        writerElement.contents().not('span, button').text(),
      );
      if (authorName) {
        author = position ? `${authorName} ${position}` : authorName;
      }
    }

    // 입력일 추출 (입력 2026-01-05 23:24 형식)
    let publishedAt: string | undefined;
    const dateElement = $('.byline .date-publish');
    if (dateElement.length > 0) {
      const dateText = this.cleanText(dateElement.text());
      // "입력 2026-01-05 23:24" 형식에서 날짜 추출
      const dateMatch = dateText.match(/(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2})/);
      if (dateMatch) {
        publishedAt = dateMatch[1];
      }
    }

    // 본문 추출
    const contentParts: string[] = [];

    // 부제/요약 추출
    $('.article-subtitle p').each((_, element) => {
      const text = this.cleanText($(element).text());
      if (text) {
        contentParts.push(text);
      }
    });

    // 본문 문단 추출
    $('#article-body p.text-l').each((_, element) => {
      const text = this.cleanText($(element).text());
      if (text) {
        // 저작권/광고 문구 제거
        if (
          text.includes('ⓒ') ||
          text.includes('저작권자') ||
          text.includes('무단 전재') ||
          text.includes('▶') ||
          text.includes('문화일보')
        ) {
          // 기자 이름만 있는 줄은 제외
          if (text.match(/^[가-힣]+\s*(기자|선임기자|특파원)$/)) {
            return;
          }
          // 저작권 문구는 제외
          if (
            text.includes('저작권') ||
            text.includes('무단') ||
            text.includes('▶')
          ) {
            return;
          }
        }

        contentParts.push(text);
      }
    });

    // 마지막 줄이 기자 이름만 있으면 제거
    if (contentParts.length > 0) {
      const lastLine = contentParts[contentParts.length - 1];
      if (lastLine.match(/^[가-힣]+\s*(기자|선임기자|특파원)$/)) {
        contentParts.pop();
      }
    }

    const content = contentParts.join('\n\n');
    if (!content) {
      throw new Error('기사 본문을 찾을 수 없습니다.');
    }

    // 이미지 추출
    const images = this.extractMunhwaImages($, url);

    // 태그 추출 (카테고리 활용)
    const tags: string[] = [...categories];

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
   * 문화일보 전용 이미지 추출
   * .article-photo-wrap figure.article-img img
   */
  private extractMunhwaImages($: cheerio.Root, baseUrl: string): string[] {
    const images: string[] = [];
    const baseUrlObj = new URL(baseUrl);

    // 기사 본문 내 이미지 추출
    $('.article-photo-wrap figure.article-img img').each((_, element) => {
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
            !src.includes('1X1.png') &&
            (src.includes('munhwa.com') || src.includes('wimg.munhwa.com'))
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
