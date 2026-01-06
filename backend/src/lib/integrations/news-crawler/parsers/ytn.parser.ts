import { NewsArticle } from '../news-crawler.interface';
import { BaseNewsParser } from './base.parser';

/**
 * YTN 뉴스 (www.ytn.co.kr) 파서
 *
 * HTML 구조:
 * - 카테고리: .bx_cate_news .bx_title h3 (정치)
 * - 제목: h2.news_title span
 * - 입력일: .news_info .date (2026.01.06. 오후 6:23.)
 * - 본문: #CmAdContent.paragraph span (br 태그로 구분)
 * - 기자명: 본문 내 추출 (YTN 정인용 (quotejeong@ytn.co.kr))
 * - 이미지: image.ytn.co.kr 도메인
 * - 저작권: [저작권자(c) YTN 무단전재, 재배포 및 AI 데이터 활용 금지]
 */
export class YtnParser extends BaseNewsParser {
  readonly supportedDomains = ['www.ytn.co.kr', 'ytn.co.kr'];
  readonly sourceName = 'YTN';

  parse(html: string, url: string): NewsArticle {
    const $ = this.loadHtml(html);

    // 제목 추출
    let title = this.cleanText($('h2.news_title span').text());
    if (!title) {
      title = this.cleanText($('h2.news_title').text());
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
    const categoryText = this.cleanText($('.bx_cate_news .bx_title h3').text());
    if (categoryText && !categories.includes(categoryText)) {
      categories.push(categoryText);
    }

    // 입력일 추출 (2026.01.06. 오후 6:23. 형식)
    let publishedAt: string | undefined;
    const dateElement = $('.news_info .date');
    if (dateElement.length > 0) {
      const dateText = this.cleanText(dateElement.text());
      // "2026.01.06. 오후 6:23." 패턴 매칭
      const match = dateText.match(/(\d{4}\.\d{2}\.\d{2})\.\s*(오전|오후)?\s*(\d{1,2}):(\d{2})/);
      if (match) {
        let hour = parseInt(match[3], 10);
        const minutes = match[4];
        // 오후이고 12시가 아니면 +12
        if (match[2] === '오후' && hour !== 12) {
          hour += 12;
        }
        // 오전 12시는 0시
        if (match[2] === '오전' && hour === 12) {
          hour = 0;
        }
        publishedAt = `${match[1]} ${hour.toString().padStart(2, '0')}:${minutes}`;
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
    let author: string | undefined;

    const articleBody = $('#CmAdContent.paragraph');
    if (articleBody.length > 0) {
      // span 태그 내 텍스트 추출
      articleBody.find('span').each((_, element) => {
        const htmlContent = $(element).html() || '';

        // 스크립트, 스타일 제거
        const cleanedHtml = htmlContent
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

        // br 태그 기준으로 분리
        const paragraphs = cleanedHtml.split(/<br\s*\/?>/gi);
        for (const para of paragraphs) {
          const text = this.cleanText(para.replace(/<[^>]*>/g, ''));
          if (text) {
            // 기자명 추출 (YTN 기자명 (email@ytn.co.kr) 패턴)
            const authorMatch = text.match(/YTN\s+([가-힣]+)\s*\([^)]+@[^)]+\)/);
            if (authorMatch && !author) {
              author = `${authorMatch[1]} 기자`;
            }

            if (this.isValidContent(text)) {
              contentParts.push(text);
            }
          }
        }
      });
    }

    // 본문이 없으면 대체 선택자로 시도
    if (contentParts.length === 0) {
      const altBody = $('.paragraph, .article_body, .news_content');
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
    const images = this.extractYtnImages($, url);

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
      text.includes('저작권자') ||
      text.includes('(c) YTN') ||
      text.includes('ⓒ YTN') ||
      text.includes('무단전재') ||
      text.includes('재배포') ||
      text.includes('AI 데이터 활용 금지') ||
      text.includes('구독') ||
      text.includes('좋아요') ||
      text.includes('댓글') ||
      text.includes('공유하기') ||
      text.includes('[사진 출처') ||
      text.includes('[사진=') ||
      text.includes('▶') || // 관련 기사 링크
      text.includes('※') || // 주석
      (text.includes('YTN') && text.includes('@') && text.length < 50) // 기자 이메일 패턴만 있는 경우
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
   * YTN 전용 이미지 추출
   */
  private extractYtnImages(
    $: ReturnType<typeof this.loadHtml>,
    baseUrl: string,
  ): string[] {
    const images: string[] = [];
    const baseUrlObj = new URL(baseUrl);

    // 기사 본문 내 이미지 추출
    const imageSelectors = [
      '.bx_vod .photo img',
      '#CmAdContent img',
      '.paragraph img',
      '.news_content img',
      '.article_body img',
    ];

    for (const selector of imageSelectors) {
      $(selector).each((_, element) => {
        const src =
          $(element).attr('data-src') ||
          $(element).attr('src') ||
          $(element).attr('data-lazy-src');

        if (src && this.isValidYtnImageUrl(src)) {
          const absoluteUrl = this.resolveUrl(src, baseUrlObj);
          if (absoluteUrl && !images.includes(absoluteUrl)) {
            images.push(absoluteUrl);
          }
        }
      });
    }

    // og:image에서도 추출 시도
    if (images.length === 0) {
      const ogImage = $('meta[property="og:image"]').attr('content');
      if (ogImage) {
        const absoluteUrl = this.resolveUrl(ogImage, baseUrlObj);
        if (absoluteUrl && !images.includes(absoluteUrl)) {
          images.push(absoluteUrl);
        }
      }
    }

    return images;
  }

  /**
   * YTN 전용 유효한 이미지 URL인지 확인
   */
  private isValidYtnImageUrl(src: string): boolean {
    return (
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
      !src.includes('common/') && // 공통 이미지 제외
      (src.includes('image.ytn.co.kr') || src.includes('ytn.co.kr/news'))
    );
  }

  /**
   * URL을 절대 경로로 변환
   */
  private resolveUrl(src: string, baseUrlObj: URL): string | null {
    try {
      let absoluteUrl = src;
      if (src.startsWith('//')) {
        absoluteUrl = 'https:' + src;
      } else if (!src.startsWith('http')) {
        absoluteUrl = new URL(src, baseUrlObj.origin).href;
      }
      return absoluteUrl;
    } catch {
      return null;
    }
  }
}
