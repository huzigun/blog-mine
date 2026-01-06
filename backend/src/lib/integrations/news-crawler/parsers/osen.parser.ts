import { NewsArticle } from '../news-crawler.interface';
import { BaseNewsParser } from './base.parser';

/**
 * OSEN (www.osen.co.kr) 파서
 *
 * HTML 구조:
 * - 카테고리: .page-location a (Entertainment 등)
 * - 제목: strong.view-info_title
 * - 기자명: .view-info__journalist em (최이정 기자)
 * - 입력일: .view-info__date (발행 2026.01.06 07:06)
 * - 본문: #articleBody[itemprop="articleBody"] .article_paragarph (div 태그들)
 * - 이미지: #articleBody img.view_photo (file.osen.co.kr 도메인)
 * - 저작권: Copyright ⓒ OSEN. All rights reserved.
 */
export class OsenParser extends BaseNewsParser {
  readonly supportedDomains = ['www.osen.co.kr', 'osen.co.kr'];
  readonly sourceName = 'OSEN';

  parse(html: string, url: string): NewsArticle {
    const $ = this.loadHtml(html);

    // 제목 추출
    let title = this.cleanText($('strong.view-info_title').text());
    if (!title) {
      title = this.cleanText($('.view-info_title').text());
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
    $('.page-location a').each((_, element) => {
      const cat = this.cleanText($(element).text());
      // 'Home'이나 빈 문자열 제외
      if (cat && cat !== 'Home' && cat !== '홈' && !categories.includes(cat)) {
        categories.push(cat);
      }
    });

    // 기자명 추출
    let author: string | undefined;
    const journalistElement = $('.view-info__journalist em');
    if (journalistElement.length > 0) {
      author = this.cleanText(journalistElement.first().text());
    }
    if (!author) {
      // 대체 선택자
      const bylineElement = $('.journalist, .reporter, .writer');
      if (bylineElement.length > 0) {
        author = this.cleanText(bylineElement.text());
      }
    }

    // 입력일 추출 (발행 2026.01.06 07:06 형식)
    let publishedAt: string | undefined;
    const dateElement = $('.view-info__date');
    if (dateElement.length > 0) {
      const dateText = this.cleanText(dateElement.text());
      // "발행 2026.01.06 07:06" → "2026.01.06 07:06"
      const match = dateText.match(/발행\s*([\d.]+\s*[\d:]+)/);
      if (match) {
        publishedAt = match[1];
      } else {
        // 다른 형식 시도 (2026.01.06 07:06)
        const altMatch = dateText.match(/([\d]{4}\.[\d]{2}\.[\d]{2}\s*[\d]{2}:[\d]{2})/);
        if (altMatch) {
          publishedAt = altMatch[1];
        }
      }
    }
    if (!publishedAt) {
      // 대체: meta 태그에서 추출
      const metaDate = $('meta[property="article:published_time"]').attr('content');
      if (metaDate) {
        publishedAt = metaDate;
      }
    }

    // 본문 추출
    const contentParts: string[] = [];

    // #articleBody 내 .article_paragarph div들에서 본문 추출
    const articleBody = $('#articleBody[itemprop="articleBody"], #articleBody');
    if (articleBody.length > 0) {
      // .article_paragarph div 단위로 추출
      articleBody.find('.article_paragarph').each((_, element) => {
        const text = this.cleanText($(element).text());
        if (text && this.isValidContent(text)) {
          contentParts.push(text);
        }
      });

      // .article_paragarph가 없으면 p 태그로 시도
      if (contentParts.length === 0) {
        articleBody.find('p').each((_, element) => {
          const text = this.cleanText($(element).text());
          if (text && this.isValidContent(text)) {
            contentParts.push(text);
          }
        });
      }

      // p 태그도 없으면 전체 텍스트에서 추출
      if (contentParts.length === 0) {
        const htmlContent = articleBody.html() || '';
        const cleanedHtml = htmlContent
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<figure[^>]*>[\s\S]*?<\/figure>/gi, '')
          .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '')
          .replace(/<div[^>]*class="[^"]*ad[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '');

        // br 또는 div 태그 기준으로 분리
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
    const images = this.extractOsenImages($, url);

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
      text.includes('ⓒ OSEN') ||
      text.includes('OSEN') && text.includes('rights reserved') ||
      text.includes('저작권자') ||
      text.includes('무단전재') ||
      text.includes('재배포 금지') ||
      text.includes('구독') ||
      text.includes('좋아요') ||
      text.includes('댓글') ||
      text.includes('공유하기') ||
      text.includes('인쇄하기') ||
      text.includes('[사진 출처') ||
      text.includes('[사진=') ||
      text.includes('/') && text.includes('@') && text.length < 50 // 기자 이메일 패턴
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
   * OSEN 전용 이미지 추출
   */
  private extractOsenImages(
    $: ReturnType<typeof this.loadHtml>,
    baseUrl: string,
  ): string[] {
    const images: string[] = [];
    const baseUrlObj = new URL(baseUrl);

    // 기사 본문 내 이미지 추출
    const imageSelectors = [
      '#articleBody img.view_photo',
      '#articleBody img',
      '.article-body img',
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
              (src.includes('file.osen.co.kr') || src.includes('osen.co.kr/article'))
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
