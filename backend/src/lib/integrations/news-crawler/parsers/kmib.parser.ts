import * as cheerio from 'cheerio';
import { NewsArticle } from '../news-crawler.interface';
import { BaseNewsParser } from './base.parser';

/**
 * 국민일보 (kmib.co.kr) 파서
 *
 * HTML 구조:
 * - 제목: h1.article_headline
 * - 본문: #articleBody (텍스트 노드, <br> 구분)
 * - 기자명: 본문 마지막 부분 "기자명 기자 email@kmib.co.kr" 패턴
 * - 입력일: .datetime div (입력: 날짜)
 * - 이미지: .article_body_img figure img
 * - 카테고리: .breadcrumb a
 */
export class KmibParser extends BaseNewsParser {
  readonly supportedDomains = ['www.kmib.co.kr', 'kmib.co.kr'];
  readonly sourceName = '국민일보';

  parse(html: string, url: string): NewsArticle {
    const $ = this.loadHtml(html);

    // 제목 추출
    const title = this.cleanText($('h1.article_headline').text());
    if (!title) {
      throw new Error('기사 제목을 찾을 수 없습니다.');
    }

    // 본문 추출 (불필요한 요소 제거)
    this.cleanArticleBody($, '#articleBody');

    // 불필요한 요소 추가 제거
    $('#articleBody .article_recommend').remove();
    $('#articleBody .article_body_img').remove();
    $('#articleBody script').remove();

    // 본문 텍스트 추출 (HTML을 텍스트로 변환)
    let bodyHtml = $('#articleBody').html() || '';

    // <br> 태그를 줄바꿈으로 변환
    bodyHtml = bodyHtml.replace(/<br\s*\/?>/gi, '\n');

    // HTML 태그 제거
    const $temp = cheerio.load(`<div>${bodyHtml}</div>`);
    let rawContent = $temp('div').text();

    // 저작권 문구 제거
    rawContent = rawContent.replace(
      /GoodNews paper ⓒ.*무단전재.*금지/g,
      '',
    );

    // 기자 이메일 패턴으로 기자 정보와 본문 분리
    const authorMatch = rawContent.match(
      /([가-힣]+)\s+기자\s+([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/,
    );
    let author: string | undefined;
    if (authorMatch) {
      author = `${authorMatch[1]} 기자`;
      // 기자 정보 이후 텍스트 제거
      rawContent = rawContent.substring(
        0,
        rawContent.indexOf(authorMatch[0]) + authorMatch[0].length,
      );
      // 기자 이메일 부분 제거
      rawContent = rawContent.replace(
        /[가-힣]+\s+기자\s+[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
        '',
      );
    }

    // 본문 정리
    const contentParts = rawContent
      .split('\n')
      .map((line) => this.cleanText(line))
      .filter((line) => line.length > 0);

    const content = contentParts.join('\n\n');
    if (!content) {
      throw new Error('기사 본문을 찾을 수 없습니다.');
    }

    // 입력일 추출
    let publishedAt: string | undefined;
    $('.datetime div').each((_, element) => {
      const text = $(element).text();
      if (text.includes('입력')) {
        const dateMatch = text.match(
          /입력:\s*(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2})/,
        );
        if (dateMatch) {
          publishedAt = dateMatch[1];
        }
      }
    });

    // 이미지 추출
    const images = this.extractKmibImages($, url);

    // 카테고리 추출 (태그로 활용)
    const tags: string[] = [];
    $('.breadcrumb a').each((_, element) => {
      const category = this.cleanText($(element).text());
      if (category && category !== '시사') {
        tags.push(category);
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
   * 국민일보 전용 이미지 추출
   * .article_body_img figure img
   */
  private extractKmibImages($: cheerio.Root, baseUrl: string): string[] {
    const images: string[] = [];
    const baseUrlObj = new URL(baseUrl);

    // 기사 본문 내 이미지 추출
    $('#articleBody .article_body_img figure img, #articleBody figure img').each(
      (_, element) => {
        const src = $(element).attr('src');
        if (src) {
          try {
            const absoluteUrl = new URL(src, baseUrlObj.origin).href;
            // 중복 제거
            if (!images.includes(absoluteUrl)) {
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
