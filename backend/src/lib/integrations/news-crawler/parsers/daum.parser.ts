import * as cheerio from 'cheerio';
import { NewsArticle } from '../news-crawler.interface';
import { BaseNewsParser } from './base.parser';

/**
 * 다음뉴스 (v.daum.net) 파서
 *
 * HTML 구조:
 * - 제목: h3.tit_view
 * - 부제/요약: strong.summary_view
 * - 기자명: .info_view .txt_info:first-child
 * - 입력일: .info_view .txt_info .num_date (2026. 1. 6. 16:19)
 * - 본문: .article_view section p[dmcf-ptype="general"]
 * - 이미지: .article_view figure img.thumb_g_article
 * - 이미지 캡션: .article_view figcaption.txt_caption
 */
export class DaumParser extends BaseNewsParser {
  readonly supportedDomains = ['v.daum.net', 'news.v.daum.net'];
  readonly sourceName = '다음뉴스';

  parse(html: string, url: string): NewsArticle {
    const $ = this.loadHtml(html);

    // 제목 추출
    const title = this.cleanText($('h3.tit_view').text());
    if (!title) {
      throw new Error('기사 제목을 찾을 수 없습니다.');
    }

    // 요약/부제 추출 (선택적)
    let summary: string | undefined;
    const summaryElement = $('strong.summary_view');
    if (summaryElement.length > 0) {
      // <br> 태그를 줄바꿈으로 변환
      let summaryHtml = summaryElement.html() || '';
      summaryHtml = summaryHtml.replace(/<br\s*\/?>/gi, '\n');
      const $temp = cheerio.load(`<div>${summaryHtml}</div>`);
      summary = this.cleanText($temp('div').text());
    }

    // 기자명 추출
    let author: string | undefined;
    const authorElement = $('.info_view .txt_info').first();
    if (authorElement.length > 0) {
      const authorText = this.cleanText(authorElement.text());
      // 날짜가 아닌 경우만 기자명으로 처리
      if (!authorText.match(/^\d{4}\./)) {
        author = authorText;
      }
    }

    // 입력일 추출 (2026. 1. 6. 16:19 형식)
    let publishedAt: string | undefined;
    const dateElement = $('.info_view .txt_info .num_date');
    if (dateElement.length > 0) {
      const dateText = this.cleanText(dateElement.text());
      // 한국식 날짜 형식을 표준 형식으로 변환
      const dateMatch = dateText.match(
        /(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{1,2}):(\d{2})/,
      );
      if (dateMatch) {
        const [, year, month, day, hour, minute] = dateMatch;
        publishedAt = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')} ${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
      } else {
        publishedAt = dateText;
      }
    }

    // 본문 추출
    const contentParts: string[] = [];

    // 요약이 있으면 본문 앞에 추가
    if (summary) {
      contentParts.push(summary);
    }

    // .article_view 내의 일반 문단 추출
    $('.article_view section p[dmcf-ptype="general"]').each((_, element) => {
      let text = this.cleanText($(element).text());

      if (text && text.length > 0) {
        // 기자명 + 이메일 패턴 제거 (예: 임형섭 고동욱 기자 = ...)
        const bylineMatch = text.match(
          /^\([^)]+\)\s*[가-힣\s]+\s*(기자|특파원)\s*=/,
        );
        if (bylineMatch) {
          // 기자 정보 부분 제거
          text = text.replace(
            /^\([^)]+\)\s*[가-힣\s]+\s*(기자|특파원)\s*=\s*/,
            '',
          );
          // 기자명 추출 (백업)
          if (!author) {
            const authorMatch = text.match(/([가-힣]+)\s*(기자|특파원)/);
            if (authorMatch) {
              author = `${authorMatch[1]} ${authorMatch[2]}`;
            }
          }
        }

        // 저작권/광고 문구 제거
        if (
          text.includes('저작권자') ||
          text.includes('무단 전재') ||
          text.includes('ⓒ') ||
          text.includes('▶') ||
          text.includes('무단전재')
        ) {
          return;
        }

        // 이메일만 있는 줄 제거
        if (text.match(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)) {
          return;
        }

        if (text.length > 0) {
          contentParts.push(text);
        }
      }
    });

    const content = contentParts.join('\n\n');
    if (!content) {
      throw new Error('기사 본문을 찾을 수 없습니다.');
    }

    // 이미지 추출
    const images = this.extractDaumImages($, url);

    return {
      title,
      content,
      author,
      publishedAt,
      images: images.length > 0 ? images : undefined,
      sourceUrl: url,
      sourceName: this.sourceName,
    };
  }

  /**
   * 다음뉴스 전용 이미지 추출
   * .article_view figure img.thumb_g_article
   */
  private extractDaumImages($: cheerio.Root, baseUrl: string): string[] {
    const images: string[] = [];

    // 기사 본문 내 이미지 추출
    $('.article_view figure img.thumb_g_article').each((_, element) => {
      // data-org-src가 원본 이미지 URL
      const orgSrc = $(element).attr('data-org-src');
      const src = orgSrc || $(element).attr('src');

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

          // 썸네일 URL에서 원본 URL 추출 (다음은 thumb 프록시 사용)
          // https://img3.daumcdn.net/thumb/R658x0.q70/?fname=https://t1.daumcdn.net/...
          const fnameMatch = absoluteUrl.match(/fname=([^&]+)/);
          if (fnameMatch) {
            absoluteUrl = decodeURIComponent(fnameMatch[1]);
          }

          // 중복 제거, 썸네일/아이콘/광고 제외
          if (
            !images.includes(absoluteUrl) &&
            !src.includes('icon') &&
            !src.includes('logo') &&
            !src.includes('blank') &&
            !src.includes('ad') &&
            (src.includes('daumcdn') || src.includes('daum'))
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
