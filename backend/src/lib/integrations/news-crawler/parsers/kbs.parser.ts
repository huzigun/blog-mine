import { NewsArticle } from '../news-crawler.interface';
import { BaseNewsParser } from './base.parser';

/**
 * KBS 뉴스 (news.kbs.co.kr) 파서
 *
 * HTML 구조:
 * - 카테고리: .category-name (국제, 정치 등)
 * - 제목: h4.headline-title
 * - 입력일: em.input-date (입력 2026.01.06 (17:45))
 * - 수정일: em.edit-date (수정 2026.01.06 (17:46))
 * - 본문: .detail-body (p 태그들)
 * - 본문 대안: TTS messageText 변수에서 추출 (br 태그로 구분)
 * - 이미지: .detail-visual img, .detail-body img
 * - 저작권: KBS
 */
export class KbsParser extends BaseNewsParser {
  readonly supportedDomains = ['news.kbs.co.kr', 'kbs.co.kr'];
  readonly sourceName = 'KBS';

  parse(html: string, url: string): NewsArticle {
    const $ = this.loadHtml(html);

    // 제목 추출
    let title = this.cleanText($('h4.headline-title').text());
    if (!title) {
      title = this.cleanText($('.headline-title').text());
    }
    if (!title) {
      // document.title에서 추출 시도
      const titleMatch = html.match(/document\.title\s*=\s*['"]([^'"]+)['"]/);
      if (titleMatch) {
        title = this.cleanText(titleMatch[1].replace(' | KBS 뉴스', ''));
      }
    }
    if (!title) {
      title = this.cleanText(
        $('meta[property="og:title"]').attr('content') || '',
      );
    }
    if (!title) {
      throw new Error('기사 제목을 찾을 수 없습니다.');
    }

    // 카테고리 추출
    const categories: string[] = [];
    $('.category-name').each((_, element) => {
      const cat = this.cleanText($(element).text());
      if (cat && !categories.includes(cat)) {
        categories.push(cat);
      }
    });

    // 입력일 추출 (입력 2026.01.06 (17:45) 형식)
    let publishedAt: string | undefined;
    const inputDateElement = $('em.input-date');
    if (inputDateElement.length > 0) {
      const dateText = this.cleanText(inputDateElement.text());
      // "입력 2026.01.06 (17:45)" → "2026.01.06 17:45"
      const match = dateText.match(
        /입력\s*(\d{4}\.\d{2}\.\d{2})\s*\((\d{2}:\d{2})\)/,
      );
      if (match) {
        publishedAt = `${match[1]} ${match[2]}`;
      }
    }

    // 본문 추출 - TTS messageText에서 추출 (가장 신뢰할 수 있는 소스)
    const contentParts: string[] = [];

    // TTS 스크립트에서 본문 추출 시도
    const ttsMatch = html.match(/var\s+messageText\s*=\s*"([^"]+)"/);
    if (ttsMatch) {
      const ttsContent = ttsMatch[1]
        .replace(/\\'/g, "'")
        .replace(/\\\//g, '/')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]*>/g, '');

      const paragraphs = ttsContent.split('\n');
      for (const para of paragraphs) {
        const text = this.cleanText(para);
        if (text && this.isValidContent(text)) {
          contentParts.push(text);
        }
      }
    }

    // TTS에서 추출 실패 시 DOM에서 추출
    if (contentParts.length === 0) {
      // .detail-body에서 본문 추출
      const detailBody = $('.detail-body');
      if (detailBody.length > 0) {
        detailBody.find('p').each((_, element) => {
          const text = this.cleanText($(element).text());
          if (text && this.isValidContent(text)) {
            contentParts.push(text);
          }
        });
      }

      // .view-article에서도 시도
      if (contentParts.length === 0) {
        const viewArticle = $('.view-article');
        if (viewArticle.length > 0) {
          const htmlContent = viewArticle.html() || '';
          const cleanedHtml = htmlContent
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/<figure[^>]*>[\s\S]*?<\/figure>/gi, '')
            .replace(/<div[^>]*class="[^"]*player[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '')
            .replace(/<div[^>]*class="[^"]*detail-visual[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '');

          const paragraphs = cleanedHtml.split(/<br\s*\/?>/gi);
          for (const para of paragraphs) {
            const text = this.cleanText(para.replace(/<[^>]*>/g, ''));
            if (text && this.isValidContent(text)) {
              contentParts.push(text);
            }
          }
        }
      }
    }

    const content = contentParts.join('\n\n');
    if (!content) {
      throw new Error('기사 본문을 찾을 수 없습니다.');
    }

    // 이미지 추출
    const images = this.extractKbsImages($, url);

    // 태그 (카테고리 포함)
    const tags: string[] = [...categories];

    return {
      title,
      content,
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
      text.includes('ⓒ') ||
      text.includes('KBS') && text.includes('reserved') ||
      text.includes('저작권자') ||
      text.includes('무단전재') ||
      text.includes('재배포') ||
      text.includes('구독') ||
      text.includes('좋아요') ||
      text.includes('댓글') ||
      text.includes('공유하기') ||
      text.includes('크롬기반') ||
      text.includes('브라우저에서만') ||
      text.includes('[사진 출처')
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
   * KBS 전용 이미지 추출
   */
  private extractKbsImages(
    $: ReturnType<typeof this.loadHtml>,
    baseUrl: string,
  ): string[] {
    const images: string[] = [];
    const baseUrlObj = new URL(baseUrl);

    // 대표 이미지 추출
    const thumbnailImg = $('#imgVodThumbnail');
    if (thumbnailImg.length > 0) {
      const src = thumbnailImg.attr('src');
      if (src) {
        try {
          let absoluteUrl = src;
          if (src.startsWith('/')) {
            absoluteUrl = `${baseUrlObj.origin}${src}`;
          } else if (!src.startsWith('http')) {
            absoluteUrl = new URL(src, baseUrlObj.origin).href;
          }
          if (!images.includes(absoluteUrl)) {
            images.push(absoluteUrl);
          }
        } catch {
          // URL 파싱 실패 시 무시
        }
      }
    }

    // .detail-visual img 추출
    $('.detail-visual img').each((_, element) => {
      const src = $(element).attr('src');
      if (src) {
        try {
          let absoluteUrl = src;
          if (src.startsWith('/')) {
            absoluteUrl = `${baseUrlObj.origin}${src}`;
          } else if (!src.startsWith('http')) {
            absoluteUrl = new URL(src, baseUrlObj.origin).href;
          }

          if (
            !images.includes(absoluteUrl) &&
            !src.includes('icon') &&
            !src.includes('logo') &&
            !src.includes('blank') &&
            !src.includes('btn_') &&
            !src.includes('button')
          ) {
            images.push(absoluteUrl);
          }
        } catch {
          // URL 파싱 실패 시 무시
        }
      }
    });

    // .detail-body img 추출
    $('.detail-body img').each((_, element) => {
      const src = $(element).attr('src');
      if (src) {
        try {
          let absoluteUrl = src;
          if (src.startsWith('/')) {
            absoluteUrl = `${baseUrlObj.origin}${src}`;
          } else if (!src.startsWith('http')) {
            absoluteUrl = new URL(src, baseUrlObj.origin).href;
          }

          if (
            !images.includes(absoluteUrl) &&
            !src.includes('icon') &&
            !src.includes('logo') &&
            !src.includes('blank') &&
            !src.includes('btn_') &&
            !src.includes('button')
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
