import * as cheerio from 'cheerio';
import { NewsArticle } from '../news-crawler.interface';
import { BaseNewsParser } from './base.parser';

/**
 * 네이버뉴스 (n.news.naver.com) 파서
 *
 * HTML 구조:
 * - 제목: #title_area span 또는 .media_end_head_headline span
 * - 본문: article#dic_area (텍스트 노드, <br> 구분)
 * - 기자명: .byline_s (이름 기자 email@domain.com)
 * - 입력일: ._ARTICLE_DATE_TIME[data-date-time] 속성
 * - 이미지: #dic_area img
 * - 원본 출처: .media_end_head_top_logo_img[alt]
 * - 카테고리: .media_end_categorize_item
 */
export class NaverParser extends BaseNewsParser {
  readonly supportedDomains = ['n.news.naver.com'];
  readonly sourceName = '네이버뉴스';

  parse(html: string, url: string): NewsArticle {
    const $ = this.loadHtml(html);

    // 제목 추출
    let title = this.cleanText($('#title_area span').text());
    if (!title) {
      title = this.cleanText($('.media_end_head_headline span').text());
    }
    if (!title) {
      throw new Error('기사 제목을 찾을 수 없습니다.');
    }

    // 본문 추출
    const $article = $('article#dic_area').clone();
    if ($article.length === 0) {
      throw new Error('기사 본문을 찾을 수 없습니다.');
    }

    // 불필요한 요소 제거
    $article.find('script').remove();
    $article.find('style').remove();
    $article.find('.end_photo_org').remove(); // 이미지 영역
    $article.find('.nbd_table').remove(); // 테이블
    $article.find('table').remove();
    $article.find('iframe').remove();

    // HTML을 텍스트로 변환
    let bodyHtml = $article.html() || '';

    // <br> 태그를 줄바꿈으로 변환
    bodyHtml = bodyHtml.replace(/<br\s*\/?>/gi, '\n');

    // HTML 태그 제거
    const $temp = cheerio.load(`<div>${bodyHtml}</div>`);
    let rawContent = $temp('div').text();

    // 저작권/광고 문구 제거
    rawContent = rawContent.replace(/ⓒ.*무단.*금지/g, '');
    rawContent = rawContent.replace(/\[.*기자\]/g, '');
    rawContent = rawContent.replace(/▶.*$/gm, '');

    // 본문 정리
    const contentParts = rawContent
      .split('\n')
      .map((line) => this.cleanText(line))
      .filter((line) => line.length > 0);

    const content = contentParts.join('\n\n');
    if (!content) {
      throw new Error('기사 본문을 찾을 수 없습니다.');
    }

    // 기자명 추출
    let author: string | undefined;
    const bylineText = this.cleanText($('.byline_s').text());
    if (bylineText) {
      // "김현미 기자 khmzip@donga.com" 패턴에서 이름과 직함만 추출
      const authorMatch = bylineText.match(/([가-힣]+)\s*(기자|특파원|위원)?/);
      if (authorMatch) {
        author = authorMatch[1] + (authorMatch[2] ? ` ${authorMatch[2]}` : ' 기자');
      }
    }

    // 입력일 추출 (data-date-time 속성 우선)
    let publishedAt: string | undefined;
    const dateElement = $('._ARTICLE_DATE_TIME');
    if (dateElement.length > 0) {
      const dateAttr = dateElement.attr('data-date-time');
      if (dateAttr) {
        publishedAt = dateAttr;
      }
    }

    // 이미지 추출
    const images = this.extractNaverImages($, url);

    // 원본 출처 (언론사명) 추출
    let originalSource: string | undefined;
    const logoImg = $('.media_end_head_top_logo_img');
    if (logoImg.length > 0) {
      originalSource = logoImg.attr('alt') || undefined;
    }

    // 카테고리 추출 (태그로 활용)
    const tags: string[] = [];
    $('.media_end_categorize_item').each((_, element) => {
      const category = this.cleanText($(element).text());
      if (category) {
        tags.push(category);
      }
    });

    // 원본 출처가 있으면 sourceName에 포함
    const finalSourceName = originalSource
      ? `${originalSource} (네이버뉴스)`
      : this.sourceName;

    return {
      title,
      content,
      author,
      publishedAt,
      images: images.length > 0 ? images : undefined,
      tags: tags.length > 0 ? tags : undefined,
      sourceUrl: url,
      sourceName: finalSourceName,
    };
  }

  /**
   * 네이버뉴스 전용 이미지 추출
   * #dic_area 내 이미지들
   */
  private extractNaverImages($: cheerio.Root, baseUrl: string): string[] {
    const images: string[] = [];
    const baseUrlObj = new URL(baseUrl);

    // 기사 본문 내 이미지 추출
    $('#dic_area img, .end_photo_org img').each((_, element) => {
      // data-src 또는 src 속성에서 이미지 URL 추출
      const src =
        $(element).attr('data-src') ||
        $(element).attr('src');

      if (src) {
        try {
          // 네이버 이미지는 대부분 절대 URL
          const absoluteUrl = src.startsWith('http')
            ? src
            : new URL(src, baseUrlObj.origin).href;

          // 썸네일이나 아이콘 제외
          if (
            !images.includes(absoluteUrl) &&
            !src.includes('thumb') &&
            !src.includes('icon') &&
            !src.includes('logo') &&
            !src.includes('blank')
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
