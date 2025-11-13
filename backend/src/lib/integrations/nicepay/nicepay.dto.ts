export interface ICardInfo {
  cardNo: string; // 카드 번호
  expireYear: string; // 카드 만료 연도
  expireMonth: string; // 카드 만료 월
  idNo: string; // 카드 소유자 주민등록번호
  cardPw: string; // 카드 비밀번호
}

export interface ICardExtraInfo {
  cardInterest: string; // 무이자 여부 0: 이자, 1: 무이자
  cardQuota: string; // 할부 개월 수
  amt: number; // 결제 금액
  orderName?: string; // 상품명
}

export interface IBillingResult {
  ResultCode: string; // 결과 코드 (F100: 성공 / 그외 실패)
  ResultMsg: string; // 결과 메시지
  TID: string; // 거래 ID
  BID?: string; // 빌키, 가맹점에서 관리하여 승인 요청 시 전달
  AuthDate?: string; // 빌키 발급일자(YYYYMMDD)
  CardCode?: string; // 카드사 코드
  CardName?: string; // 카드사명
  CardCl?: string; // 카드타입 (0: 신용카드, 1: 체크카드)
  AcquCardCode?: string; // 매입 카드사 코드
  AcquCardName?: string; // 매입 카드사명
}

export interface IApprovePaymentResult {
  ResultCode: string;
  ResultMsg: string;
  TID: string;
  Moid: string;
  Amt: string;
  AuthCode?: string;
  AuthDate?: string;
  AcquCardCode?: string;
  AcquCardName?: string;
  CardNo?: string;
  CardCode?: string;
  CardName?: string;
  CardCl?: string;
  CcPartCl?: string;
  CardInterest?: string;
  MallReserved?: string;
}

export interface ICancelPaymentResult {
  ResultCode: string;
  ResultMsg: string;
  ErrorCD: string;
  ErrorMsg: string;
  MsgSource: string;
  CancelAmt: string;
  MID: string;
  Moid: string;
  PayMethod: string;
  TID: string;
  CancelDate: string;
  CancelTime: string;
  CancelNum: string;
  RemainAmt: string;
  Signature: string;
  MallReserved: string;
  CouponAmt: string;
  ClickpayCl?: string;
  MultiCardAcquAmt?: string;
  MultiPointAmt?: string;
  MultiCouponAmt?: string;
  MultiDiscountAmt?: string;
}

export interface INiceCallback {
  AuthResultCode: string;
  AuthResultMsg: string;
  TxTid: string;
  AuthToken: string;
  PayMethod: string;
  MID: string;
  Moid: string;
  Amt: string;
  ReqReserved: string;
  NextAppURL: string;
  NetCancelURL: string;
  Signature: string;
}
