import { Method } from 'axios';

/**
 * 네이버 검색광고 API 서명 생성을 위한 파라미터
 */
export interface ISignature {
  secretKey: string;
  requestEndpoint: string;
  method: Method;
}

/**
 * 네이버 검색광고 API 헤더 필드
 */
export interface IHeaderFields {
  timestamp: string;
  license: string;
  customerId: string;
  hash: string;
}

/**
 * 네이버 검색광고 API keywordstool 응답의 개별 키워드 정보
 * @see https://naver.github.io/searchad-apidoc/#/operations/GET/~2Fkeywordstool
 */
export interface KeywordStat {
  /** 연관 키워드 */
  relKeyword: string;
  /** 월간 PC 검색수 (< 10인 경우 "< 10" 문자열) */
  monthlyPcQcCnt: number | string;
  /** 월간 모바일 검색수 (< 10인 경우 "< 10" 문자열) */
  monthlyMobileQcCnt: number | string;
  /** 월평균 PC 클릭수 */
  monthlyAvePcClkCnt: number;
  /** 월평균 모바일 클릭수 */
  monthlyAveMobileClkCnt: number;
  /** 월평균 PC 클릭률 */
  monthlyAvePcCtr: number;
  /** 월평균 모바일 클릭률 */
  monthlyAveMobileCtr: number;
  /** 평균 노출 깊이 */
  plAvgDepth: number;
  /** 경쟁 정도 ("높음" | "중간" | "낮음") */
  compIdx: string;
}

/**
 * 네이버 검색광고 API keywordstool 응답
 */
export interface KeywordToolResponse {
  keywordList: KeywordStat[];
}

/**
 * 네이버 검색광고 API 에러 응답
 */
export interface SearchAdApiError {
  code: number;
  title: string;
  detail: string;
}

/**
 * getRelatedKeyword 메서드의 결과 타입
 */
export type GetRelatedKeywordResult =
  | { success: true; data: KeywordToolResponse }
  | { success: false; error: SearchAdApiError };
