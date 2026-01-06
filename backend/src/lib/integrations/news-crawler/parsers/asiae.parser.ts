import { NewsArticle } from '../news-crawler.interface';
import { BaseNewsParser } from './base.parser';

/**
 * 아시아경제 (www.asiae.co.kr) 파서
 *
 * HTML 구조:
 * - 카테고리: .lc .btn_title
 * - 제목: .area_title h1
 * - 부제: .article_head h4
 * - 기자명: .reporter p strong + "기자"
 * - 입력일: .date_box p (입력 2026.01.06 10:54 형식)
 * - 본문: .article p[data-alda-marking]
 * - 이미지: .article_photo img
 * - 이미지 캡션: .article_photo .txt
 * - 저작권: .txt_prohibition
 * - 바이라인: .e_article
 */
export class AsiaeParser extends BaseNewsParser {
  readonly supportedDomains = ['www.asiae.co.kr', 'asiae.co.kr'];
  readonly sourceName = '아시아경제';

  parse(html: string, url: string): NewsArticle {
    const $ = this.loadHtml(html);

    // 제목 추출
    const title = this.cleanText($('.area_title h1').text());
    if (!title) {
      throw new Error('기사 제목을 찾을 수 없습니다.');
    }

    // 카테고리 추출
    const category = this.cleanText($('.lc .btn_title').text());

    // 기자명 추출
    let author: string | undefined;
    const authorElement = $('.reporter p strong');
    if (authorElement.length > 0) {
      const authorName = this.cleanText(authorElement.text());
      if (authorName) {
        author = `${authorName} 기자`;
      }
    }

    // 입력일 추출 (입력 2026.01.06 10:54 형식)
    let publishedAt: string | undefined;
    $('.date_box p').each((_, element) => {
      const text = $(element).text();
      if (text.includes('입력')) {
        // "입력 2026.01.06 10:54" 형식에서 날짜 추출
        const dateMatch = text.match(
          /입력\s*(\d{4})\.(\d{2})\.(\d{2})\s+(\d{2}:\d{2})/,
        );
        if (dateMatch) {
          publishedAt = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]} ${dateMatch[4]}`;
        }
      }
    });

    // 본문 추출
    const contentParts: string[] = [];

    // 부제 추출
    const subtitle = this.cleanText($('.article_head h4').text());
    if (subtitle) {
      contentParts.push(subtitle);
    }

    // 본문 문단 추출
    $('.article p[data-alda-marking]').each((_, element) => {
      const text = this.cleanText($(element).text());
      if (text) {
        // 저작권/광고/바이라인 문구 제거
        if (
          text.includes('ⓒ') ||
          text.includes('저작권자') ||
          text.includes('무단 전재') ||
          text.includes('아시아경제') ||
          text.includes('asiae.co.kr') ||
          text.includes('Copyright')
        ) {
          return;
        }

        // 기자 이메일 라인 제거 (예: 기자명 기자 email@asiae.co.kr)
        if (text.match(/@asiae\.co\.kr/)) {
          return;
        }

        contentParts.push(text);
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
    const images = this.extractAsiaeImages($, url);

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
   * 아시아경제 전용 이미지 추출
   * .article_photo img
   */
  private extractAsiaeImages(
    $: ReturnType<typeof this.loadHtml>,
    baseUrl: string,
  ): string[] {
    const images: string[] = [];
    const baseUrlObj = new URL(baseUrl);

    // 기사 본문 내 이미지 추출
    $('.article_photo img').each((_, element) => {
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
            !src.includes('ad_') &&
            !src.includes('banner')
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
