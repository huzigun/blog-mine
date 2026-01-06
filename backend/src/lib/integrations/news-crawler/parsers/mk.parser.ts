import * as cheerio from 'cheerio';
import { NewsArticle } from '../news-crawler.interface';
import { BaseNewsParser } from './base.parser';

/**
 * 매일경제 (www.mk.co.kr) 파서
 *
 * HTML 구조:
 * - 제목: h2.news_ttl
 * - 카테고리: .cate.c_point
 * - 기자명: .author .name
 * - 이메일: .author .email
 * - 입력일: .registration dd (첫 번째)
 * - 수정일: .registration dd (두 번째)
 * - 본문: .news_cnt_detail_wrap p[refid]
 * - 중간제목: .mid_title .midtitle_text
 * - 이미지: .thumb_area img
 * - 이미지 캡션: .thum_figure_txt
 */
export class MkParser extends BaseNewsParser {
  readonly supportedDomains = ['www.mk.co.kr', 'mk.co.kr'];
  readonly sourceName = '매일경제';

  parse(html: string, url: string): NewsArticle {
    const $ = this.loadHtml(html);

    // 제목 추출
    const title = this.cleanText($('h2.news_ttl').text());
    if (!title) {
      throw new Error('기사 제목을 찾을 수 없습니다.');
    }

    // 카테고리 추출
    const category = this.cleanText($('.cate.c_point').text());

    // 기자명 추출
    let author: string | undefined;
    const authorName = this.cleanText($('.author .name').first().text());
    if (authorName) {
      author = authorName;
    }

    // 입력일 추출 (2026-01-06 14:09:34 형식)
    let publishedAt: string | undefined;
    const dateElements = $('.registration dd');
    if (dateElements.length > 0) {
      const dateText = this.cleanText($(dateElements[0]).text());
      // "2026-01-06 14:09:34" 형식에서 시:분까지만 추출
      const dateMatch = dateText.match(/(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2})/);
      if (dateMatch) {
        publishedAt = dateMatch[1];
      }
    }

    // 본문 추출
    const contentParts: string[] = [];

    // 중간제목 추출 (본문 상단 요약)
    const midTitle = $('.mid_title .midtitle_text');
    if (midTitle.length > 0) {
      let midTitleText = midTitle.html() || '';
      // <br> 태그를 줄바꿈으로 변환
      midTitleText = midTitleText.replace(/<br\s*\/?>/gi, '\n');
      // HTML 태그 제거
      midTitleText = midTitleText.replace(/<[^>]+>/g, '');
      midTitleText = this.cleanText(midTitleText);
      if (midTitleText) {
        contentParts.push(midTitleText);
      }
    }

    // 본문 문단 추출 (refid 속성이 있는 p 태그)
    $('.news_cnt_detail_wrap p[refid]').each((_, element) => {
      const text = this.cleanText($(element).text());
      if (text) {
        // 저작권/광고 문구 제거
        if (
          text.includes('ⓒ') ||
          text.includes('저작권자') ||
          text.includes('무단 전재') ||
          text.includes('▶')
        ) {
          return;
        }
        contentParts.push(text);
      }
    });

    const content = contentParts.join('\n\n');
    if (!content) {
      throw new Error('기사 본문을 찾을 수 없습니다.');
    }

    // 이미지 추출
    const images = this.extractMkImages($, url);

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
   * 매일경제 전용 이미지 추출
   * .thumb_area img
   */
  private extractMkImages($: cheerio.Root, baseUrl: string): string[] {
    const images: string[] = [];
    const baseUrlObj = new URL(baseUrl);

    // 기사 본문 내 이미지 추출
    $('.thumb_area img').each((_, element) => {
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
            !src.includes('trans_') &&
            !src.includes('icon') &&
            !src.includes('logo') &&
            !src.includes('blank') &&
            !src.includes('ad') &&
            (src.includes('pimg.mk.co.kr') || src.includes('wimg.mk.co.kr'))
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
