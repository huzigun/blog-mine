import * as cheerio from 'cheerio';
import { NewsArticle } from '../news-crawler.interface';
import { BaseNewsParser } from './base.parser';

/**
 * 노컷뉴스 (www.nocutnews.co.kr) 파서
 *
 * HTML 구조:
 * - 제목: .h_info h1
 * - 부제: h3.news-h3
 * - 기자명: .bl_b li.email span (CBS노컷뉴스 기자명 기자)
 * - 입력일: .bl_b li (두 번째 li, 2026-01-06 14:51)
 * - 본문: #pnlContent (텍스트 노드, <br> 구분)
 * - 이미지: .news-image img, #pnlContent img
 * - 이미지 캡션: .fr-inner
 * - 카테고리: .sub_group strong
 */
export class NocutParser extends BaseNewsParser {
  readonly supportedDomains = ['www.nocutnews.co.kr', 'nocutnews.co.kr'];
  readonly sourceName = '노컷뉴스';

  parse(html: string, url: string): NewsArticle {
    const $ = this.loadHtml(html);

    // 제목 추출
    const title = this.cleanText($('.h_info h1').text());
    if (!title) {
      throw new Error('기사 제목을 찾을 수 없습니다.');
    }

    // 부제 추출 (선택적)
    let subtitle: string | undefined;
    const subtitleElement = $('h3.news-h3');
    if (subtitleElement.length > 0) {
      // <br> 태그를 공백으로 변환
      let subtitleHtml = subtitleElement.html() || '';
      subtitleHtml = subtitleHtml.replace(/<br\s*\/?>/gi, ' ');
      const $temp = cheerio.load(`<div>${subtitleHtml}</div>`);
      subtitle = this.cleanText($temp('div').text());
    }

    // 기자명 추출
    let author: string | undefined;
    const authorSpan = $('.bl_b li.email span');
    if (authorSpan.length > 0) {
      const authorText = this.cleanText(authorSpan.text());
      // "CBS노컷뉴스 정영철 기자" 패턴에서 기자명 추출
      const authorMatch = authorText.match(/([가-힣]+)\s*(기자|특파원)/);
      if (authorMatch) {
        author = `${authorMatch[1]} ${authorMatch[2]}`;
      } else {
        author = authorText;
      }
    }

    // 다른 위치에서 기자명 추출 시도
    if (!author) {
      const bottomByline = $('#divBottomByline .a_reporter strong');
      if (bottomByline.length > 0) {
        author = this.cleanText(bottomByline.text());
      }
    }

    // 입력일 추출
    let publishedAt: string | undefined;
    const dateItems = $('.bl_b li');
    dateItems.each((_, element) => {
      const text = this.cleanText($(element).text());
      // 날짜 형식 패턴 (2026-01-06 14:51)
      if (text.match(/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/)) {
        publishedAt = text;
        return false; // break
      }
    });

    // 본문 추출
    const $article = $('#pnlContent').clone();
    if ($article.length === 0) {
      throw new Error('기사 본문을 찾을 수 없습니다.');
    }

    // 불필요한 요소 제거
    $article.find('script').remove();
    $article.find('style').remove();
    $article.find('iframe').remove();
    $article.find('.news-image').remove(); // 이미지 영역 (별도 추출)
    $article.find('.fr-img-space-wrap').remove(); // 이미지 영역
    $article.find('[id^="div"]').remove(); // 광고 div들
    $article.find('.floating').remove(); // 플로팅 광고
    $article.find('table').remove(); // 테이블 광고

    // HTML을 텍스트로 변환
    let bodyHtml = $article.html() || '';

    // <br> 태그를 줄바꿈으로 변환
    bodyHtml = bodyHtml.replace(/<br\s*\/?>/gi, '\n');

    // HTML 태그 제거
    const $temp = cheerio.load(`<div>${bodyHtml}</div>`);
    let rawContent = $temp('div').text();

    // 저작권/광고 문구 제거
    rawContent = rawContent.replace(/ⓒ.*무단.*금지/g, '');
    rawContent = rawContent.replace(/저작권자.*CBS/g, '');
    rawContent = rawContent.replace(/▶.*$/gm, '');
    rawContent = rawContent.replace(/\[.*기자\]/g, '');

    // 본문 정리
    const contentParts = rawContent
      .split('\n')
      .map((line) => this.cleanText(line))
      .filter((line) => line.length > 0);

    // 부제가 있으면 본문 앞에 추가
    let content = contentParts.join('\n\n');
    if (subtitle && !content.includes(subtitle)) {
      content = subtitle + '\n\n' + content;
    }

    if (!content) {
      throw new Error('기사 본문을 찾을 수 없습니다.');
    }

    // 이미지 추출
    const images = this.extractNocutImages($, url);

    // 카테고리 추출 (태그로 활용)
    const tags: string[] = [];
    const category = this.cleanText($('.sub_group strong').text());
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
   * 노컷뉴스 전용 이미지 추출
   * .news-image img, #pnlContent img
   */
  private extractNocutImages($: cheerio.Root, baseUrl: string): string[] {
    const images: string[] = [];
    const baseUrlObj = new URL(baseUrl);

    // 기사 본문 내 이미지 추출
    $('.news-image img, #pnlContent img, .fr-img-space-wrap img').each(
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

            // 썸네일, 아이콘, 광고 제외, 노컷뉴스 이미지만
            if (
              !images.includes(absoluteUrl) &&
              !src.includes('thumb') &&
              !src.includes('icon') &&
              !src.includes('logo') &&
              !src.includes('blank') &&
              !src.includes('ad') &&
              (src.includes('nocutnews') || src.includes('file2.nocutnews'))
            ) {
              images.push(absoluteUrl);
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
