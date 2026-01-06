import { NewsArticle } from '../news-crawler.interface';
import { BaseNewsParser } from './base.parser';

/**
 * 아리랑뉴스 (www.arirang.com) 파서
 *
 * HTML 구조:
 * - 카테고리: .newsView_section_title-wrap .label
 * - 제목: .newsView_section_title-wrap .title div
 * - 입력일: .date .written .time-fs-fixed (2026-01-06 12:00:00 KST 형식)
 * - 본문: .newsView_section_content p.text
 * - 이미지: .newsView_section_content img.printImg
 * - 기자명: .reporterCard .content_name a
 */
export class ArirangParser extends BaseNewsParser {
  readonly supportedDomains = ['www.arirang.com', 'arirang.com'];
  readonly sourceName = '아리랑뉴스';

  parse(html: string, url: string): NewsArticle {
    const $ = this.loadHtml(html);

    // 제목 추출
    const title = this.cleanText(
      $('.newsView_section_title-wrap .title div').text(),
    );
    if (!title) {
      throw new Error('기사 제목을 찾을 수 없습니다.');
    }

    // 카테고리 추출
    const category = this.cleanText(
      $('.newsView_section_title-wrap .label').text(),
    );

    // 기자명 추출
    let author: string | undefined;
    const authorElement = $('.reporterCard .content_name a');
    if (authorElement.length > 0) {
      author = this.cleanText(authorElement.text());
    }

    // 입력일 추출 (2026-01-06 12:00:00 KST 형식)
    let publishedAt: string | undefined;
    const dateElement = $('.date .written .time-fs-fixed');
    if (dateElement.length > 0) {
      const dateText = this.cleanText(dateElement.text());
      // "2026-01-06 12:00:00 KST" 형식에서 날짜/시간 추출
      const dateMatch = dateText.match(/(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2})/);
      if (dateMatch) {
        publishedAt = dateMatch[1];
      }
    }

    // 본문 추출
    const contentParts: string[] = [];

    // 본문 텍스트 추출
    const textElement = $('.newsView_section_content p.text');
    if (textElement.length > 0) {
      const textContent = textElement.text();
      // 줄바꿈으로 문단 분리
      const paragraphs = textContent.split(/\n+/);

      for (const para of paragraphs) {
        const text = this.cleanText(para);
        if (text) {
          // 기자 서명 라인 제거 (예: "Yoon Jung-min, Arirang News, Beijing.")
          if (text.match(/,\s*Arirang\s*News,/i)) {
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
    const images = this.extractArirangImages($, url);

    // 태그 추출 (카테고리 활용)
    const tags: string[] = [];
    if (category) {
      tags.push(category);
    }

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
   * 아리랑뉴스 전용 이미지 추출
   * .newsView_section_content img.printImg
   */
  private extractArirangImages(
    $: ReturnType<typeof this.loadHtml>,
    baseUrl: string,
  ): string[] {
    const images: string[] = [];
    const baseUrlObj = new URL(baseUrl);

    // 기사 본문 내 이미지 추출
    $('.newsView_section_content img.printImg').each((_, element) => {
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

          // 중복 제거, 썸네일/아이콘/광고/플레이스홀더 제외
          if (
            !images.includes(absoluteUrl) &&
            !src.includes('icon') &&
            !src.includes('logo') &&
            !src.includes('blank') &&
            !src.includes('ad') &&
            (src.includes('arirang.com') || src.includes('img.arirang.com'))
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
