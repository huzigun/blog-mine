import { NewsArticle } from '../news-crawler.interface';
import { BaseNewsParser } from './base.parser';

/**
 * 전북미래교육신문 (edujb.com) 파서
 *
 * HTML 구조:
 * - 카테고리: .section-name (학교이야기 (대학교))
 * - 제목: h1.heading
 * - 부제: h2.subheading (여러 줄 가능, br로 구분)
 * - 기자명: .info-name (김경진 기자)
 * - 입력일: .breadcrumbs li (입력 2026.01.02 16:42 형식)
 * - 본문: #article-view-content-div p
 * - 이미지: .photo-layout img
 * - 이미지 캡션: .photo-layout figcaption
 * - 해시태그: .tag-group .tag
 * - 저작권: .article-copyright
 */
export class EdujbParser extends BaseNewsParser {
  readonly supportedDomains = ['edujb.com', 'www.edujb.com'];
  readonly sourceName = '전북미래교육신문';

  parse(html: string, url: string): NewsArticle {
    const $ = this.loadHtml(html);

    // 제목 추출
    const title = this.cleanText($('h1.heading').text());
    if (!title) {
      throw new Error('기사 제목을 찾을 수 없습니다.');
    }

    // 카테고리 추출
    const category = this.cleanText($('.section-name').text());

    // 기자명 추출
    let author: string | undefined;
    const authorElement = $('.info-name');
    if (authorElement.length > 0) {
      author = this.cleanText(authorElement.text());
    }

    // 입력일 추출 (입력 2026.01.02 16:42 형식)
    let publishedAt: string | undefined;
    $('.breadcrumbs li').each((_, element) => {
      const text = $(element).text();
      if (text.includes('입력')) {
        // "입력 2026.01.02 16:42" 형식에서 날짜 추출
        const dateMatch = text.match(
          /입력\s*(\d{4})\.(\d{2})\.(\d{2})\s+(\d{2}:\d{2})/,
        );
        if (dateMatch) {
          publishedAt = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]} ${dateMatch[4]}`;
        }
      }
    });

    // 본문 추출
    const contentParts: string[] = [];

    // 부제 추출 (h2.subheading)
    const subheading = $('h2.subheading');
    if (subheading.length > 0) {
      // br 태그를 개행으로 변환
      const subHtml = subheading.html() || '';
      const subtitles = subHtml.split(/<br\s*\/?>/gi);
      for (const sub of subtitles) {
        const text = this.cleanText(sub.replace(/<[^>]*>/g, ''));
        if (text) {
          contentParts.push(text);
        }
      }
    }

    // 본문 문단 추출
    $('#article-view-content-div p').each((_, element) => {
      const text = this.cleanText($(element).text());
      if (text) {
        // 빈 공백만 있는 문단 제외
        if (text === '&nbsp;' || text === '\u00a0') {
          return;
        }

        // 저작권/광고 문구 제거
        if (
          text.includes('저작권자') ||
          text.includes('무단전재') ||
          text.includes('재배포') ||
          text.includes('AI학습') ||
          text.includes('ⓒ') ||
          text.includes('Copyright')
        ) {
          return;
        }

        contentParts.push(text);
      }
    });

    // 마지막 줄이 기자 이름만 있으면 제거
    if (contentParts.length > 0) {
      const lastLine = contentParts[contentParts.length - 1];
      if (lastLine.match(/^[가-힣]+\s*(기자|특파원)$/)) {
        contentParts.pop();
      }
    }

    const content = contentParts.join('\n\n');
    if (!content) {
      throw new Error('기사 본문을 찾을 수 없습니다.');
    }

    // 이미지 추출
    const images = this.extractEdujbImages($, url);

    // 태그 추출 (해시태그 + 카테고리)
    const tags: string[] = [];
    $('.tag-group .tag').each((_, element) => {
      const tag = this.cleanText($(element).text());
      if (tag) {
        // # 제거
        tags.push(tag.replace(/^#/, ''));
      }
    });
    // 카테고리도 태그에 추가
    if (category && !tags.includes(category)) {
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
   * 전북미래교육신문 전용 이미지 추출
   * .photo-layout img
   */
  private extractEdujbImages(
    $: ReturnType<typeof this.loadHtml>,
    baseUrl: string,
  ): string[] {
    const images: string[] = [];
    const baseUrlObj = new URL(baseUrl);

    // 기사 본문 내 이미지 추출
    $('.photo-layout img').each((_, element) => {
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

          // 중복 제거, 썸네일/아이콘/광고/배너 제외
          if (
            !images.includes(absoluteUrl) &&
            !src.includes('icon') &&
            !src.includes('logo') &&
            !src.includes('blank') &&
            !src.includes('ad') &&
            !src.includes('banner') &&
            !src.includes('bannerpop') // 배너/팝업 이미지 제외
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
