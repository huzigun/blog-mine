import * as cheerio from 'cheerio';
import { NewsArticle } from '../news-crawler.interface';
import { BaseNewsParser } from './base.parser';

/**
 * 세계일보 (www.segye.com) 파서
 *
 * HTML 구조:
 * - 제목: h3#title_sns
 * - 입력일: .viewInfo (입력 : 2026-01-06 14:44:16 형식)
 * - 부제: em.precis
 * - 본문: article.viewBox2 p (br 태그로 문단 구분)
 * - 이미지: figure.class_div_main img
 * - 기자명: #SG_CreatorName (hidden span)
 * - 저작권: p.copyright
 */
export class SegyeParser extends BaseNewsParser {
  readonly supportedDomains = ['www.segye.com', 'segye.com'];
  readonly sourceName = '세계일보';

  parse(html: string, url: string): NewsArticle {
    const $ = this.loadHtml(html);

    // 제목 추출
    const title = this.cleanText($('h3#title_sns').text());
    if (!title) {
      throw new Error('기사 제목을 찾을 수 없습니다.');
    }

    // 기자명 추출 (hidden span에서)
    let author: string | undefined;
    const authorName = this.cleanText($('#SG_CreatorName').text());
    if (authorName) {
      author = `${authorName} 기자`;
    }

    // 입력일 추출 (입력 : 2026-01-06 14:44:16 형식)
    let publishedAt: string | undefined;
    const dateElement = $('.viewInfo');
    if (dateElement.length > 0) {
      const dateText = this.cleanText(dateElement.text());
      // "입력 : 2026-01-06 14:44:16" 형식에서 날짜 추출
      const dateMatch = dateText.match(/입력\s*:\s*(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2})/);
      if (dateMatch) {
        publishedAt = dateMatch[1];
      }
    }

    // 본문 추출
    const contentParts: string[] = [];

    // 부제 추출
    const precis = $('article.viewBox2 em.precis');
    if (precis.length > 0) {
      let precisHtml = precis.html() || '';
      // <br> 태그를 줄바꿈으로 변환
      precisHtml = precisHtml.replace(/<br\s*\/?>/gi, '\n');
      // HTML 태그 제거
      precisHtml = precisHtml.replace(/<[^>]+>/g, '');
      const precisText = this.cleanText(precisHtml);
      if (precisText) {
        contentParts.push(precisText);
      }
    }

    // 본문 문단 추출
    $('article.viewBox2 p').each((_, element) => {
      const $el = $(element);

      // 저작권 문구 제외
      if ($el.hasClass('copyright')) {
        return;
      }

      // HTML 내용 가져오기
      let paragraphHtml = $el.html() || '';

      // <br> 태그를 줄바꿈으로 변환
      paragraphHtml = paragraphHtml.replace(/<br\s*\/?>/gi, '\n');
      // HTML 태그 제거
      paragraphHtml = paragraphHtml.replace(/<[^>]+>/g, '');

      // 문단 분리 및 정리
      const lines = paragraphHtml.split('\n');
      for (const line of lines) {
        const text = this.cleanText(line);
        if (text) {
          // 저작권/광고 문구 제거
          if (
            text.includes('ⓒ') ||
            text.includes('저작권자') ||
            text.includes('무단 전재') ||
            text.includes('Copyright') ||
            text.includes('세계일보')
          ) {
            continue;
          }

          // 통신사 표시 제거 (예: <연합>)
          if (text.match(/^<[가-힣]+>$/) || text.match(/^\([가-힣]+\)$/)) {
            continue;
          }

          // &lt;연합&gt; 같은 HTML 엔티티 변환된 텍스트 제거
          if (text.includes('&lt;') || text.includes('&gt;')) {
            continue;
          }

          contentParts.push(text);
        }
      }
    });

    // 마지막 줄이 기자 이름만 있으면 제거
    if (contentParts.length > 0) {
      const lastLine = contentParts[contentParts.length - 1];
      if (lastLine.match(/^[가-힣]+\s*(기자|특파원)$/)) {
        contentParts.pop();
      }
    }

    const content = contentParts.join('\n\n');
    if (!content) {
      throw new Error('기사 본문을 찾을 수 없습니다.');
    }

    // 이미지 추출
    const images = this.extractSegyeImages($, url);

    return {
      title,
      content,
      author,
      publishedAt,
      images: images.length > 0 ? images : undefined,
      sourceUrl: url,
      sourceName: this.sourceName,
    };
  }

  /**
   * 세계일보 전용 이미지 추출
   * figure.class_div_main img
   */
  private extractSegyeImages($: cheerio.Root, baseUrl: string): string[] {
    const images: string[] = [];
    const baseUrlObj = new URL(baseUrl);

    // 기사 본문 내 이미지 추출
    $('figure.class_div_main img').each((_, element) => {
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
            (src.includes('segye.com') || src.includes('img.segye.com'))
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
