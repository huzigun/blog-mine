import { DateService } from '@lib/date';
import { HttpService } from '@nestjs/axios';
import {
  BadGatewayException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import * as cheerio from 'cheerio';

/**
 * 메뉴 항목 DTO
 */
export interface MenuItem {
  /** 메뉴명 */
  name: string;

  /** 가격 (숫자로 파싱된 값, 없으면 null) */
  price: number | null;

  /** 원본 가격 문자열 (예: "15,900원", "변동") */
  priceText: string;
}

/**
 * 네이버 플레이스 정보 응답 DTO
 */
export interface PlaceInfo {
  /** 플레이스 ID */
  id: string;

  /** 매장명 */
  name: string;

  /** 대표 이미지 URL */
  imageUrl: string | null;

  /** PC URL */
  pcUrl: string;

  /** 카테고리 태그 */
  tags: string[];

  /** 전화번호 */
  contact: string | null;

  /** 리뷰 정보 (블로그 리뷰, 방문자 리뷰, 별점) */
  reviews: string[];

  /** 서비스 정보 */
  service: string | null;

  /** 인기 토픽 키워드 */
  topics: string[] | null;

  /** 메뉴 목록 */
  menu: MenuItem[];

  /** 플레이스 타입 (place/restaurant) */
  placeType: string;
}

@Injectable()
export class CrawlerService {
  private readonly logger = new Logger(CrawlerService.name);
  private readonly userAgent = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3`;

  constructor(
    private dateService: DateService,
    private httpService: HttpService,
  ) {}

  /**
   * 네이버 플레이스 정보 크롤링
   * @param placeId 플레이스 ID
   * @returns 플레이스 정보
   */
  async getPlaceInfo(placeId: string): Promise<any> {
    const timestamp = this.dateService.now().format('YYYYMMDDHHmm');
    const placeUrl = `https://pcmap.place.naver.com/place/${placeId}/home`;

    const url = new URL(placeUrl);
    url.searchParams.append('timestamp', timestamp);
    url.searchParams.append('from', 'map');
    url.searchParams.append('fromPanelNum', '1');

    this.logger.debug(`Fetching place info: ${url.toString()}`);

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: { 'User-Agent': this.userAgent },
      });

      if (!response.ok) {
        throw new BadGatewayException(
          `Place 정보를 가져올 수 없습니다. Status: ${response.status}`,
        );
      }

      const html = await response.text();

      return this.parsePlaceInfo(placeId, placeUrl, response.url, html);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to fetch place info: ${errorMessage}`, error);
      if (error instanceof BadGatewayException) {
        throw error;
      }
      throw new BadGatewayException('Place 정보를 가져오는 중 오류 발생');
    }
  }

  /**
   * HTML을 파싱하여 PlaceInfo 추출
   */
  private parsePlaceInfo(
    placeId: string,
    placeUrl: string,
    finalUrl: string,
    html: string,
  ): PlaceInfo {
    const $ = cheerio.load(html);

    // 제목 정보 추출
    const titleTag = $('#_title');
    if (titleTag.length === 0) {
      throw new NotFoundException('Place 정보를 찾을 수 없습니다.');
    }

    // 리다이렉트된 최종 URL에서 플레이스 타입 확인
    const finalUrlObj = new URL(finalUrl);
    const firstPathSegment = finalUrlObj.pathname.split('/')[1] || 'place';

    // 매장명과 카테고리 태그
    const title = titleTag.find('div > span:nth-child(1)').text().trim();
    const tags = titleTag
      .find('div > span:nth-child(2)')
      .text()
      .trim()
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);

    // 리뷰 정보 추출
    const reviews = this.extractReviews($);

    // 전화번호 추출
    const contact = this.extractContact($);

    // 서비스 정보 추출
    const service = this.extractService($);

    // 대표 이미지 URL 추출
    const imageUrl = this.extractImageUrl($);

    // 인기 토픽 추출 (Apollo State에서)
    const topics = this.extractTopics(html);

    // 메뉴 목록 추출
    const menu = this.extractMenu(html);

    return {
      id: placeId,
      name: title,
      imageUrl,
      pcUrl: placeUrl,
      tags,
      contact,
      reviews,
      service,
      topics,
      menu,
      placeType: firstPathSegment,
    };
  }

  /**
   * 리뷰 정보 추출
   */
  private extractReviews($: cheerio.Root): string[] {
    const reviewTags = $('#_title + div > span');

    const reviews: string[] = [];
    reviewTags.each((_, element) => {
      const text = $(element).text().trim();
      const count = text.match(/\d+/);

      if (text.includes('블로그')) {
        reviews.push(`블로그 리뷰: ${count?.[0] || '0'}`);
      } else if (text.includes('방문자')) {
        reviews.push(`방문자 리뷰: ${count?.[0] || '0'}`);
      } else if (text.includes('별점')) {
        reviews.push(`별점: ${count?.[0] || '0'}`);
      }
    });

    return reviews;
  }

  /**
   * 전화번호 추출
   */
  private extractContact($: cheerio.Root): string | null {
    const contactElement = $('.place_bluelink[title="복사"]')
      .parent()
      .parent()
      .find('span')
      .first();

    return contactElement.length > 0 ? contactElement.text().trim() : null;
  }

  /**
   * 서비스 정보 추출
   */
  private extractService($: cheerio.Root): string | null {
    const titleElement = $('#_title');
    if (titleElement.length === 0) return null;

    const serviceContainer = titleElement.parent()?.next()?.next()?.next();

    if (!serviceContainer || serviceContainer.length === 0) return null;

    const services: string[] = [];
    serviceContainer.find('div > span').each((_, element) => {
      const text = $(element).text().trim();
      if (text.length > 0) {
        services.push(text);
      }
    });

    return services.length > 0 ? services.join(' | ') : null;
  }

  /**
   * 대표 이미지 URL 추출
   */
  private extractImageUrl($: cheerio.Root): string | null {
    const shareButton = $('#_btp\\.share');
    if (shareButton.length === 0) return null;

    const imageUrl = shareButton.attr('data-kakaotalk-image-url');
    return imageUrl || null;
  }

  /**
   * 메뉴 목록 추출 (Apollo State에서)
   */
  private extractMenu(html: string): MenuItem[] {
    const menuItems: MenuItem[] = [];

    try {
      // Apollo State를 찾는 패턴
      const scriptPattern = /window\.__APOLLO_STATE__\s*=\s*({.*?});/s;
      const scriptMatch = html.match(scriptPattern);

      if (!scriptMatch || !scriptMatch[1]) {
        return menuItems;
      }

      const apolloState = scriptMatch[1];

      // Menu: 로 시작하는 키들을 찾는 패턴
      // "Menu:1378123807_0":{"__typename":"Menu","name":"소고기샤브","price":"15900",...}
      const menuPattern = /"Menu:[^"]+"\s*:\s*(\{[^}]*\})/g;
      let match;

      while ((match = menuPattern.exec(apolloState)) !== null) {
        try {
          // JSON 파싱 시도
          const menuJson = match[1];
          const menuData = JSON.parse(menuJson) as {
            name?: string;
            price?: string;
            description?: string;
            change?: boolean;
          };

          if (menuData.name) {
            let price: number | null = null;
            let priceText = '';

            if (menuData.change) {
              // change가 true면 "변동"
              priceText = '변동';
            } else if (menuData.price) {
              // price 값이 있으면 파싱
              const priceNumber = parseInt(menuData.price, 10);
              if (!isNaN(priceNumber)) {
                price = priceNumber;
                priceText = `${priceNumber.toLocaleString()}원`;
              } else {
                priceText = '변동';
              }
            } else {
              priceText = '변동';
            }

            // description이 있으면 priceText에 추가
            if (menuData.description) {
              priceText += ` (${menuData.description})`;
            }

            menuItems.push({
              name: menuData.name,
              price,
              priceText,
            });
          }
        } catch {
          // 개별 메뉴 파싱 실패는 무시하고 계속 진행
          continue;
        }
      }

      // index 순서대로 정렬 (index 정보가 있다면)
      return menuItems;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Failed to extract menu: ${errorMessage}`);
      return menuItems;
    }
  }

  /**
   * 인기 토픽 키워드 추출 (Apollo State에서)
   */
  private extractTopics(html: string): string[] | null {
    try {
      // Apollo State를 찾는 패턴
      const scriptPattern = /window\.__APOLLO_STATE__\s*=\s*({.*?});/s;
      const scriptMatch = html.match(scriptPattern);

      if (!scriptMatch || !scriptMatch[1]) {
        return null;
      }

      const apolloState = scriptMatch[1];

      // 인기 토픽 키워드 추출 패턴 (두 가지 순서 시도)
      const topicPattern1 =
        /"keywords":\s*\[([^\]]+)\][^}]*"type"\s*:\s*"topic"[^}]*"name"\s*:\s*"인기토픽"/s;
      const topicPattern2 =
        /"type"\s*:\s*"topic"[^}]*"name"\s*:\s*"인기토픽"[^}]*"keywords":\s*\[([^\]]+)\]/s;

      const match =
        apolloState.match(topicPattern1) || apolloState.match(topicPattern2);

      if (match && match[1]) {
        const keywordsStr = `[${match[1]}]`;
        const keywords = JSON.parse(keywordsStr) as unknown;

        if (Array.isArray(keywords)) {
          return keywords.filter(
            (item): item is string => typeof item === 'string',
          );
        }
      }

      return null;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Failed to extract topics: ${errorMessage}`);
      return null;
    }
  }
}
