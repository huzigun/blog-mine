/**
 * 블로그 순위 히스토리 응답 DTO
 */
export interface BlogRankHistoryDto {
  /** 순위 (1부터 시작, 데이터 없으면 null) */
  rank: number | null;

  /** 날짜 문자열 (YYYY-MM-DD) */
  dateStr: string;
}

/**
 * 블로그 정보 DTO
 */
export interface BlogInfoDto {
  /** 블로그 ID */
  id: number;

  /** 블로그 링크 */
  link: string;

  /** 블로그 제목 */
  title: string;

  /** 블로거 이름 */
  bloggerName: string;

  /** 블로거 링크 */
  bloggerLink: string;
}

/**
 * 키워드 추적의 블로그 순위 응답 DTO
 */
export interface KeywordTrackingRanksResponseDto {
  /** 키워드 추적 ID */
  trackingId: number;

  /** 추적 키워드 */
  keyword: string;

  /** 추적 대상 블로그 URL */
  myBlogUrl: string;

  /** 블로그 정보 (없으면 null) */
  blog: BlogInfoDto | null;

  /** 순위 히스토리 (최신순) */
  rankHistory: BlogRankHistoryDto[];

  /** 최신 순위 (없으면 null) */
  latestRank: number | null;

  /** 순위 변동 (이전 순위 대비, 없으면 null) */
  rankChange: number | null;
}
