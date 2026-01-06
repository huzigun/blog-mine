import * as cheerio from 'cheerio';
import { NewsArticle } from '../news-crawler.interface';
import { BaseNewsParser } from './base.parser';

/**
 * 국제신문 (kookje.co.kr) 파서
 *
 * HTML 구조:
 * - 제목: .news_title h1
 * - 부제목: .news_title h2
 * - 본문: .news_article (텍스트 노드, <br> 구분)
 * - 기자명: .f_news_repoter (이름 email@kookje.co.kr 기자)
 * - 입력일: .f_news_date (입력 : YYYY-MM-DD HH:MM:SS)
 * - 이미지: .news_article table img#newsimg
 * - 이미지 캡션: .imgcaption
 */
export class KookjeParser extends BaseNewsParser {
  readonly supportedDomains = ['www.kookje.co.kr', 'kookje.co.kr'];
  readonly sourceName = '국제신문';

  parse(html: string, url: string): NewsArticle {
    const $ = this.loadHtml(html);

    // 제목 추출
    const title = this.cleanText($('.news_title h1').text());
    if (!title) {
      throw new Error('기사 제목을 찾을 수 없습니다.');
    }

    // 부제목 추출 (여러 개일 수 있음)
    const subtitles: string[] = [];
    $('.news_title h2').each((_, element) => {
      const subtitle = this.cleanText($(element).text());
      if (subtitle) {
        subtitles.push(subtitle);
      }
    });
    const subtitle = subtitles.length > 0 ? subtitles.join(' / ') : undefined;

    // 본문 추출
    const $article = $('.news_article').clone();

    // 불필요한 요소 제거
    $article.find('table').remove(); // 이미지 테이블 제거
    $article.find('script').remove();
    $article.find('ins').remove(); // 광고 제거
    $article.find('div[style*="float"]').remove(); // 플로팅 광고 제거

    // HTML을 텍스트로 변환
    let bodyHtml = $article.html() || '';

    // <br> 태그를 줄바꿈으로 변환
    bodyHtml = bodyHtml.replace(/<br\s*\/?>/gi, '\n');

    // HTML 태그 제거
    const $temp = cheerio.load(`<div>${bodyHtml}</div>`);
    let rawContent = $temp('div').text();

    // 저작권 문구 제거
    rawContent = rawContent.replace(/ⓒ국제신문.*금지/g, '');
    rawContent = rawContent.replace(/▶\[국제신문.*\]/g, '');

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
    const reporterText = this.cleanText($('.f_news_repoter').text());
    if (reporterText) {
      // "권용휘 kyw@kookje.co.kr 김용구 기자" 패턴에서 기자 이름 추출
      // 이메일 제거하고 이름만 추출
      const cleanedReporter = reporterText
        .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      if (cleanedReporter) {
        author = cleanedReporter;
      }
    }

    // 입력일 추출
    let publishedAt: string | undefined;
    const dateText = this.cleanText($('.f_news_date').text());
    if (dateText) {
      const dateMatch = dateText.match(
        /입력\s*:\s*(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})/,
      );
      if (dateMatch) {
        publishedAt = dateMatch[1];
      }
    }

    // 이미지 추출
    const images = this.extractKookjeImages($, url);

    return {
      title,
      subtitle,
      content,
      author,
      publishedAt,
      images: images.length > 0 ? images : undefined,
      sourceUrl: url,
      sourceName: this.sourceName,
    };
  }

  /**
   * 국제신문 전용 이미지 추출
   * .news_article table img#newsimg
   */
  private extractKookjeImages($: cheerio.Root, baseUrl: string): string[] {
    const images: string[] = [];
    const baseUrlObj = new URL(baseUrl);

    // 기사 본문 내 이미지 추출
    $('.news_article img#newsimg, .news_article table img').each(
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
