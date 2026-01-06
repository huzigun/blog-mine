import { NewsArticle } from '../news-crawler.interface';
import { BaseNewsParser } from './base.parser';

/**
 * 조선일보 (www.chosun.com) 파서
 *
 * HTML 구조:
 * - 카테고리: .breadcrumb a (국제 > 국제 일반)
 * - 제목: h1.article-header__headline span
 * - 부제: .article-header__headline-container p span (여러 줄 가능, br로 구분)
 * - 기자명: .article-byline__author (이철민 기자)
 * - 입력일: .inputDate (입력 2026.01.06. 08:15 형식)
 * - 수정일: .upDate (업데이트 2026.01.06. 13:50 형식)
 * - 본문: section.article-body p.article-body__content-text
 * - 이미지: .article-body figure img (srcset 사용)
 * - 이미지 캡션: .article-body figcaption
 * - 해시태그: .article-tags a span (#트럼프, 니콜라스 마두로 등)
 * - 저작권: ⓒ조선일보
 */
export class ChosunParser extends BaseNewsParser {
  readonly supportedDomains = ['www.chosun.com', 'chosun.com'];
  readonly sourceName = '조선일보';

  parse(html: string, url: string): NewsArticle {
    const $ = this.loadHtml(html);

    // 제목 추출
    const title = this.cleanText($('h1.article-header__headline span').text());
    if (!title) {
      throw new Error('기사 제목을 찾을 수 없습니다.');
    }

    // 카테고리 추출
    const categories: string[] = [];
    $('.breadcrumb a').each((_, element) => {
      const cat = this.cleanText($(element).text());
      if (cat) {
        categories.push(cat);
      }
    });

    // 기자명 추출
    let author: string | undefined;
    const authorElement = $('.article-byline__author');
    if (authorElement.length > 0) {
      author = this.cleanText(authorElement.text());
    }

    // 입력일 추출 (입력 2026.01.06. 08:15 형식)
    let publishedAt: string | undefined;
    const inputDateElement = $('.inputDate');
    if (inputDateElement.length > 0) {
      const dateText = inputDateElement.text();
      // "입력 2026.01.06. 08:15" 형식에서 날짜 추출
      const dateMatch = dateText.match(
        /입력\s*(\d{4})\.(\d{2})\.(\d{2})\.\s*(\d{2}:\d{2})/,
      );
      if (dateMatch) {
        publishedAt = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]} ${dateMatch[4]}`;
      }
    }

    // 본문 추출
    const contentParts: string[] = [];

    // 부제 추출 (.article-header__headline-container p span)
    const subtitleContainer = $('.article-header__headline-container p');
    if (subtitleContainer.length > 0) {
      const subHtml = subtitleContainer.html() || '';
      // br 태그를 기준으로 분리
      const subtitles = subHtml.split(/<br\s*\/?>/gi);
      for (const sub of subtitles) {
        // span 태그 내용 추출
        const text = this.cleanText(sub.replace(/<[^>]*>/g, ''));
        if (text) {
          contentParts.push(text);
        }
      }
    }

    // 본문 문단 추출
    $('section.article-body p.article-body__content-text').each(
      (_, element) => {
        const text = this.cleanText($(element).text());
        if (text) {
          // 저작권/광고 문구 제거
          if (
            text.includes('ⓒ조선일보') ||
            text.includes('ⓒ') ||
            text.includes('저작권자') ||
            text.includes('무단 전재') ||
            text.includes('chosun.com') ||
            text.includes('Copyright')
          ) {
            return;
          }

          // 기자 이메일 라인 제거
          if (text.match(/@chosun\.com/)) {
            return;
          }

          contentParts.push(text);
        }
      },
    );

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
    const images = this.extractChosunImages($, url);

    // 태그 추출 (해시태그 + 카테고리)
    const tags: string[] = [];
    $('.article-tags a span').each((_, element) => {
      const tag = this.cleanText($(element).text());
      if (tag) {
        // # 제거
        tags.push(tag.replace(/^#/, ''));
      }
    });
    // 카테고리도 태그에 추가
    categories.forEach((cat) => {
      if (!tags.includes(cat)) {
        tags.push(cat);
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
   * 조선일보 전용 이미지 추출
   * .article-body figure img (srcset 사용)
   */
  private extractChosunImages(
    $: ReturnType<typeof this.loadHtml>,
    baseUrl: string,
  ): string[] {
    const images: string[] = [];
    const baseUrlObj = new URL(baseUrl);

    // 기사 본문 내 이미지 추출
    $('.article-body figure img').each((_, element) => {
      // srcset에서 가장 큰 이미지 추출 시도
      const srcset = $(element).attr('srcset');
      const src = $(element).attr('src');

      let imageUrl: string | undefined;

      if (srcset) {
        // srcset 파싱: "url1 640w, url2 960w, url3 1280w" 형식
        const srcsetParts = srcset.split(',').map((s) => s.trim());
        let maxWidth = 0;
        for (const part of srcsetParts) {
          const match = part.match(/^(.+?)\s+(\d+)w$/);
          if (match) {
            const width = parseInt(match[2], 10);
            if (width > maxWidth) {
              maxWidth = width;
              imageUrl = match[1];
            }
          }
        }
      }

      // srcset에서 못 찾으면 src 사용
      if (!imageUrl && src) {
        imageUrl = src;
      }

      if (imageUrl) {
        try {
          // 절대 URL 변환
          let absoluteUrl = imageUrl;
          if (imageUrl.startsWith('//')) {
            absoluteUrl = 'https:' + imageUrl;
          } else if (!imageUrl.startsWith('http')) {
            absoluteUrl = new URL(imageUrl, baseUrlObj.origin).href;
          }

          // 중복 제거, 썸네일/아이콘/광고/플레이스홀더 제외
          if (
            !images.includes(absoluteUrl) &&
            !imageUrl.includes('icon') &&
            !imageUrl.includes('logo') &&
            !imageUrl.includes('blank') &&
            !imageUrl.includes('ad_') &&
            !imageUrl.includes('banner') &&
            !imageUrl.includes('placeholder')
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
