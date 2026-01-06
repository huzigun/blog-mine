import { NewsArticle } from '../news-crawler.interface';
import { BaseNewsParser } from './base.parser';

/**
 * SBS Biz 뉴스 (biz.sbs.co.kr) 파서
 *
 * HTML 구조:
 * - 카테고리: .ah_category .aha_title (생활)
 * - 제목: h3.ah_big_title
 * - 기자명: .ah_info .ahi_name (김종윤 기자)
 * - 입력일: .ah_info .ahi_date (입력 2026.01.06.18:05)
 * - 본문: .ab_text (br 태그로 구분)
 * - 기자 정보: .ab_reporter .rl_title (기자명), .rl_subtext (이메일)
 * - 이미지: img.biz.sbs.co.kr 도메인
 * - 저작권: Copyright Ⓒ SBS Medianet & SBSi. All rights reserved.
 */
export class SbsBizParser extends BaseNewsParser {
  readonly supportedDomains = ['biz.sbs.co.kr'];
  readonly sourceName = 'SBS Biz';

  parse(html: string, url: string): NewsArticle {
    const $ = this.loadHtml(html);

    // 제목 추출
    let title = this.cleanText($('h3.ah_big_title').text());
    if (!title) {
      title = this.cleanText($('.ah_big_title').text());
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
    const categoryText = this.cleanText($('.ah_category .aha_title').text());
    if (categoryText && !categories.includes(categoryText)) {
      categories.push(categoryText);
    }

    // 기자명 추출
    let author: string | undefined;
    const authorElement = $('.ah_info .ahi_name');
    if (authorElement.length > 0) {
      author = this.cleanText(authorElement.text());
    }
    if (!author) {
      // 대체: 본문 하단 기자 정보에서 추출
      const reporterTitle = $('.ab_reporter .rl_title');
      if (reporterTitle.length > 0) {
        author = this.cleanText(reporterTitle.text());
      }
    }

    // 입력일 추출 (입력 2026.01.06.18:05 형식)
    let publishedAt: string | undefined;
    const dateElement = $('.ah_info .ahi_date');
    if (dateElement.length > 0) {
      const dateText = this.cleanText(dateElement.text());
      // "입력 2026.01.06.18:05" → "2026.01.06 18:05"
      const match = dateText.match(/입력\s*(\d{4}\.\d{2}\.\d{2})\.?(\d{2}:\d{2})/);
      if (match) {
        publishedAt = `${match[1]} ${match[2]}`;
      } else {
        // 다른 형식 시도 (2026.01.06 18:05)
        const altMatch = dateText.match(/(\d{4}\.\d{2}\.\d{2})\s*(\d{2}:\d{2})/);
        if (altMatch) {
          publishedAt = `${altMatch[1]} ${altMatch[2]}`;
        }
      }
    }
    if (!publishedAt) {
      // 대체: meta 태그에서 추출
      const metaDate = $('meta[property="article:published_time"]').attr('content');
      if (metaDate) {
        const isoMatch = metaDate.match(/(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
        if (isoMatch) {
          publishedAt = `${isoMatch[1]} ${isoMatch[2]}`;
        }
      }
    }

    // 본문 추출
    const contentParts: string[] = [];

    const articleBody = $('.ab_text');
    if (articleBody.length > 0) {
      const htmlContent = articleBody.html() || '';

      // 스크립트, 스타일, iframe, 광고 등 제거
      const cleanedHtml = htmlContent
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '')
        .replace(/<figure[^>]*>[\s\S]*?<\/figure>/gi, '')
        .replace(/<div[^>]*class="[^"]*ad[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '');

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
      const altBody = $('.article_body, .article_content');
      if (altBody.length > 0) {
        const htmlContent = altBody.html() || '';
        const cleanedHtml = htmlContent
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

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
    const images = this.extractSbsBizImages($, url);

    // 태그 (카테고리 포함)
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
   * 유효한 본문 내용인지 확인
   */
  private isValidContent(text: string): boolean {
    // 저작권/광고 문구 제거
    if (
      text.includes('Copyright') ||
      text.includes('Ⓒ SBS') ||
      text.includes('ⓒ SBS') ||
      text.includes('SBS Medianet') ||
      text.includes('SBSi') ||
      text.includes('All rights reserved') ||
      text.includes('저작권자') ||
      text.includes('무단전재') ||
      text.includes('재배포 금지') ||
      text.includes('구독') ||
      text.includes('좋아요') ||
      text.includes('댓글') ||
      text.includes('공유하기') ||
      text.includes('[사진 출처') ||
      text.includes('[사진=') ||
      text.includes('▲') || // 이미지 캡션 기호
      (text.includes('@') && text.includes('.co.kr') && text.length < 50) // 기자 이메일 패턴
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
   * SBS Biz 전용 이미지 추출
   */
  private extractSbsBizImages(
    $: ReturnType<typeof this.loadHtml>,
    baseUrl: string,
  ): string[] {
    const images: string[] = [];
    const baseUrlObj = new URL(baseUrl);

    // 기사 본문 내 이미지 추출
    const imageSelectors = [
      '.ab_text img',
      '.article_body img',
      '.ah_img img',
      'figure img',
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
              !src.includes('sns') &&
              !src.includes('share') &&
              (src.includes('img.biz.sbs.co.kr') || src.includes('biz.sbs.co.kr/article'))
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
