import { NewsArticle } from '../news-crawler.interface';
import { BaseNewsParser } from './base.parser';

/**
 * 한국경제TV (www.wowtv.co.kr) 파서
 *
 * HTML 구조:
 * - 카테고리: .location-page ul li a span (뉴스 > 전체뉴스)
 * - 제목: h1.title-news
 * - 기자명: .news-aside span (김보선 기자)
 * - 입력일: .news-aside .date-news #artdate (2026-01-06 15:33)
 * - 수정일: .news-aside .date-news #artupdate (2026-01-06 16:05)
 * - 본문: #divNewsContent (br 태그로 구분, 광고 iframe 제외)
 * - 이미지: #divNewsContent img[itemprop="image"]
 * - 해시태그: .box-news-tags .hash-tag02
 * - 기자 부서: .repoter-aside .part (디지털뉴스부)
 * - 저작권: Copyrightⓒ한국경제TV. All Rights Reserved.
 */
export class WowtvParser extends BaseNewsParser {
  readonly supportedDomains = ['www.wowtv.co.kr', 'wowtv.co.kr'];
  readonly sourceName = '한국경제TV';

  parse(html: string, url: string): NewsArticle {
    const $ = this.loadHtml(html);

    // 제목 추출
    const title = this.cleanText($('h1.title-news').text());
    if (!title) {
      throw new Error('기사 제목을 찾을 수 없습니다.');
    }

    // 카테고리 추출
    const categories: string[] = [];
    $('.location-page ul li a span').each((_, element) => {
      const cat = this.cleanText($(element).text());
      if (cat && cat !== 'HOME') {
        categories.push(cat);
      }
    });

    // 기자명 추출
    let author: string | undefined;
    const authorElement = $('.news-aside > p > span').first();
    if (authorElement.length > 0) {
      const authorText = this.cleanText(authorElement.text());
      if (authorText && !authorText.includes('페이스북')) {
        author = authorText;
      }
    }

    // 입력일 추출 (2026-01-06 15:33 형식)
    let publishedAt: string | undefined;
    const artdateElement = $('#artdate');
    if (artdateElement.length > 0) {
      publishedAt = this.cleanText(artdateElement.text());
    }

    // 본문 추출
    const contentParts: string[] = [];

    // #divNewsContent에서 텍스트 추출
    const newsContent = $('#divNewsContent');
    if (newsContent.length > 0) {
      // HTML에서 광고/iframe 제거 후 텍스트 추출
      const htmlContent = newsContent.html() || '';

      // iframe, script, style, div.ADinContents 등 제거
      const cleanedHtml = htmlContent
        .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '')
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<div[^>]*class="[^"]*ADinContents[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '')
        .replace(/<div[^>]*id="photoBanner"[^>]*>[\s\S]*?<\/div>/gi, '')
        .replace(/&ZeroWidthSpace;/gi, '');

      // br 태그를 기준으로 분리
      const paragraphs = cleanedHtml.split(/<br\s*\/?>/gi);

      for (const para of paragraphs) {
        // HTML 태그 제거 후 텍스트 정리
        const text = this.cleanText(para.replace(/<[^>]*>/g, ''));

        if (text) {
          // 저작권/광고 문구 제거
          if (
            text.includes('Copyright') ||
            text.includes('Ⓒ') ||
            text.includes('ⓒ') ||
            text.includes('한국경제TV') && text.includes('Reserved') ||
            text.includes('저작권자') ||
            text.includes('무단전재') ||
            text.includes('재배포') ||
            text.includes('구독') ||
            text.includes('와우퀵') ||
            text.includes('와우넷')
          ) {
            continue;
          }

          // 빈 문자열이나 공백만 있는 경우 제외
          if (text.trim().length === 0) {
            continue;
          }

          contentParts.push(text);
        }
      }
    }

    const content = contentParts.join('\n\n');
    if (!content) {
      throw new Error('기사 본문을 찾을 수 없습니다.');
    }

    // 이미지 추출
    const images = this.extractWowtvImages($, url);

    // 태그 추출 (해시태그 + 카테고리)
    const tags: string[] = [];
    $('.box-news-tags .hash-tag02').each((_, element) => {
      const tag = this.cleanText($(element).text());
      if (tag) {
        // 광고성 태그 제외
        if (
          tag.includes('와우퀵') ||
          tag.includes('와우넷') ||
          tag.includes('투자정보')
        ) {
          return;
        }
        tags.push(tag);
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
   * 한국경제TV 전용 이미지 추출
   * #divNewsContent img[itemprop="image"]
   */
  private extractWowtvImages(
    $: ReturnType<typeof this.loadHtml>,
    baseUrl: string,
  ): string[] {
    const images: string[] = [];
    const baseUrlObj = new URL(baseUrl);

    // 기사 본문 내 이미지 추출
    $('#divNewsContent img[itemprop="image"]').each((_, element) => {
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

          // 중복 제거, 아이콘/로고/광고/배너 제외
          if (
            !images.includes(absoluteUrl) &&
            !src.includes('icon') &&
            !src.includes('logo') &&
            !src.includes('blank') &&
            !src.includes('ad') &&
            !src.includes('banner') &&
            !src.includes('Reporter') &&
            !src.includes('no_image')
          ) {
            images.push(absoluteUrl);
          }
        } catch {
          // URL 파싱 실패 시 무시
        }
      }
    });

    // itemprop이 없는 일반 img도 추출 시도
    if (images.length === 0) {
      $('#divNewsContent img').each((_, element) => {
        const src = $(element).attr('src');

        if (src) {
          try {
            let absoluteUrl = src;
            if (src.startsWith('//')) {
              absoluteUrl = 'https:' + src;
            } else if (!src.startsWith('http')) {
              absoluteUrl = new URL(src, baseUrlObj.origin).href;
            }

            if (
              !images.includes(absoluteUrl) &&
              !src.includes('icon') &&
              !src.includes('logo') &&
              !src.includes('blank') &&
              !src.includes('ad') &&
              !src.includes('banner') &&
              !src.includes('Reporter') &&
              !src.includes('no_image') &&
              src.includes('wowtv.co.kr')
            ) {
              images.push(absoluteUrl);
            }
          } catch {
            // URL 파싱 실패 시 무시
          }
        }
      });
    }

    return images;
  }
}
