/**
 * HelloDM 포스팅 요청 DTO
 */
export interface RequestPostDto {
  /** 회사명 */
  adcompany: string;
  /** 이미지/가이드에 궁금한점이 있는 경우 연락드리는 번호 */
  adhp: string;
  /** 이미지 수신 여부 및 광고시작, 광고종료 안내 메일 발송 */
  ademail: string;
  /** 업체(상품)명 (보고서에 작성되는 광고명칭) */
  title: string;
  /** 주문상품 */
  order_item: number;
  /** 총 구매 건수 (총 발행할 포스팅 건수) */
  mosu: number;
  /** 하루에 진행할 포스팅 건수 */
  okday_cnt?: number;
  /** 원고자료링크 (원고 txt 파일 다운로드 링크) */
  guidelink: string;
  /** 첨부파일링크 (자료 첨부파일 링크) */
  gdrive?: string;
  /** 네이버 플레이스 URL (맛집/법률/병의원) */
  wg_map_link?: string;
  /** 제품 URL (제품 후기) */
  wg_url_link?: string;
}

/**
 * HelloDM 포스팅 요청 결과
 */
export interface RequestPostResultDto {
  success: boolean;
  message: string;
  postNo?: number;
}

/**
 * HelloDM 블로그 리스트 조회 요청 DTO
 */
export interface GetBlogListRequestDto {
  /** 포스팅 고유번호 */
  postNo: number;
  /** 페이지 번호 (기본: 1) */
  page?: number;
  /** 페이지당 항목 수 (기본: 30) */
  limit?: number;
}

/**
 * HelloDM 블로그 리스트 아이템
 */
export interface BlogListItemDto {
  /** 상태 번호 */
  stateNo: string;
  /** 순번 */
  sort: string;
  /** 등록일 */
  date: string;
  /** 블로그 URL */
  url: string;
}

/**
 * HelloDM 블로그 리스트 조회 결과 DTO (페이징 포함)
 */
export interface GetBlogListResultDto {
  /** 성공 여부 */
  success: boolean;
  /** 메시지 */
  message: string;
  /** 포스팅 고유번호 */
  postNo: number;
  /** 업체(상품)명 */
  title?: string;
  /** 블로그 포스팅 목록 */
  items: BlogListItemDto[];
  /** 페이징 정보 */
  pagination: PaginationDto;
}

/**
 * 페이징 정보 DTO
 */
export interface PaginationDto {
  /** 현재 페이지 */
  currentPage: number;
  /** 페이지당 항목 수 */
  limit: number;
  /** 전체 항목 수 */
  totalCount: number;
  /** 전체 페이지 수 */
  totalPages: number;
  /** 다음 페이지 존재 여부 */
  hasNextPage: boolean;
  /** 이전 페이지 존재 여부 */
  hasPreviousPage: boolean;
}
