import { NewsArticle } from '../news-crawler.interface';
import { BaseNewsParser } from './base.parser';

/**
 * MBC 뉴스 (imnews.imbc.com) 파서
 *
 * HTML 구조:
 * - 카테고리: span.sort a (사회, 정치 등)
 * - 제목: h2.art_title
 * - 기자명: span.writer a (박소희)
 * - 입력일: .date span.input (입력 2026-01-06 16:46)
 * - 본문: .news_txt[itemprop="articleBody"] (br 태그로 구분)
 * - 이미지: script thisMovie1.image 변수, .viewer background-image
 * - 태그: .hashtag a (#트럼프, #SNS, #극우)
 * - 저작권: ⓒ MBC&iMBC
 */
export class MbcParser extends BaseNewsParser {
  readonly supportedDomains = ['imnews.imbc.com', 'imbc.com', 'www.imbc.com'];
  readonly sourceName = 'MBC';

  parse(html: string, url: string): NewsArticle {
    const $ = this.loadHtml(html);

    // 제목 추출
    let title = this.cleanText($('h2.art_title').text());
    if (!title) {
      title = this.cleanText($('.art_title').text());
    }
    if (!title) {
      title = this.cleanText(
        $('meta[property="og:title"]').attr('content') || '',
      );
    }
    if (!title) {
      throw new Error('기사 제목을 찾을 수 없습니다.');
    }

    // 카테고리 추출
    const categories: string[] = [];
    $('span.sort a').each((_, element) => {
      const cat = this.cleanText($(element).text());
      if (cat && !categories.includes(cat)) {
        categories.push(cat);
      }
    });

    // 기자명 추출
    let author: string | undefined;
    const writerElement = $('span.writer a');
    if (writerElement.length > 0) {
      author = this.cleanText(writerElement.first().text());
      if (author && !author.includes('기자')) {
        author = `${author} 기자`;
      }
    }
    if (!author) {
      // 대체 선택자
      const bylineElement = $('.writer, .reporter');
      if (bylineElement.length > 0) {
        author = this.cleanText(bylineElement.text());
      }
    }

    // 입력일 추출 (입력 2026-01-06 16:46 형식)
    let publishedAt: string | undefined;
    const inputDateElement = $('.date span.input');
    if (inputDateElement.length > 0) {
      const dateText = this.cleanText(inputDateElement.text());
      // "입력 2026-01-06 16:46" → "2026-01-06 16:46"
      const match = dateText.match(/입력\s*(\d{4}-\d{2}-\d{2}\s*\d{2}:\d{2})/);
      if (match) {
        publishedAt = match[1];
      }
    }
    if (!publishedAt) {
      // 대체 선택자
      const dateElement = $('.date, time[datetime]');
      if (dateElement.length > 0) {
        const datetime = dateElement.attr('datetime');
        if (datetime) {
          publishedAt = datetime;
        } else {
          const dateText = this.cleanText(dateElement.text());
          const match = dateText.match(/(\d{4}-\d{2}-\d{2}\s*\d{2}:\d{2})/);
          if (match) {
            publishedAt = match[1];
          }
        }
      }
    }

    // 본문 추출
    const contentParts: string[] = [];

    // .news_txt[itemprop="articleBody"]에서 본문 추출
    const articleBody = $('.news_txt[itemprop="articleBody"]');
    if (articleBody.length > 0) {
      const htmlContent = articleBody.html() || '';

      // 스크립트, 스타일, figure 등 제거
      const cleanedHtml = htmlContent
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<figure[^>]*>[\s\S]*?<\/figure>/gi, '')
        .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '')
        .replace(/<div[^>]*class="[^"]*ad[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '');

      // br 태그 기준으로 분리
      const paragraphs = cleanedHtml.split(/<br\s*\/?>/gi);
      for (const para of paragraphs) {
        const text = this.cleanText(para.replace(/<[^>]*>/g, ''));
        if (text && this.isValidContent(text)) {
          contentParts.push(text);
        }
      }
    }

    // 본문이 없으면 대체 선택자로 시도
    if (contentParts.length === 0) {
      const altBody = $('.news_txt, .article_body, #article_body');
      if (altBody.length > 0) {
        altBody.find('p').each((_, element) => {
          const text = this.cleanText($(element).text());
          if (text && this.isValidContent(text)) {
            contentParts.push(text);
          }
        });

        // p 태그가 없으면 전체 텍스트에서 추출
        if (contentParts.length === 0) {
          const htmlContent = altBody.html() || '';
          const cleanedHtml = htmlContent
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

          const paragraphs = cleanedHtml.split(/<br\s*\/?>/gi);
          for (const para of paragraphs) {
            const text = this.cleanText(para.replace(/<[^>]*>/g, ''));
            if (text && this.isValidContent(text)) {
              contentParts.push(text);
            }
          }
        }
      }
    }

    const content = contentParts.join('\n\n');
    if (!content) {
      throw new Error('기사 본문을 찾을 수 없습니다.');
    }

    // 이미지 추출
    const images = this.extractMbcImages($, html, url);

    // 태그 추출 (카테고리 + 해시태그)
    const tags: string[] = [...categories];
    $('.hashtag a').each((_, element) => {
      let tag = this.cleanText($(element).text());
      // # 제거
      if (tag.startsWith('#')) {
        tag = tag.substring(1);
      }
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
   * 유효한 본문 내용인지 확인
   */
  private isValidContent(text: string): boolean {
    // 저작권/광고 문구 제거
    if (
      text.includes('ⓒ MBC') ||
      text.includes('ⓒ iMBC') ||
      text.includes('MBC&iMBC') ||
      text.includes('Copyright') ||
      text.includes('저작권자') ||
      text.includes('무단 전재') ||
      text.includes('재배포') ||
      text.includes('AI학습') ||
      text.includes('구독') ||
      text.includes('좋아요') ||
      text.includes('댓글') ||
      text.includes('공유하기') ||
      text.includes('인쇄하기') ||
      text.includes('[사진 출처') ||
      text.includes('[영상 출처')
    ) {
      return false;
    }

    // 빈 문자열이나 공백만 있는 경우 제외
    if (text.trim().length === 0) {
      return false;
    }

    return true;
  }

  /**
   * MBC 전용 이미지 추출
   */
  private extractMbcImages(
    $: ReturnType<typeof this.loadHtml>,
    html: string,
    baseUrl: string,
  ): string[] {
    const images: string[] = [];
    const baseUrlObj = new URL(baseUrl);

    // 스크립트에서 thisMovie1.image 추출 시도
    const movieImageMatch = html.match(
      /thisMovie1\.image\s*=\s*['"](https?:\/\/[^'"]+)['"]/,
    );
    if (movieImageMatch) {
      const imgUrl = movieImageMatch[1];
      if (!images.includes(imgUrl)) {
        images.push(imgUrl);
      }
    }

    // .viewer 내 background-image 추출
    $('.viewer').each((_, element) => {
      const style = $(element).attr('style') || '';
      const bgMatch = style.match(/background-image:\s*url\(['"]?([^'"()]+)['"]?\)/i);
      if (bgMatch) {
        try {
          let absoluteUrl = bgMatch[1];
          if (absoluteUrl.startsWith('//')) {
            absoluteUrl = 'https:' + absoluteUrl;
          } else if (!absoluteUrl.startsWith('http')) {
            absoluteUrl = new URL(absoluteUrl, baseUrlObj.origin).href;
          }
          if (!images.includes(absoluteUrl)) {
            images.push(absoluteUrl);
          }
        } catch {
          // URL 파싱 실패 시 무시
        }
      }
    });

    // 기사 본문 내 이미지 추출
    const imageSelectors = [
      '.news_txt img',
      '.article_body img',
      '.photo_area img',
      'figure img',
    ];

    for (const selector of imageSelectors) {
      $(selector).each((_, element) => {
        const src =
          $(element).attr('data-src') ||
          $(element).attr('src') ||
          $(element).attr('data-lazy-src');

        if (src) {
          try {
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
              !src.includes('button') &&
              !src.includes('reporter') &&
              !src.includes('profile')
            ) {
              images.push(absoluteUrl);
            }
          } catch {
            // URL 파싱 실패 시 무시
          }
        }
      });
    }

    // og:image에서도 추출 시도
    const ogImage = $('meta[property="og:image"]').attr('content');
    if (ogImage && !images.includes(ogImage)) {
      images.push(ogImage);
    }

    return images;
  }
}
