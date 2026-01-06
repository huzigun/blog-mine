import * as cheerio from 'cheerio';
import { NewsArticle } from '../news-crawler.interface';
import { BaseNewsParser } from './base.parser';

/**
 * 네이트뉴스 (news.nate.com) 파서
 *
 * HTML 구조:
 * - 제목: h1.articleSubecjt
 * - 원본 언론사: .articleInfo .link a.medium
 * - 입력일: .articleInfo .firstDate em (기사전송 YYYY-MM-DD HH:MM)
 * - 본문: #realArtcContents (p 태그들)
 * - 기자명: 본문 내 "(지역=언론사) 기자명 특파원/기자 =" 또는 이메일 패턴
 * - 이미지: .articleMedia img
 * - 태그: .seo_tag li h2 a
 */
export class NateParser extends BaseNewsParser {
  readonly supportedDomains = ['news.nate.com'];
  readonly sourceName = '네이트뉴스';

  parse(html: string, url: string): NewsArticle {
    const $ = this.loadHtml(html);

    // 제목 추출
    const title = this.cleanText($('h1.articleSubecjt').text());
    if (!title) {
      throw new Error('기사 제목을 찾을 수 없습니다.');
    }

    // 원본 언론사 추출
    let originalSource: string | undefined;
    const mediaLink = $('.articleInfo .link a.medium');
    if (mediaLink.length > 0) {
      originalSource = this.cleanText(mediaLink.text());
    }

    // 입력일 추출
    let publishedAt: string | undefined;
    const dateText = this.cleanText($('.articleInfo .firstDate em').text());
    if (dateText) {
      // "2026-01-06 09:57" 형식
      publishedAt = dateText;
    }

    // 본문 추출
    const $article = $('#realArtcContents').clone();
    if ($article.length === 0) {
      throw new Error('기사 본문을 찾을 수 없습니다.');
    }

    // 불필요한 요소 제거
    $article.find('script').remove();
    $article.find('style').remove();
    $article.find('iframe').remove();
    $article.find('#ad_innerView').remove(); // 광고
    $article.find('.articleMedia').remove(); // 이미지 영역 (별도 추출)
    $article.find('dl').remove(); // 관련 기사 목록
    $article.find('a[target="_void"]').remove(); // 외부 링크들

    // p 태그에서 본문 추출
    const contentParts: string[] = [];
    let author: string | undefined;

    $article.find('p').each((_, element) => {
      let text = this.cleanText($(element).text());
      if (text && text.length > 0) {
        // 기자명 추출 시도 (첫 번째 p 태그에서)
        if (!author && contentParts.length === 0) {
          const authorMatch = text.match(
            /\(([^)]+)\)\s*([가-힣]+)\s*(특파원|기자)\s*=/,
          );
          if (authorMatch) {
            author = `${authorMatch[2]} ${authorMatch[3]}`;
            // 기자 정보 부분 제거
            text = text.replace(/\([^)]+\)\s*[가-힣]+\s*(특파원|기자)\s*=\s*/, '');
          }
        }

        // 이메일 패턴에서 기자명 추출
        if (!author) {
          const emailAuthorMatch = text.match(
            /([가-힣]+)\s*(기자|특파원)?\s*[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
          );
          if (emailAuthorMatch) {
            author = emailAuthorMatch[1] + (emailAuthorMatch[2] ? ` ${emailAuthorMatch[2]}` : ' 기자');
          }
        }

        // 저작권/광고 문구 제거
        if (
          text.includes('저작권자') ||
          text.includes('무단 전재') ||
          text.includes('▶') ||
          text.match(/^☞/)
        ) {
          return;
        }

        // 이메일만 있는 줄 제거
        if (text.match(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)) {
          return;
        }

        // (끝) 제거
        text = text.replace(/\(끝\)$/, '').trim();

        if (text.length > 0) {
          contentParts.push(text);
        }
      }
    });

    // p 태그가 없는 경우 텍스트 노드에서 추출
    if (contentParts.length === 0) {
      let bodyHtml = $article.html() || '';
      bodyHtml = bodyHtml.replace(/<br\s*\/?>/gi, '\n');

      const $temp = cheerio.load(`<div>${bodyHtml}</div>`);
      const rawContent = $temp('div').text();

      rawContent
        .split('\n')
        .map((line) => this.cleanText(line))
        .filter((line) => line.length > 0)
        .forEach((line) => {
          if (
            !line.includes('저작권자') &&
            !line.includes('무단 전재') &&
            !line.includes('▶')
          ) {
            contentParts.push(line);
          }
        });
    }

    const content = contentParts.join('\n\n');
    if (!content) {
      throw new Error('기사 본문을 찾을 수 없습니다.');
    }

    // 이미지 추출
    const images = this.extractNateImages($, url);

    // 태그 추출
    const tags: string[] = [];
    $('.seo_tag li h2 a').each((_, element) => {
      const tag = this.cleanText($(element).text());
      if (tag) {
        tags.push(tag);
      }
    });

    // 원본 출처가 있으면 sourceName에 포함
    const finalSourceName = originalSource
      ? `${originalSource} (네이트뉴스)`
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
   * 네이트뉴스 전용 이미지 추출
   * .articleMedia img
   */
  private extractNateImages($: cheerio.Root, baseUrl: string): string[] {
    const images: string[] = [];

    // 기사 본문 내 이미지 추출
    $('.articleMedia img, #realArtcContents img').each((_, element) => {
      const src = $(element).attr('src');

      if (src) {
        try {
          // 네이트 이미지는 // 로 시작하는 프로토콜 상대 URL
          let absoluteUrl = src;
          if (src.startsWith('//')) {
            absoluteUrl = 'https:' + src;
          } else if (!src.startsWith('http')) {
            const baseUrlObj = new URL(baseUrl);
            absoluteUrl = new URL(src, baseUrlObj.origin).href;
          }

          // 썸네일, 아이콘, 광고 제외
          if (
            !images.includes(absoluteUrl) &&
            !src.includes('thumb') &&
            !src.includes('icon') &&
            !src.includes('logo') &&
            !src.includes('blank') &&
            !src.includes('ad') &&
            src.includes('nateimg')
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
