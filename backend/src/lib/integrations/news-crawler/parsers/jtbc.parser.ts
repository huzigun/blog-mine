import { NewsArticle } from '../news-crawler.interface';
import { BaseNewsParser } from './base.parser';

/**
 * JTBC (news.jtbc.co.kr) 파서
 *
 * HTML 구조 (MUI 기반 React 앱):
 * - JSON-LD: script#article-structured-data (headline, image, datePublished, author)
 * - 카테고리: a[href*="/sections/"] 내 텍스트 (정치, 경제 등)
 * - 제목: h1[class*="my-o2xdzg"] (기사 제목)
 * - 기자명: .author-item span[class*="my-1e3g9z9"] (최인선 기자)
 * - 입력일: span:contains("입력") (입력 2026.01.06 16:47)
 * - 본문: #ijam_content span[class*="my-1bw6mip"] (br 태그로 구분)
 * - 이미지: #ijam_content figure img
 * - 이미지 캡션: #ijam_content figcaption
 * - 태그: .MuiChip-label (미국, 베네수엘라 공습 등)
 * - 저작권: JTBC
 */
export class JtbcParser extends BaseNewsParser {
  readonly supportedDomains = [
    'news.jtbc.co.kr',
    'jtbc.co.kr',
    'www.jtbc.co.kr',
  ];
  readonly sourceName = 'JTBC';

  parse(html: string, url: string): NewsArticle {
    const $ = this.loadHtml(html);

    // JSON-LD에서 구조화 데이터 추출 시도
    let jsonLdData: {
      headline?: string;
      image?: string[];
      datePublished?: string;
      author?: { name?: string }[];
    } | null = null;

    try {
      const jsonLdScript = $('#article-structured-data').html();
      if (jsonLdScript) {
        jsonLdData = JSON.parse(jsonLdScript);
      }
    } catch {
      // JSON-LD 파싱 실패 시 무시
    }

    // 제목 추출 (JSON-LD 우선, 없으면 DOM에서 추출)
    let title = jsonLdData?.headline || '';
    if (!title) {
      // h1 태그에서 추출
      title = this.cleanText($('h1').first().text());
    }
    if (!title) {
      // og:title에서 추출
      title = this.cleanText(
        $('meta[property="og:title"]').attr('content') || '',
      );
    }
    if (!title) {
      throw new Error('기사 제목을 찾을 수 없습니다.');
    }

    // 카테고리 추출
    const categories: string[] = [];
    $('a[href*="/sections/"]').each((_, element) => {
      const cat = this.cleanText($(element).text());
      if (cat && !categories.includes(cat)) {
        categories.push(cat);
      }
    });

    // 기자명 추출 (JSON-LD 우선)
    let author: string | undefined;
    if (jsonLdData?.author && jsonLdData.author.length > 0) {
      const authorName = jsonLdData.author[0].name;
      if (authorName) {
        author = authorName.includes('기자')
          ? authorName
          : `${authorName} 기자`;
      }
    }
    if (!author) {
      // DOM에서 추출
      const authorElement = $('.author-item span').filter((_, el) => {
        const text = $(el).text();
        return text.includes('기자');
      });
      if (authorElement.length > 0) {
        author = this.cleanText(authorElement.first().text());
      }
    }

    // 입력일 추출 (JSON-LD 우선)
    let publishedAt: string | undefined;
    if (jsonLdData?.datePublished) {
      // ISO 형식을 한국 형식으로 변환 (2026-01-06T16:47+09:00 → 2026.01.06 16:47)
      try {
        const date = new Date(jsonLdData.datePublished);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        publishedAt = `${year}.${month}.${day} ${hours}:${minutes}`;
      } catch {
        // 날짜 변환 실패 시 무시
      }
    }
    if (!publishedAt) {
      // DOM에서 추출 (입력 2026.01.06 16:47 형식)
      $('span').each((_, element) => {
        const text = $(element).text();
        if (text.includes('입력')) {
          const match = text.match(/입력\s*(\d{4}\.\d{2}\.\d{2}\s*\d{2}:\d{2})/);
          if (match) {
            publishedAt = match[1];
            return false; // break
          }
        }
      });
    }

    // 본문 추출
    const contentParts: string[] = [];

    // #ijam_content 내 span 태그들에서 본문 추출
    const contentContainer = $('#ijam_content');
    if (contentContainer.length > 0) {
      // span.my-1bw6mip 클래스의 텍스트 추출
      contentContainer.find('span').each((_, element) => {
        const className = $(element).attr('class') || '';
        // 본문 텍스트 span만 선택 (my-1bw6mip 클래스)
        if (className.includes('my-1bw6mip')) {
          const text = this.cleanText($(element).text());
          if (text && this.isValidContent(text)) {
            contentParts.push(text);
          }
        }
      });
    }

    // 본문이 없으면 다른 방식으로 시도
    if (contentParts.length === 0) {
      // ijam_content에서 직접 텍스트 추출
      const htmlContent = contentContainer.html() || '';
      const cleanedHtml = htmlContent
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<figure[^>]*>[\s\S]*?<\/figure>/gi, '')
        .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '')
        .replace(/<div[^>]*class="[^"]*ad[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '')
        .replace(
          /<div[^>]*class="[^"]*ADVERTISEMENT[^"]*"[^>]*>[\s\S]*?<\/div>/gi,
          '',
        );

      // br 태그 기준으로 분리
      const paragraphs = cleanedHtml.split(/<br\s*\/?>/gi);
      for (const para of paragraphs) {
        const text = this.cleanText(para.replace(/<[^>]*>/g, ''));
        if (text && this.isValidContent(text)) {
          contentParts.push(text);
        }
      }
    }

    const content = contentParts.join('\n\n');
    if (!content) {
      throw new Error('기사 본문을 찾을 수 없습니다.');
    }

    // 이미지 추출 (JSON-LD 우선)
    let images: string[] = [];
    if (jsonLdData?.image && jsonLdData.image.length > 0) {
      images = jsonLdData.image.filter(
        (img) =>
          !img.includes('icon') &&
          !img.includes('logo') &&
          !img.includes('banner'),
      );
    }
    // DOM에서 추가 이미지 추출
    if (images.length === 0) {
      images = this.extractJtbcImages($, url);
    }

    // 태그 추출
    const tags: string[] = [...categories];
    $('.MuiChip-label').each((_, element) => {
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
    // 광고/저작권 문구 제거
    if (
      text.includes('ADVERTISEMENT') ||
      text.includes('Copyright') ||
      text.includes('ⓒ') ||
      text.includes('JTBC') && text.includes('reserved') ||
      text.includes('저작권자') ||
      text.includes('무단전재') ||
      text.includes('재배포') ||
      text.includes('구독') ||
      text.includes('좋아요') ||
      text.includes('싫어요') ||
      text.includes('댓글') ||
      text.includes('스크랩') ||
      text.includes('공유하기') ||
      text.includes('인쇄하기') ||
      text.includes('글자 크기')
    ) {
      return false;
    }

    // 빈 문자열 제외
    if (text.trim().length === 0) {
      return false;
    }

    return true;
  }

  /**
   * JTBC 전용 이미지 추출
   */
  private extractJtbcImages(
    $: ReturnType<typeof this.loadHtml>,
    baseUrl: string,
  ): string[] {
    const images: string[] = [];
    const baseUrlObj = new URL(baseUrl);

    // 기사 본문 내 figure > img 추출
    $('#ijam_content figure img, #ijam_content .ab_photo img').each(
      (_, element) => {
        const src = $(element).attr('src');

        if (src) {
          try {
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
              !src.includes('journalist') &&
              !src.includes('reporter')
            ) {
              images.push(absoluteUrl);
            }
          } catch {
            // URL 파싱 실패 시 무시
          }
        }
      },
    );

    return images;
  }
}
