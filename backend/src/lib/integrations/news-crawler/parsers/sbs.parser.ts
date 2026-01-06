import { NewsArticle } from '../news-crawler.interface';
import { BaseNewsParser } from './base.parser';

/**
 * SBS 뉴스 (news.sbs.co.kr) 파서
 *
 * HTML 구조:
 * - 제목: h1.article_main_tit#news-title
 * - 기자명: .w_author .reporter span[itemprop="name"] (안희재 기자)
 * - 입력일: .date_area meta[itemprop="datePublished"] content (2026-01-06T14:17:00+09:00)
 *         또는 .date_area span (작성 2026.01.06 14:17)
 * - 본문: .text_area[itemprop="articleBody"] (br 태그로 구분)
 * - 이미지: .w_article_mainimg .article_image img.mainimg (img.sbs.co.kr 도메인)
 * - 저작권: Copyright Ⓒ SBS. All rights reserved.
 */
export class SbsParser extends BaseNewsParser {
  readonly supportedDomains = ['news.sbs.co.kr', 'sbs.co.kr'];
  readonly sourceName = 'SBS';

  parse(html: string, url: string): NewsArticle {
    const $ = this.loadHtml(html);

    // 제목 추출
    let title = this.cleanText($('h1.article_main_tit#news-title').text());
    if (!title) {
      title = this.cleanText($('h1.article_main_tit').text());
    }
    if (!title) {
      title = this.cleanText(
        $('meta[property="og:title"]').attr('content') || '',
      );
    }
    if (!title) {
      throw new Error('기사 제목을 찾을 수 없습니다.');
    }

    // 기자명 추출
    let author: string | undefined;
    const reporterElement = $('.w_author .reporter span[itemprop="name"]');
    if (reporterElement.length > 0) {
      author = this.cleanText(reporterElement.first().text());
    }
    if (!author) {
      // 대체 선택자
      const bylineElement = $('.reporter_area .reporter');
      if (bylineElement.length > 0) {
        author = this.cleanText(bylineElement.text());
      }
    }

    // 입력일 추출 (meta 태그에서 우선 추출)
    let publishedAt: string | undefined;
    const metaDatePublished = $('meta[itemprop="datePublished"]').attr('content');
    if (metaDatePublished) {
      // ISO 형식에서 날짜시간만 추출 (2026-01-06T14:17:00+09:00 → 2026-01-06 14:17)
      const isoMatch = metaDatePublished.match(/(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
      if (isoMatch) {
        publishedAt = `${isoMatch[1]} ${isoMatch[2]}`;
      }
    }
    if (!publishedAt) {
      // 대체: .date_area에서 텍스트 추출
      const dateAreaText = this.cleanText($('.date_area').text());
      const dateMatch = dateAreaText.match(/작성\s*(\d{4}\.\d{2}\.\d{2}\s*\d{2}:\d{2})/);
      if (dateMatch) {
        publishedAt = dateMatch[1];
      }
    }

    // 본문 추출
    const contentParts: string[] = [];

    // .text_area[itemprop="articleBody"]에서 본문 추출
    const articleBody = $('.text_area[itemprop="articleBody"]');
    if (articleBody.length > 0) {
      const htmlContent = articleBody.html() || '';

      // 스크립트, 스타일, figure, div(광고/캡션) 등 제거
      const cleanedHtml = htmlContent
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<figure[^>]*>[\s\S]*?<\/figure>/gi, '')
        .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '')
        .replace(/<div[^>]*>[\s\S]*?<\/div>/gi, ''); // 이미지 캡션 div 제거

      // br 태그 기준으로 분리
      const paragraphs = cleanedHtml.split(/<br\s*\/?>/gi);
      for (const para of paragraphs) {
        const text = this.cleanText(para.replace(/<[^>]*>/g, ''));
        if (text && this.isValidContent(text)) {
          contentParts.push(text);
        }
      }
    }

    // 본문이 없으면 대체 선택자로 시도
    if (contentParts.length === 0) {
      const altBody = $('.article_cont_area .main_text');
      if (altBody.length > 0) {
        const htmlContent = altBody.html() || '';
        const cleanedHtml = htmlContent
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<div[^>]*>[\s\S]*?<\/div>/gi, '');

        const paragraphs = cleanedHtml.split(/<br\s*\/?>/gi);
        for (const para of paragraphs) {
          const text = this.cleanText(para.replace(/<[^>]*>/g, ''));
          if (text && this.isValidContent(text)) {
            contentParts.push(text);
          }
        }
      }
    }

    const content = contentParts.join('\n\n');
    if (!content) {
      throw new Error('기사 본문을 찾을 수 없습니다.');
    }

    // 이미지 추출
    const images = this.extractSbsImages($, url);

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
   * 유효한 본문 내용인지 확인
   */
  private isValidContent(text: string): boolean {
    // 저작권/광고 문구 제거
    if (
      text.includes('Copyright') ||
      text.includes('Ⓒ SBS') ||
      text.includes('ⓒ SBS') ||
      text.includes('All rights reserved') ||
      text.includes('저작권자') ||
      text.includes('무단 전재') ||
      text.includes('재배포') ||
      text.includes('AI학습 이용 금지') ||
      text.includes('구독') ||
      text.includes('좋아요') ||
      text.includes('댓글') ||
      text.includes('공유하기') ||
      text.includes('[사진 출처') ||
      text.includes('▲') // 이미지 캡션 기호
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
   * SBS 전용 이미지 추출
   */
  private extractSbsImages(
    $: ReturnType<typeof this.loadHtml>,
    baseUrl: string,
  ): string[] {
    const images: string[] = [];
    const baseUrlObj = new URL(baseUrl);

    // 대표 이미지 추출 (.mainimg)
    const mainImg = $('.w_article_mainimg .article_image img.mainimg');
    if (mainImg.length > 0) {
      const src = mainImg.attr('src');
      if (src) {
        try {
          let absoluteUrl = src;
          if (src.startsWith('//')) {
            absoluteUrl = 'https:' + src;
          } else if (!src.startsWith('http')) {
            absoluteUrl = new URL(src, baseUrlObj.origin).href;
          }
          if (!images.includes(absoluteUrl) && src.includes('img.sbs.co.kr')) {
            images.push(absoluteUrl);
          }
        } catch {
          // URL 파싱 실패 시 무시
        }
      }
    }

    // 기사 본문 내 이미지 추출
    const imageSelectors = [
      '.text_area img',
      '.article_cont_area img',
      '.main_text img',
    ];

    for (const selector of imageSelectors) {
      $(selector).each((_, element) => {
        const src =
          $(element).attr('data-src') ||
          $(element).attr('src') ||
          $(element).attr('data-lazy-src');

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
              !src.includes('reporter') &&
              !src.includes('profile') &&
              !src.includes('thumb_v3') &&
              !src.includes('people_default') &&
              src.includes('img.sbs.co.kr') // SBS 이미지 서버만 포함
            ) {
              images.push(absoluteUrl);
            }
          } catch {
            // URL 파싱 실패 시 무시
          }
        }
      });
    }

    // og:image에서도 추출 시도
    if (images.length === 0) {
      const ogImage = $('meta[property="og:image"]').attr('content');
      if (ogImage) {
        try {
          let absoluteUrl = ogImage;
          if (ogImage.startsWith('//')) {
            absoluteUrl = 'https:' + ogImage;
          }
          if (!images.includes(absoluteUrl)) {
            images.push(absoluteUrl);
          }
        } catch {
          // URL 파싱 실패 시 무시
        }
      }
    }

    return images;
  }
}
