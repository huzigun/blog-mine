import { NewsArticle } from '../news-crawler.interface';
import { BaseNewsParser } from './base.parser';

/**
 * 연합뉴스TV (www.yonhapnewstv.co.kr) 파서
 *
 * HTML 구조:
 * - 카테고리: .article-inheader h3 a
 * - 제목: .article-inheader h2
 * - 기자명: .reporter-name span
 * - 입력일: .reporter-info span (입력 2026-01-06 16:21:55 형식)
 * - 본문: .article-body-text (br br로 문단 구분)
 * - 이미지: .ynaobject.ynaimage img.yna_img
 * - 이미지 캡션: .ynaobject.ynaimage .yna_caption
 * - 해시태그: .article-keyword li a
 * - 저작권: ⓒ연합뉴스TV
 */
export class YonhapnewstvParser extends BaseNewsParser {
  readonly supportedDomains = ['www.yonhapnewstv.co.kr', 'yonhapnewstv.co.kr'];
  readonly sourceName = '연합뉴스TV';

  parse(html: string, url: string): NewsArticle {
    const $ = this.loadHtml(html);

    // 제목 추출
    const title = this.cleanText($('.article-inheader h2').text());
    if (!title) {
      throw new Error('기사 제목을 찾을 수 없습니다.');
    }

    // 카테고리 추출
    const category = this.cleanText($('.article-inheader h3 a').text());

    // 기자명 추출
    let author: string | undefined;
    const authorElement = $('.reporter-name span');
    if (authorElement.length > 0) {
      author = this.cleanText(authorElement.text());
    }

    // 입력일 추출 (입력 2026-01-06 16:21:55 형식)
    let publishedAt: string | undefined;
    $('.reporter-info span').each((_, element) => {
      const text = $(element).text();
      if (text.includes('입력')) {
        // "입력 2026-01-06 16:21:55" 형식에서 날짜 추출
        const dateMatch = text.match(
          /입력\s*(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})/,
        );
        if (dateMatch) {
          publishedAt = `${dateMatch[1]} ${dateMatch[2]}`;
        }
      }
    });

    // 본문 추출
    const contentParts: string[] = [];

    // 본문 텍스트 추출 (.article-body-text)
    const bodyElement = $('.article-body-text');
    if (bodyElement.length > 0) {
      // HTML에서 br br 태그를 기준으로 문단 분리
      const bodyHtml = bodyElement.html() || '';
      // <br><br>로 문단 구분
      const paragraphs = bodyHtml.split(/<br\s*\/?>\s*<br\s*\/?>/gi);

      for (const para of paragraphs) {
        // HTML 태그 제거하고 텍스트만 추출
        const text = this.cleanText(para.replace(/<[^>]*>/g, ''));
        if (text) {
          // 저작권/광고/제보 문구 제거
          if (
            text.includes('ⓒ연합뉴스TV') ||
            text.includes('ⓒ') ||
            text.includes('저작권자') ||
            text.includes('무단 전재') ||
            text.includes('연합뉴스TV 기사문의 및 제보') ||
            text.includes('당신이 담은 순간이 뉴스입니다') ||
            text.includes('Copyright')
          ) {
            continue;
          }

          // 기자 이메일 라인 제거 (예: zwoonie@yna.co.kr)
          if (text.match(/@yna\.co\.kr/)) {
            continue;
          }

          contentParts.push(text);
        }
      }
    }

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
    const images = this.extractYonhapnewstvImages($, url);

    // 태그 추출 (해시태그 + 카테고리)
    const tags: string[] = [];
    $('.article-keyword li a').each((_, element) => {
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
   * 연합뉴스TV 전용 이미지 추출
   * .ynaobject.ynaimage img.yna_img
   */
  private extractYonhapnewstvImages(
    $: ReturnType<typeof this.loadHtml>,
    baseUrl: string,
  ): string[] {
    const images: string[] = [];
    const baseUrlObj = new URL(baseUrl);

    // 기사 본문 내 이미지 추출
    $('.ynaobject.ynaimage img.yna_img').each((_, element) => {
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
            !src.includes('banner')
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
