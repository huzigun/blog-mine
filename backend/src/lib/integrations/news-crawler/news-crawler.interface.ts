/**
 * 뉴스 기사 크롤링 결과 인터페이스
 */
export interface NewsArticle {
  /** 기사 제목 */
  title: string;

  /** 부제목 (있는 경우) */
  subtitle?: string;

  /** 기사 본문 내용 */
  content: string;

  /** 기자명 */
  author?: string;

  /** 작성/입력 일시 */
  publishedAt?: string;

  /** 이미지 URL 목록 */
  images?: string[];

  /** 태그/키워드 목록 */
  tags?: string[];

  /** 원본 URL */
  sourceUrl: string;

  /** 뉴스 매체명 */
  sourceName: string;
}

/**
 * 뉴스 사이트 파서 인터페이스
 * 각 뉴스 사이트별 파서가 구현해야 하는 인터페이스
 */
export interface NewsParser {
  /** 지원하는 도메인 목록 */
  readonly supportedDomains: string[];

  /** 매체명 */
  readonly sourceName: string;

  /**
   * 해당 URL을 이 파서가 처리할 수 있는지 확인
   */
  canParse(url: string): boolean;

  /**
   * HTML을 파싱하여 뉴스 기사 정보 추출
   */
  parse(html: string, url: string): NewsArticle;
}
