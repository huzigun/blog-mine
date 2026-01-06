import { NewsArticle } from '../news-crawler.interface';
import { BaseNewsParser } from './base.parser';

/**
 * 연합뉴스 (www.yna.co.kr) 파서
 *
 * HTML 구조:
 * - 카테고리: .nav-path01 li a (경제, 정치, 사회 등)
 * - 제목: h1.tit01
 * - 부제: .tit-sub h2.tit01 (여러 개 가능)
 * - 기자명: .txt-con .tit-name a + "기자"
 * - 송고일: .update-time .txt-time01 (송고2026-01-06 16:46 형식) 또는 data-published-time 속성
 * - 본문: .story-news.article > p (aside 제외)
 * - 이미지: .image-zone01 img (photo-group, graphic-group)
 * - 이미지 캡션: .image-zone01 figcaption .txt-desc
 * - 해시태그: .keyword-zone .list01 a
 * - 저작권: .txt-copyright
 */
export class YnaParser extends BaseNewsParser {
  readonly supportedDomains = ['www.yna.co.kr', 'yna.co.kr'];
  readonly sourceName = '연합뉴스';

  parse(html: string, url: string): NewsArticle {
    const $ = this.loadHtml(html);

    // 제목 추출
    const title = this.cleanText($('h1.tit01').text());
    if (!title) {
      throw new Error('기사 제목을 찾을 수 없습니다.');
    }

    // 카테고리 추출
    const categories: string[] = [];
    $('.nav-path01 li a').each((_, element) => {
      const cat = this.cleanText($(element).text());
      if (cat) {
        categories.push(cat);
      }
    });

    // 기자명 추출
    let author: string | undefined;
    const authorElement = $('.txt-con .tit-name a');
    if (authorElement.length > 0) {
      const authorName = this.cleanText(authorElement.text());
      if (authorName) {
        author = `${authorName} 기자`;
      }
    }

    // 송고일 추출 (data-published-time 속성 또는 텍스트에서)
    let publishedAt: string | undefined;
    const updateTime = $('.update-time');
    if (updateTime.length > 0) {
      // data-published-time 속성에서 추출 (2026-01-06 16:46 형식)
      const dataTime = updateTime.attr('data-published-time');
      if (dataTime) {
        publishedAt = dataTime;
      } else {
        // 텍스트에서 추출 (송고2026-01-06 16:46 형식)
        const timeText = this.cleanText($('.txt-time01').text());
        const dateMatch = timeText.match(/(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2})/);
        if (dateMatch) {
          publishedAt = dateMatch[1];
        }
      }
    }

    // 본문 추출
    const contentParts: string[] = [];

    // 부제 추출 (여러 개 가능)
    $('.tit-sub h2.tit01').each((_, element) => {
      const subtitle = this.cleanText($(element).text());
      if (subtitle) {
        contentParts.push(subtitle);
      }
    });

    // 본문 문단 추출 (.story-news.article > p)
    $('.story-news.article > p').each((_, element) => {
      const $el = $(element);

      // 저작권 문구 클래스 제외
      if ($el.hasClass('txt-copyright')) {
        return;
      }

      const text = this.cleanText($el.text());
      if (text) {
        // 저작권/광고 문구 제거
        if (
          text.includes('ⓒ') ||
          text.includes('저작권자') ||
          text.includes('무단 전재') ||
          text.includes('연합뉴스') ||
          text.includes('yna.co.kr') ||
          text.includes('Copyright') ||
          text.includes('제보는 카카오톡')
        ) {
          return;
        }

        // 기자 이메일 라인 제거 (예: hwangch@yna.co.kr)
        if (text.match(/@yna\.co\.kr/)) {
          return;
        }

        // 위치 정보 제거 (예: "(서울=연합뉴스)")
        let cleanedText = text.replace(/\([가-힣]+=연합뉴스\)\s*/g, '');
        // 기자명 제거 (예: "황철환 기자 =")
        cleanedText = cleanedText.replace(/[가-힣]+\s*기자\s*=\s*/g, '');

        if (cleanedText.trim()) {
          contentParts.push(cleanedText.trim());
        }
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
    const images = this.extractYnaImages($, url);

    // 태그 추출 (해시태그 + 카테고리)
    const tags: string[] = [];
    $('.keyword-zone .list01 a').each((_, element) => {
      const tag = this.cleanText($(element).text());
      if (tag) {
        // # 제거
        tags.push(tag.replace(/^#/, ''));
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
   * 연합뉴스 전용 이미지 추출
   * .image-zone01 img (photo-group, graphic-group)
   */
  private extractYnaImages(
    $: ReturnType<typeof this.loadHtml>,
    baseUrl: string,
  ): string[] {
    const images: string[] = [];
    const baseUrlObj = new URL(baseUrl);

    // 기사 본문 내 이미지 추출 (photo-group, graphic-group)
    $('.comp-box .image-zone01 img').each((_, element) => {
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
            !src.includes('banner') &&
            !src.includes('_T2.') && // 썸네일 제외
            (src.includes('yna.co.kr') || src.includes('img'))
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
