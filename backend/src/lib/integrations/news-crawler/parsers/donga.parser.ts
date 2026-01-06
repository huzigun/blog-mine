import * as cheerio from 'cheerio';
import { NewsArticle } from '../news-crawler.interface';
import { BaseNewsParser } from './base.parser';

/**
 * 동아일보 (www.donga.com) 파서
 *
 * HTML 구조:
 * - 제목: .head_group h1
 * - 부제: .news_view h2.sub_tit
 * - 카테고리: .breadcrumb .breadcrumb_item a
 * - 기자명: .author_info a (송치훈 기자)
 * - 입력일: .date_info p span[aria-hidden="true"] (입력 2026-01-06 14:18)
 * - 업데이트: .news_info button span[aria-hidden="true"] (2026-01-06 14:37)
 * - 본문: .news_view 직접 텍스트 노드 (<br><br>로 구분)
 * - 이미지: .news_view figure.img_cont img
 * - 이미지 캡션: .news_view figure.img_cont figcaption
 */
export class DongaParser extends BaseNewsParser {
  readonly supportedDomains = ['www.donga.com', 'donga.com'];
  readonly sourceName = '동아일보';

  parse(html: string, url: string): NewsArticle {
    const $ = this.loadHtml(html);

    // 제목 추출
    const title = this.cleanText($('.head_group h1').text());
    if (!title) {
      throw new Error('기사 제목을 찾을 수 없습니다.');
    }

    // 부제목 추출 (선택적)
    let subtitle: string | undefined;
    const subtitleElement = $('.news_view h2.sub_tit');
    if (subtitleElement.length > 0) {
      // <br> 태그를 공백으로 변환
      let subtitleHtml = subtitleElement.html() || '';
      subtitleHtml = subtitleHtml.replace(/<br\s*\/?>/gi, ' ');
      const $temp = cheerio.load(`<div>${subtitleHtml}</div>`);
      subtitle = this.cleanText($temp('div').text());
    }

    // 기자명 추출
    let author: string | undefined;
    const authorElement = $('.author_info a').first();
    if (authorElement.length > 0) {
      author = this.cleanText(authorElement.text());
    }

    // 입력일 추출 (입력 2026-01-06 14:18 형식)
    let publishedAt: string | undefined;
    const dateInfoElement = $('.date_info p span[aria-hidden="true"]');
    if (dateInfoElement.length > 0) {
      const dateText = this.cleanText(dateInfoElement.text());
      // "2026-01-06 14:18" 형식 추출
      const dateMatch = dateText.match(/(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2})/);
      if (dateMatch) {
        publishedAt = dateMatch[1];
      }
    }

    // 입력일이 없으면 업데이트 시간 사용
    if (!publishedAt) {
      const updateElement = $(
        '.news_info button span[aria-hidden="true"]',
      ).first();
      if (updateElement.length > 0) {
        const dateText = this.cleanText(updateElement.text());
        const dateMatch = dateText.match(/(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2})/);
        if (dateMatch) {
          publishedAt = dateMatch[1];
        }
      }
    }

    // 본문 추출
    const $article = $('.news_view').clone();
    if ($article.length === 0) {
      throw new Error('기사 본문을 찾을 수 없습니다.');
    }

    // 불필요한 요소 제거
    $article.find('script').remove();
    $article.find('style').remove();
    $article.find('iframe').remove();
    $article.find('h2.sub_tit').remove(); // 부제목 (별도 추출)
    $article.find('figure').remove(); // 이미지 영역 (별도 추출)
    $article.find('.view_ad06').remove(); // 광고
    $article.find('.view_adK').remove(); // 광고
    $article.find('.view_m_adK').remove(); // 모바일 광고
    $article.find('.view_m_adA').remove(); // 모바일 광고
    $article.find('.view_m_adB').remove(); // 모바일 광고
    $article.find('.view_m_adC').remove(); // 모바일 광고
    $article.find('[class*="ad"]').remove(); // 기타 광고
    $article.find('div').remove(); // 광고 div들

    // HTML을 텍스트로 변환
    let bodyHtml = $article.html() || '';

    // <br><br> 태그를 문단 구분자로 변환
    bodyHtml = bodyHtml.replace(/<br\s*\/?>\s*<br\s*\/?>/gi, '\n\n');
    bodyHtml = bodyHtml.replace(/<br\s*\/?>/gi, '\n');

    // HTML 태그 제거
    const $temp = cheerio.load(`<div>${bodyHtml}</div>`);
    let rawContent = $temp('div').text();

    // 저작권/광고 문구 제거
    rawContent = rawContent.replace(/ⓒ.*무단.*금지/g, '');
    rawContent = rawContent.replace(/저작권자.*동아일보/g, '');
    rawContent = rawContent.replace(/▶.*$/gm, '');
    rawContent = rawContent.replace(/<!--.*?-->/g, '');

    // 본문 정리
    const contentParts = rawContent
      .split('\n\n')
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
    const images = this.extractDongaImages($, url);

    // 카테고리 추출 (태그로 활용)
    const tags: string[] = [];
    $('.breadcrumb .breadcrumb_item a').each((_, element) => {
      const tag = this.cleanText($(element).text());
      if (tag && !tags.includes(tag)) {
        tags.push(tag);
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
   * 동아일보 전용 이미지 추출
   * .news_view figure.img_cont img
   */
  private extractDongaImages($: cheerio.Root, baseUrl: string): string[] {
    const images: string[] = [];

    // 기사 본문 내 이미지 추출
    $('.news_view figure.img_cont img').each((_, element) => {
      const src = $(element).attr('src');

      if (src) {
        try {
          // 절대 URL 변환
          let absoluteUrl = src;
          if (src.startsWith('//')) {
            absoluteUrl = 'https:' + src;
          } else if (!src.startsWith('http')) {
            const baseUrlObj = new URL(baseUrl);
            absoluteUrl = new URL(src, baseUrlObj.origin).href;
          }

          // 중복 제거, 썸네일/아이콘/광고 제외
          if (
            !images.includes(absoluteUrl) &&
            !src.includes('icon') &&
            !src.includes('logo') &&
            !src.includes('blank') &&
            !src.includes('ad') &&
            src.includes('donga.com')
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
