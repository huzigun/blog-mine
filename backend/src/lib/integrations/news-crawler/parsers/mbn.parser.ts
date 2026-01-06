import { NewsArticle } from '../news-crawler.interface';
import { BaseNewsParser } from './base.parser';

/**
 * MBN 뉴스 (www.mbn.co.kr) 파서
 *
 * HTML 구조:
 * - 카테고리: .title_box .section (뉴스 > 사회)
 * - 제목: .title_box h1
 * - 입력일: .txt_box .time (기사입력 2026-01-06 13:59 | 최종수정 2026-01-06 14:16)
 * - 본문: #newsViewArea[itemprop="articleBody"] (br 태그로 구분)
 * - 기자명: 본문 하단 [ 기자명 / email ] 형식
 * - 이미지: #newsViewArea img
 * - 저작권: Copyright ⓒ MBN(매일방송)
 */
export class MbnParser extends BaseNewsParser {
  readonly supportedDomains = ['www.mbn.co.kr', 'mbn.co.kr', 'star.mbn.co.kr'];
  readonly sourceName = 'MBN';

  parse(html: string, url: string): NewsArticle {
    const $ = this.loadHtml(html);

    // 제목 추출
    let title = this.cleanText($('.title_box h1').text());
    if (!title) {
      title = this.cleanText($('#content_2020_top h1').text());
    }
    if (!title) {
      title = this.cleanText(
        $('meta[property="og:title"]').attr('content') || '',
      );
    }
    if (!title) {
      throw new Error('기사 제목을 찾을 수 없습니다.');
    }

    // 카테고리 추출 (뉴스 > 사회 형식에서 추출)
    const categories: string[] = [];
    const sectionText = this.cleanText($('.title_box .section').text());
    if (sectionText) {
      // "뉴스 > 사회" → ["뉴스", "사회"]
      const parts = sectionText.split('>').map((s) => s.trim());
      for (const part of parts) {
        if (part && part !== '뉴스' && !categories.includes(part)) {
          categories.push(part);
        }
      }
    }

    // 입력일 추출 (기사입력 2026-01-06 13:59 | 최종수정 2026-01-06 14:16)
    let publishedAt: string | undefined;
    const timeText = this.cleanText($('.txt_box .time').text());
    if (timeText) {
      // "기사입력 2026-01-06 13:59" 추출
      const match = timeText.match(/기사입력\s*(\d{4}-\d{2}-\d{2}\s*\d{2}:\d{2})/);
      if (match) {
        publishedAt = match[1];
      }
    }
    if (!publishedAt) {
      // 대체 선택자
      const dateElement = $('time[datetime], .date');
      if (dateElement.length > 0) {
        const datetime = dateElement.attr('datetime');
        if (datetime) {
          publishedAt = datetime;
        }
      }
    }

    // 본문 추출
    const contentParts: string[] = [];
    let author: string | undefined;

    const articleBody = $('#newsViewArea[itemprop="articleBody"], #newsViewArea, .detail');
    if (articleBody.length > 0) {
      const htmlContent = articleBody.html() || '';

      // 스크립트, 스타일, iframe, 광고 등 제거
      const cleanedHtml = htmlContent
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '')
        .replace(/<table[^>]*>[\s\S]*?<\/table>/gi, '') // 이미지 테이블 제거
        .replace(/<div[^>]*id="google_dfp[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '')
        .replace(/<div[^>]*class="[^"]*ad[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '');

      // br 태그 기준으로 분리
      const paragraphs = cleanedHtml.split(/<br\s*\/?>/gi);
      for (const para of paragraphs) {
        const text = this.cleanText(para.replace(/<[^>]*>/g, ''));

        // 기자명 추출 ([ 길기범 기자 / road@mbn.co.kr] 형식)
        if (!author) {
          const authorMatch = text.match(/\[\s*([^\]\/]+)\s*\/\s*[^\]]+@[^\]]+\]/);
          if (authorMatch) {
            author = this.cleanText(authorMatch[1]);
            continue; // 기자명은 본문에서 제외
          }
        }

        if (text && this.isValidContent(text)) {
          contentParts.push(text);
        }
      }
    }

    const content = contentParts.join('\n\n');
    if (!content) {
      throw new Error('기사 본문을 찾을 수 없습니다.');
    }

    // 이미지 추출
    const images = this.extractMbnImages($, url);

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
      text.includes('ⓒ MBN') ||
      text.includes('ⓒ 매일방송') ||
      text.includes('MBN(매일방송)') ||
      text.includes('무단전재') ||
      text.includes('재배포 금지') ||
      text.includes('저작권자') ||
      text.includes('뉴스7에서') ||
      text.includes('뉴스8에서') ||
      text.includes('자세한 내용은') ||
      text.includes('구독') ||
      text.includes('좋아요') ||
      text.includes('댓글') ||
      text.includes('공유하기') ||
      text.includes('↑') || // 이미지 캡션 화살표
      text.includes('사진=') ||
      text.includes('[사진 출처')
    ) {
      return false;
    }

    // 빈 문자열이나 공백만 있는 경우 제외
    if (text.trim().length === 0) {
      return false;
    }

    // 너무 짧은 텍스트 제외 (이미지 캡션 등)
    if (text.length < 10) {
      return false;
    }

    return true;
  }

  /**
   * MBN 전용 이미지 추출
   */
  private extractMbnImages(
    $: ReturnType<typeof this.loadHtml>,
    baseUrl: string,
  ): string[] {
    const images: string[] = [];
    const baseUrlObj = new URL(baseUrl);

    // 기사 본문 내 이미지 추출
    const imageSelectors = [
      '#newsViewArea img',
      '.detail img',
      '#article_2020 img',
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

            // 중복 제거, 아이콘/로고/광고/배너/SNS 아이콘 제외
            if (
              !images.includes(absoluteUrl) &&
              !src.includes('icon') &&
              !src.includes('logo') &&
              !src.includes('blank') &&
              !src.includes('btn_') &&
              !src.includes('button') &&
              !src.includes('ic_') &&
              !src.includes('im_fix') &&
              !src.includes('im_view') &&
              !src.includes('share') &&
              !src.includes('sns') &&
              !src.includes('facebook') &&
              !src.includes('twitter') &&
              !src.includes('kakao') &&
              !src.includes('news7') &&
              !src.includes('news8') &&
              !src.includes('banner') &&
              src.includes('/news/') // 뉴스 이미지만 포함
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
