import { NewsArticle } from '../news-crawler.interface';
import { BaseNewsParser } from './base.parser';

/**
 * 중앙일보 (www.joongang.co.kr) 파서
 *
 * HTML 구조:
 * - 카테고리: .subhead a (사회, 교육 등)
 * - 제목: h1.headline
 * - 소제목: .ab_sub_heading h2 (중간 소제목)
 * - 기자명: .byline a (이후연 기자)
 * - 입력일: .datetime time[itemprop="datePublished"] datetime 속성
 * - 수정일: .datetime time[itemprop="dateModified"] datetime 속성
 * - 본문: #article_body p[data-divno]
 * - 이미지: .ab_photo img
 * - 이미지 캡션: .ab_photo .caption
 * - 해시태그: .tag_wrap .tag (# 계약학과, # 김병기 등)
 * - 바이라인: .ab_byline p (기자 이름 이메일)
 * - 저작권: ⓒ중앙일보
 */
export class JoongangParser extends BaseNewsParser {
  readonly supportedDomains = ['www.joongang.co.kr', 'joongang.co.kr'];
  readonly sourceName = '중앙일보';

  parse(html: string, url: string): NewsArticle {
    const $ = this.loadHtml(html);

    // 제목 추출
    const title = this.cleanText($('h1.headline').text());
    if (!title) {
      throw new Error('기사 제목을 찾을 수 없습니다.');
    }

    // 카테고리 추출
    const categories: string[] = [];
    $('.subhead a').each((_, element) => {
      const cat = this.cleanText($(element).text());
      if (cat) {
        categories.push(cat);
      }
    });

    // 기자명 추출
    let author: string | undefined;
    const authorElement = $('.byline a');
    if (authorElement.length > 0) {
      const authorText = this.cleanText(authorElement.text());
      if (authorText) {
        // "이후연 기자" 형태로 정리
        author = authorText.includes('기자')
          ? authorText
          : `${authorText} 기자`;
      }
    }

    // 입력일 추출 (datetime 속성에서)
    let publishedAt: string | undefined;
    const dateTimeElement = $(
      '.datetime time[itemprop="datePublished"]',
    );
    if (dateTimeElement.length > 0) {
      const datetime = dateTimeElement.attr('datetime');
      if (datetime) {
        // "2026-01-06T16:27:16+09:00" 형식에서 날짜 추출
        const dateMatch = datetime.match(
          /(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/,
        );
        if (dateMatch) {
          publishedAt = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]} ${dateMatch[4]}:${dateMatch[5]}`;
        }
      }
    }

    // 본문 추출
    const contentParts: string[] = [];

    // 본문 문단 추출 (p[data-divno] 사용)
    $('#article_body p[data-divno]').each((_, element) => {
      const text = this.cleanText($(element).text());
      if (text) {
        // 저작권/광고 문구 제거
        if (
          text.includes('ⓒ중앙일보') ||
          text.includes('ⓒ') ||
          text.includes('저작권자') ||
          text.includes('무단 전재') ||
          text.includes('joongang.co.kr') ||
          text.includes('Copyright')
        ) {
          return;
        }

        // 기자 이메일 라인 제거
        if (text.match(/@joongang\.co\.kr/)) {
          return;
        }

        contentParts.push(text);
      }
    });

    // 중간 소제목도 추출 (.ab_sub_heading h2)
    // 소제목은 본문 흐름 안에 있으므로 별도 처리하지 않음
    // (이미 p[data-divno] 다음에 위치하므로 자연스럽게 순서 유지)

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
    const images = this.extractJoongangImages($, url);

    // 태그 추출 (해시태그 + 카테고리)
    const tags: string[] = [];
    $('.tag_wrap .tag').each((_, element) => {
      const tag = this.cleanText($(element).text());
      if (tag) {
        // # 제거
        tags.push(tag.replace(/^#\s*/, ''));
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
   * 중앙일보 전용 이미지 추출
   * .ab_photo img
   */
  private extractJoongangImages(
    $: ReturnType<typeof this.loadHtml>,
    baseUrl: string,
  ): string[] {
    const images: string[] = [];
    const baseUrlObj = new URL(baseUrl);

    // 기사 본문 내 이미지 추출
    $('.ab_photo img').each((_, element) => {
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
            !src.includes('ad_') &&
            !src.includes('banner') &&
            !src.includes('placeholder') &&
            !src.includes('/_ir_') // 썸네일 리사이즈 이미지 제외
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
