import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { NewsArticle, NewsParser } from './news-crawler.interface';
import {
  ArirangParser,
  AsiaeParser,
  ChannelaParser,
  ChosunParser,
  DaumParser,
  DongaParser,
  EdujbParser,
  HaniParser,
  HankookilboParser,
  JoongangParser,
  JtbcParser,
  KadoParser,
  KbsParser,
  KhanParser,
  KmibParser,
  KookjeParser,
  MbcParser,
  MbnParser,
  MkParser,
  MtParser,
  MunhwaParser,
  NateParser,
  NaverParser,
  NewstapaParser,
  NocutParser,
  NongminParser,
  OsenParser,
  SbsBizParser,
  SbsParser,
  SeoulParser,
  SegyeParser,
  TvchosunParser,
  WowtvParser,
  YtnParser,
  YnaParser,
  YonhapnewstvParser,
} from './parsers';

/**
 * 뉴스 크롤러 서비스
 *
 * 뉴스 URL을 입력받아 해당 사이트에 맞는 파서로 기사 내용을 추출합니다.
 * 새로운 뉴스 사이트를 지원하려면 해당 사이트의 파서를 구현하고 등록하면 됩니다.
 */
@Injectable()
export class NewsCrawlerService {
  private readonly logger = new Logger(NewsCrawlerService.name);
  private readonly userAgent =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

  /** 등록된 뉴스 파서 목록 */
  private readonly parsers: NewsParser[] = [];

  constructor() {
    // 파서 등록
    this.registerParser(new DaumParser());
    this.registerParser(new DongaParser());
    this.registerParser(new KadoParser());
    this.registerParser(new KhanParser());
    this.registerParser(new KmibParser());
    this.registerParser(new KookjeParser());
    this.registerParser(new MkParser());
    this.registerParser(new MtParser());
    this.registerParser(new MunhwaParser());
    this.registerParser(new NateParser());
    this.registerParser(new NaverParser());
    this.registerParser(new NocutParser());
    this.registerParser(new NongminParser());
    this.registerParser(new NewstapaParser());
    this.registerParser(new SeoulParser());
    this.registerParser(new SegyeParser());
    this.registerParser(new ArirangParser());
    this.registerParser(new AsiaeParser());
    this.registerParser(new YnaParser());
    this.registerParser(new YonhapnewstvParser());
    this.registerParser(new EdujbParser());
    this.registerParser(new ChosunParser());
    this.registerParser(new JoongangParser());
    this.registerParser(new ChannelaParser());
    this.registerParser(new HaniParser());
    this.registerParser(new WowtvParser());
    this.registerParser(new HankookilboParser());
    this.registerParser(new JtbcParser());
    this.registerParser(new KbsParser());
    this.registerParser(new MbcParser());
    this.registerParser(new MbnParser());
    this.registerParser(new OsenParser());
    this.registerParser(new SbsParser());
    this.registerParser(new SbsBizParser());
    this.registerParser(new TvchosunParser());
    this.registerParser(new YtnParser());

    this.logger.log(
      `NewsCrawlerService initialized with ${this.parsers.length} parser(s)`,
    );
  }

  /**
   * 새로운 파서 등록
   */
  registerParser(parser: NewsParser): void {
    this.parsers.push(parser);
    this.logger.debug(
      `Registered parser: ${parser.sourceName} (${parser.supportedDomains.join(', ')})`,
    );
  }

  /**
   * 지원되는 도메인 목록 조회
   */
  getSupportedDomains(): { sourceName: string; domains: string[] }[] {
    return this.parsers.map((parser) => ({
      sourceName: parser.sourceName,
      domains: parser.supportedDomains,
    }));
  }

  /**
   * URL이 지원되는지 확인
   */
  isSupported(url: string): boolean {
    return this.parsers.some((parser) => parser.canParse(url));
  }

  /**
   * 뉴스 기사 크롤링
   * @param url 뉴스 기사 URL
   * @returns 파싱된 뉴스 기사 정보
   */
  async crawl(url: string): Promise<NewsArticle> {
    // URL 유효성 검사
    let validUrl: URL;
    try {
      validUrl = new URL(url);
    } catch {
      throw new BadRequestException('유효하지 않은 URL입니다.');
    }

    // 적합한 파서 찾기
    const parser = this.parsers.find((p) => p.canParse(url));
    if (!parser) {
      throw new BadRequestException(
        `지원하지 않는 뉴스 사이트입니다: ${validUrl.hostname}`,
      );
    }

    this.logger.debug(
      `Crawling news article: ${url} (parser: ${parser.sourceName})`,
    );

    try {
      // HTML 가져오기
      const html = await this.fetchHtml(url);

      // 파싱
      const article = parser.parse(html, url);

      this.logger.debug(
        `Successfully crawled: "${article.title}" from ${parser.sourceName}`,
      );

      return article;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to crawl ${url}: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * URL에서 HTML 가져오기
   */
  private async fetchHtml(url: string): Promise<string> {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': this.userAgent,
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        Connection: 'keep-alive',
        'Cache-Control': 'no-cache',
      },
    });

    if (!response.ok) {
      throw new BadRequestException(
        `뉴스 페이지를 가져올 수 없습니다. Status: ${response.status}`,
      );
    }

    return response.text();
  }
}
