import * as cheerio from 'cheerio';
import { NewsArticle } from '../news-crawler.interface';
import { BaseNewsParser } from './base.parser';

/**
 * 농민신문 (www.nongmin.com) 파서
 *
 * HTML 구조:
 * - 제목: .view_tit pre
 * - 부제: .news_sub_tit pre strong
 * - 기자명: .news_hawk .teb_btn li#writeName 또는 본문 마지막 p
 * - 입력일: .view_data .inr pre (입력 : 2026-01-05 18:47)
 * - 수정일: .view_data .inr pre (수정 : 2026-01-06 08:00)
 * - 본문: .news_txt.ck-content p
 * - 이미지: .news_txt.ck-content figure.image img
 * - 카테고리: input.siteSectionName[value]
 */
export class NongminParser extends BaseNewsParser {
  readonly supportedDomains = ['www.nongmin.com', 'nongmin.com'];
  readonly sourceName = '농민신문';

  parse(html: string, url: string): NewsArticle {
    const $ = this.loadHtml(html);

    // 제목 추출
    const title = this.cleanText($('.view_tit pre').text());
    if (!title) {
      throw new Error('기사 제목을 찾을 수 없습니다.');
    }

    // 부제목 추출 (선택적)
    let subtitle: string | undefined;
    const subtitleElement = $('.news_sub_tit pre strong');
    if (subtitleElement.length > 0) {
      subtitle = this.cleanText(subtitleElement.text());
    }

    // 기자명 추출
    let author: string | undefined;
    const authorElement = $('.news_hawk .teb_btn li#writeName');
    if (authorElement.length > 0) {
      author = this.cleanText(authorElement.text());
    }

    // 입력일 추출
    let publishedAt: string | undefined;
    $('.view_data .inr pre').each((_, element) => {
      const text = this.cleanText($(element).text());
      if (text.startsWith('입력 :')) {
        publishedAt = text.replace('입력 :', '').trim();
        return false; // break
      }
    });

    // hidden input에서 날짜 추출 (백업)
    if (!publishedAt) {
      const releaseDate = $('input.siteReleaseDate').val();
      if (releaseDate && typeof releaseDate === 'string') {
        publishedAt = releaseDate;
      }
    }

    // 본문 추출
    const $article = $('.news_txt.ck-content').clone();
    if ($article.length === 0) {
      throw new Error('기사 본문을 찾을 수 없습니다.');
    }

    // 불필요한 요소 제거
    $article.find('script').remove();
    $article.find('style').remove();
    $article.find('iframe').remove();
    $article.find('figure.image').remove(); // 이미지 영역 (별도 추출)
    $article.find('div').remove(); // 광고 div들

    // 본문 정리
    const contentParts: string[] = [];

    $article.find('p').each((_, element) => {
      let text = this.cleanText($(element).text());
      if (text && text.length > 0) {
        // 기자명만 있는 마지막 줄 처리
        const authorMatch = text.match(/^([가-힣]+)\s*(기자|특파원)$/);
        if (authorMatch) {
          if (!author) {
            author = text;
          }
          return; // skip
        }

        // 저작권/광고 문구 제거
        if (
          text.includes('저작권자') ||
          text.includes('무단 전재') ||
          text.includes('ⓒ') ||
          text.includes('▶')
        ) {
          return;
        }

        contentParts.push(text);
      }
    });

    // 부제목이 있으면 본문 앞에 추가
    let content = contentParts.join('\n\n');
    if (subtitle && !content.includes(subtitle)) {
      content = subtitle + '\n\n' + content;
    }

    if (!content) {
      // hidden input에서 본문 추출 (백업)
      const hiddenContent = $('input.siteViewContent').val();
      if (hiddenContent && typeof hiddenContent === 'string') {
        content = hiddenContent;
      }
    }

    if (!content) {
      throw new Error('기사 본문을 찾을 수 없습니다.');
    }

    // 이미지 추출
    const images = this.extractNongminImages($, url);

    // 카테고리 추출 (태그로 활용)
    const tags: string[] = [];
    const sectionName = $('input.siteSectionName').val();
    if (sectionName && typeof sectionName === 'string') {
      tags.push(sectionName);
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
   * 농민신문 전용 이미지 추출
   * .news_txt.ck-content figure.image img
   */
  private extractNongminImages($: cheerio.Root, baseUrl: string): string[] {
    const images: string[] = [];
    const baseUrlObj = new URL(baseUrl);

    // 기사 본문 내 이미지 추출
    $('.news_txt.ck-content figure.image img').each((_, element) => {
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

          // 썸네일, 아이콘, 광고, 배너 제외
          if (
            !images.includes(absoluteUrl) &&
            !src.includes('thumb') &&
            !src.includes('icon') &&
            !src.includes('logo') &&
            !src.includes('blank') &&
            !src.includes('banner') &&
            !src.includes('resources') &&
            src.includes('content/image')
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
