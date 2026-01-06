import { NewsArticle } from '../news-crawler.interface';
import { BaseNewsParser } from './base.parser';

/**
 * 채널A (ichannela.com) 파서
 *
 * HTML 구조:
 * - 카테고리: .public .cata (정치, 경제 등)
 * - 제목: .news_article_title h2 .title
 * - 입력일: .public .date (2026-01-06)
 * - 입력시간: .public .time (16:46)
 * - 본문: .news_page_txt (텍스트 노드와 br 태그로 구분)
 * - 저작권: Copyright Ⓒ 채널A. All rights reserved.
 * - 비고: 동영상 뉴스 콘텐츠 포함 가능
 */
export class ChannelaParser extends BaseNewsParser {
  readonly supportedDomains = ['ichannela.com', 'www.ichannela.com'];
  readonly sourceName = '채널A';

  parse(html: string, url: string): NewsArticle {
    const $ = this.loadHtml(html);

    // 제목 추출
    const title = this.cleanText($('.news_article_title h2 .title').text());
    if (!title) {
      throw new Error('기사 제목을 찾을 수 없습니다.');
    }

    // 카테고리 추출
    const category = this.cleanText($('.public .cata').text());

    // 입력일시 추출 (날짜 + 시간)
    let publishedAt: string | undefined;
    const dateText = this.cleanText($('.public .date').text());
    const timeText = this.cleanText($('.public .time').text());
    if (dateText && timeText) {
      // "2026-01-06" + "16:46" 형식
      publishedAt = `${dateText} ${timeText}`;
    } else if (dateText) {
      publishedAt = dateText;
    }

    // 본문 추출
    const contentParts: string[] = [];

    // .news_page_txt 내의 텍스트 추출
    const newsPageTxt = $('.news_page_txt');
    if (newsPageTxt.length > 0) {
      // HTML을 br 태그로 분리하여 문단 추출
      const htmlContent = newsPageTxt.html() || '';

      // script, style, iframe, div.subscribe 등 제거
      const cleanedHtml = htmlContent
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '')
        .replace(/<div[^>]*class="[^"]*subscribe[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '')
        .replace(/<div[^>]*class="[^"]*ad[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '');

      // br 태그를 기준으로 분리
      const paragraphs = cleanedHtml.split(/<br\s*\/?>/gi);

      for (const para of paragraphs) {
        // HTML 태그 제거 후 텍스트 정리
        const text = this.cleanText(para.replace(/<[^>]*>/g, ''));

        if (text) {
          // 저작권/광고 문구 제거
          if (
            text.includes('Copyright') ||
            text.includes('Ⓒ') ||
            text.includes('채널A') && text.includes('reserved') ||
            text.includes('저작권자') ||
            text.includes('무단전재') ||
            text.includes('재배포') ||
            text.includes('구독') ||
            text.includes('좋아요') ||
            text.includes('알림설정')
          ) {
            continue;
          }

          // 빈 문자열이나 공백만 있는 경우 제외
          if (text.trim().length === 0) {
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
    const images = this.extractChannelaImages($, url);

    // 태그 (카테고리 포함)
    const tags: string[] = [];
    if (category) {
      tags.push(category);
    }

    return {
      title,
      content,
      author: undefined, // 채널A HTML에서 기자명 정보 없음
      publishedAt,
      images: images.length > 0 ? images : undefined,
      tags: tags.length > 0 ? tags : undefined,
      sourceUrl: url,
      sourceName: this.sourceName,
    };
  }

  /**
   * 채널A 전용 이미지 추출
   * .news_page_txt img, .news_article_title img
   */
  private extractChannelaImages(
    $: ReturnType<typeof this.loadHtml>,
    baseUrl: string,
  ): string[] {
    const images: string[] = [];
    const baseUrlObj = new URL(baseUrl);

    // 기사 본문 및 타이틀 영역 이미지 추출
    $('.news_page_txt img, .news_article_title img').each((_, element) => {
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
            !src.includes('btn_') &&
            !src.includes('button')
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
