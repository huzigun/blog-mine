import { NewsArticle } from '../news-crawler.interface';
import { BaseNewsParser } from './base.parser';

/**
 * 한겨레 (www.hani.co.kr) 파서
 *
 * HTML 구조:
 * - 카테고리: .ArticleDetailView_breadcrumb___UwRC a (정치 > 정치일반)
 * - 제목: h3.ArticleDetailView_title__9kRU_
 * - 부제: h4.ArticleDetailView_subtitle__x6jcS (여러 줄 가능, br로 구분)
 * - 기자명: .ArticleDetailView_reporterLink__UzTVy (최하얀) + "기자"
 * - 등록일: .ArticleDetailView_dateListItem__mRc3d:contains("등록") span (2026-01-06 15:45)
 * - 수정일: .ArticleDetailView_dateListItem__mRc3d:contains("수정") span (2026-01-06 17:19)
 * - 본문: .article-text p.text
 * - 이미지: .ArticleDetailContent_imageWrap__o8GzH picture img
 * - 이미지 캡션: .ArticleDetailContent_figcaption__Aq2sU
 * - 저작권: 한겨레
 */
export class HaniParser extends BaseNewsParser {
  readonly supportedDomains = ['www.hani.co.kr', 'hani.co.kr'];
  readonly sourceName = '한겨레';

  parse(html: string, url: string): NewsArticle {
    const $ = this.loadHtml(html);

    // 제목 추출
    const title = this.cleanText(
      $('h3[class*="ArticleDetailView_title"]').text(),
    );
    if (!title) {
      throw new Error('기사 제목을 찾을 수 없습니다.');
    }

    // 카테고리 추출
    const categories: string[] = [];
    $('[class*="ArticleDetailView_breadcrumb"] a').each((_, element) => {
      const cat = this.cleanText($(element).text());
      if (cat) {
        categories.push(cat);
      }
    });

    // 기자명 추출
    let author: string | undefined;
    const authorElement = $('[class*="ArticleDetailView_reporterLink"]');
    if (authorElement.length > 0) {
      const authorName = this.cleanText(authorElement.text());
      if (authorName) {
        author = `${authorName} 기자`;
      }
    }

    // 등록일 추출 (등록 2026-01-06 15:45 형식)
    let publishedAt: string | undefined;
    $('[class*="ArticleDetailView_dateListItem"]').each((_, element) => {
      const text = $(element).text();
      if (text.includes('등록')) {
        const dateSpan = $(element).find('span').text();
        if (dateSpan) {
          // "2026-01-06 15:45" 형식 그대로 사용
          publishedAt = this.cleanText(dateSpan);
        }
      }
    });

    // 본문 추출
    const contentParts: string[] = [];

    // 부제 추출 (h4.subtitle)
    const subtitle = $('h4[class*="ArticleDetailView_subtitle"]');
    if (subtitle.length > 0) {
      const subHtml = subtitle.html() || '';
      const subtitles = subHtml.split(/<br\s*\/?>/gi);
      for (const sub of subtitles) {
        const text = this.cleanText(sub.replace(/<[^>]*>/g, ''));
        if (text) {
          contentParts.push(text);
        }
      }
    }

    // 본문 문단 추출
    $('.article-text p.text').each((_, element) => {
      const text = this.cleanText($(element).text());
      if (text) {
        // 저작권/광고 문구 제거
        if (
          text.includes('ⓒ') ||
          text.includes('한겨레') && text.includes('저작권') ||
          text.includes('무단전재') ||
          text.includes('재배포') ||
          text.includes('Copyright')
        ) {
          return;
        }

        // 기자 이메일 라인 제거 (마지막 문단)
        if (text.match(/@hani\.co\.kr/)) {
          // 기자명만 추출하여 저장하고 본문에서 제외
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
    const images = this.extractHaniImages($, url);

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
   * 한겨레 전용 이미지 추출
   * .ArticleDetailContent_imageWrap picture img
   */
  private extractHaniImages(
    $: ReturnType<typeof this.loadHtml>,
    baseUrl: string,
  ): string[] {
    const images: string[] = [];
    const baseUrlObj = new URL(baseUrl);

    // 기사 본문 내 이미지 추출 (picture 태그 내 img)
    $('[class*="ArticleDetailContent_imageWrap"] picture img').each(
      (_, element) => {
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
              !src.includes('audio') &&
              !src.includes('_next/static/media')
            ) {
              images.push(absoluteUrl);
            }
          } catch {
            // URL 파싱 실패 시 무시
          }
        }
      },
    );

    // webp 이미지도 추출 시도 (source srcset에서)
    $('[class*="ArticleDetailContent_imageWrap"] picture source').each(
      (_, element) => {
        const srcset = $(element).attr('srcset');
        if (srcset && srcset.includes('.webp')) {
          try {
            let absoluteUrl = srcset;
            if (srcset.startsWith('//')) {
              absoluteUrl = 'https:' + srcset;
            } else if (!srcset.startsWith('http')) {
              absoluteUrl = new URL(srcset, baseUrlObj.origin).href;
            }

            if (
              !images.includes(absoluteUrl) &&
              !srcset.includes('icon') &&
              !srcset.includes('logo')
            ) {
              // webp를 우선순위로 배열 앞에 추가
              images.unshift(absoluteUrl);
            }
          } catch {
            // URL 파싱 실패 시 무시
          }
        }
      },
    );

    return images;
  }
}
