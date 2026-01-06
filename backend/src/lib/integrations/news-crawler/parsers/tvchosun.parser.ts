import { NewsArticle } from '../news-crawler.interface';
import { BaseNewsParser } from './base.parser';

/**
 * TV조선 뉴스 (news.tvchosun.com) 파서
 *
 * HTML 구조:
 * - 카테고리: .view-title .category span a (국제)
 * - 제목: .view-title h2.title
 * - 기자명: .view-title .editor .name-box a.reporter (변재영 기자)
 * - 부서: .view-title .editor .name-box a.department (국제부)
 * - 입력일: .view-title .editor .date li p (등록: 2026.01.06 오후 17:25)
 * - 본문: .item-main .contents .text-box p (br 태그로 구분)
 * - 이미지 캡션: .item-main .contents .img-box img + span.description
 * - 이미지: img.tvchosun.com 도메인
 * - 저작권: Copyrights ⓒ TV조선. 무단전재 및 재배포 금지
 */
export class TvchosunParser extends BaseNewsParser {
  readonly supportedDomains = ['news.tvchosun.com', 'tvchosun.com'];
  readonly sourceName = 'TV조선';

  parse(html: string, url: string): NewsArticle {
    const $ = this.loadHtml(html);

    // 제목 추출
    let title = this.cleanText($('.view-title h2.title').text());
    if (!title) {
      title = this.cleanText($('.view-title .title').text());
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
    $('.view-title .category span a').each((_, element) => {
      const cat = this.cleanText($(element).text());
      if (cat && cat !== '전체' && !categories.includes(cat)) {
        categories.push(cat);
      }
    });

    // 기자명 추출
    let author: string | undefined;
    const reporterElement = $('.view-title .editor .name-box a.reporter');
    if (reporterElement.length > 0) {
      author = this.cleanText(reporterElement.text());
    }
    if (!author) {
      // 대체: 하단 기자 정보에서 추출
      const editorName = $('.editor-detail .name');
      if (editorName.length > 0) {
        author = this.cleanText(editorName.first().text().split('<')[0]);
      }
    }

    // 입력일 추출 (등록: 2026.01.06 오후 17:25 형식)
    let publishedAt: string | undefined;
    const dateElements = $('.view-title .editor .date li p');
    dateElements.each((_, element) => {
      const dateText = this.cleanText($(element).text());
      // "등록: 2026.01.06 오후 17:25" 패턴 매칭
      const match = dateText.match(/등록:\s*(\d{4}\.\d{2}\.\d{2})\s*(오전|오후)?\s*(\d{1,2}:\d{2})/);
      if (match) {
        let hour = parseInt(match[3].split(':')[0], 10);
        const minutes = match[3].split(':')[1];
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
    });
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

    const articleBody = $('.item-main .contents .text-box');
    if (articleBody.length > 0) {
      // p 태그 내 텍스트 추출
      articleBody.find('p').each((_, element) => {
        const htmlContent = $(element).html() || '';

        // 광고, 스크립트 제거
        const cleanedHtml = htmlContent
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<div[^>]*class="[^"]*ad[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '');

        // br 태그 기준으로 분리
        const paragraphs = cleanedHtml.split(/<br\s*\/?>/gi);
        for (const para of paragraphs) {
          const text = this.cleanText(para.replace(/<[^>]*>/g, ''));
          if (text && this.isValidContent(text)) {
            contentParts.push(text);
          }
        }
      });
    }

    // 본문이 없으면 대체 선택자로 시도
    if (contentParts.length === 0) {
      const altBody = $('.contents .text-box, .article-body');
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
    const images = this.extractTvchosunImages($, url);

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
      text.includes('Copyrights') ||
      text.includes('ⓒ TV조선') ||
      text.includes('ⓒ 조선') ||
      text.includes('TV조선') && text.includes('무단전재') ||
      text.includes('재배포 금지') ||
      text.includes('저작권자') ||
      text.includes('구독') ||
      text.includes('좋아요') ||
      text.includes('댓글') ||
      text.includes('공유하기') ||
      text.includes('제보하기') ||
      text.includes('[사진 출처') ||
      text.includes('[사진=') ||
      text.includes('/연합뉴스') && text.length < 30 // 이미지 출처만 있는 경우
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
   * TV조선 전용 이미지 추출
   */
  private extractTvchosunImages(
    $: ReturnType<typeof this.loadHtml>,
    baseUrl: string,
  ): string[] {
    const images: string[] = [];
    const baseUrlObj = new URL(baseUrl);

    // 대표 이미지 추출
    const mainImg = $('.item-main .contents .img-box img');
    if (mainImg.length > 0) {
      const src = mainImg.first().attr('src');
      if (src && this.isValidImageUrl(src)) {
        const absoluteUrl = this.resolveUrl(src, baseUrlObj);
        if (absoluteUrl && !images.includes(absoluteUrl)) {
          images.push(absoluteUrl);
        }
      }
    }

    // 기사 본문 내 이미지 추출
    const imageSelectors = [
      '.item-main .contents img',
      '.text-box img',
      '.article-body img',
    ];

    for (const selector of imageSelectors) {
      $(selector).each((_, element) => {
        const src =
          $(element).attr('data-src') ||
          $(element).attr('src') ||
          $(element).attr('data-lazy-src');

        if (src && this.isValidTvchosunImageUrl(src)) {
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
   * TV조선 전용 유효한 이미지 URL인지 확인
   */
  private isValidTvchosunImageUrl(src: string): boolean {
    return (
      !src.includes('icon') &&
      !src.includes('logo') &&
      !src.includes('blank') &&
      !src.includes('ad') &&
      !src.includes('banner') &&
      !src.includes('btn_') &&
      !src.includes('button') &&
      !src.includes('staff_img') && // 기자 사진 제외
      !src.includes('profile') &&
      !src.includes('sns') &&
      !src.includes('share') &&
      !src.includes('ytimg.com') && // 유튜브 썸네일 제외
      !src.includes('rnbImg') && // 광고 배너 제외
      (src.includes('img.tvchosun.com') || src.includes('tvchosun.com/sitedata'))
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
