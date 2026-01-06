import * as cheerio from 'cheerio';
import { NewsArticle } from '../news-crawler.interface';
import { BaseNewsParser } from './base.parser';

/**
 * 서울신문 (www.seoul.co.kr) 파서
 *
 * HTML 구조:
 * - 제목: h1.h38
 * - 카테고리: .breadcrumb ol li a
 * - 기자명: .reporterInfo .name a + "기자"
 * - 입력일: .dateInfo .writeInfo (2026-01-06 13:23 형식)
 * - 수정일: .dateInfo .updateInfo
 * - 부제: h2.stit
 * - 본문: .viewContent (br 태그로 문단 구분)
 * - 이미지: .v_photoarea figure picture img.viewImage
 * - 이미지 캡션: .v_photoarea figcaption.v_photo_caption
 */
export class SeoulParser extends BaseNewsParser {
  readonly supportedDomains = ['www.seoul.co.kr', 'seoul.co.kr'];
  readonly sourceName = '서울신문';

  parse(html: string, url: string): NewsArticle {
    const $ = this.loadHtml(html);

    // 제목 추출
    const title = this.cleanText($('h1.h38').text());
    if (!title) {
      throw new Error('기사 제목을 찾을 수 없습니다.');
    }

    // 카테고리 추출
    const categories: string[] = [];
    $('.breadcrumb ol li a').each((_, element) => {
      const cat = this.cleanText($(element).text());
      if (cat && cat !== '홈') {
        categories.push(cat);
      }
    });

    // 기자명 추출
    let author: string | undefined;
    const authorElement = $('.reporterInfo .name a');
    if (authorElement.length > 0) {
      const authorName = this.cleanText(authorElement.text());
      if (authorName) {
        author = `${authorName} 기자`;
      }
    }

    // 입력일 추출 (2026-01-06 13:23 형식)
    let publishedAt: string | undefined;
    const dateElement = $('.dateInfo .writeInfo');
    if (dateElement.length > 0) {
      const dateText = this.cleanText(dateElement.text());
      // "2026-01-06 13:23" 형식 추출
      const dateMatch = dateText.match(/(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2})/);
      if (dateMatch) {
        publishedAt = dateMatch[1];
      }
    }

    // 본문 추출
    const contentParts: string[] = [];

    // 부제 추출
    const subtitle = this.cleanText($('h2.stit').text());
    if (subtitle) {
      contentParts.push(subtitle);
    }

    // 본문 추출 (.viewContent 내 텍스트)
    const viewContent = $('.viewContent');
    if (viewContent.length > 0) {
      // HTML 내용 가져오기
      let contentHtml = viewContent.html() || '';

      // 이미지 영역 제거
      contentHtml = contentHtml.replace(
        /<div class="v_photoarea[\s\S]*?<\/div>/gi,
        '',
      );
      contentHtml = contentHtml.replace(/<figure[\s\S]*?<\/figure>/gi, '');

      // 저작권/광고 영역 제거
      contentHtml = contentHtml.replace(
        /<p class="articleCopyright[\s\S]*?<\/p>/gi,
        '',
      );
      contentHtml = contentHtml.replace(
        /<div class="byline[\s\S]*?<\/div>/gi,
        '',
      );

      // <br><br>을 문단 구분자로 변환
      contentHtml = contentHtml.replace(/<br\s*\/?>\s*<br\s*\/?>/gi, '\n\n');
      // 단일 <br>을 공백으로 변환
      contentHtml = contentHtml.replace(/<br\s*\/?>/gi, ' ');
      // 나머지 HTML 태그 제거
      contentHtml = contentHtml.replace(/<[^>]+>/g, '');

      // 문단 분리 및 정리
      const paragraphs = contentHtml.split('\n\n');
      for (const para of paragraphs) {
        const text = this.cleanText(para);
        if (text) {
          // 저작권/광고 문구 제거
          if (
            text.includes('ⓒ') ||
            text.includes('저작권자') ||
            text.includes('무단 전재') ||
            text.includes('▶') ||
            text.includes('서울신문') ||
            text.includes('seoul.co.kr')
          ) {
            // 기자 이름만 있는 줄은 제외
            if (text.match(/^[가-힣]+\s*(기자|특파원)$/)) {
              continue;
            }
            // 저작권 문구는 제외
            if (
              text.includes('저작권') ||
              text.includes('무단') ||
              text.includes('▶')
            ) {
              continue;
            }
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
    const images = this.extractSeoulImages($, url);

    // 태그 추출 (카테고리 활용)
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
   * 서울신문 전용 이미지 추출
   * .v_photoarea figure picture img.viewImage
   */
  private extractSeoulImages($: cheerio.Root, baseUrl: string): string[] {
    const images: string[] = [];
    const baseUrlObj = new URL(baseUrl);

    // 기사 본문 내 이미지 추출
    $('.v_photoarea figure picture img.viewImage').each((_, element) => {
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
            (src.includes('seoul.co.kr') || src.includes('pds.seoul.co.kr'))
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
