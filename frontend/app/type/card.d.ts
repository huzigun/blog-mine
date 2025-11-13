interface Card {
  id: number;
  userId: number;
  customerKey: string;
  authenticatedAt: string | null;
  method: string | null;
  billingKey: string | null;
  cardCompany: string | null;
  issuerCode: string | null;
  acquirerCode: string | null;
  number: string | null;
  cardType: string | null;
  ownerType: string | null;
  isAuthenticated: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

// 카드 등록 요청 인터페이스 (ICardInfo 기반)
interface CreateCardRequest {
  cardNo: string; // 카드 번호 (16자리)
  expireYear: string; // 만료 연도 (YY)
  expireMonth: string; // 만료 월 (MM)
  idNo: string; // 주민등록번호 앞 6자리 또는 사업자번호
  cardPw: string; // 카드 비밀번호 앞 2자리
  isDefault?: boolean; // 기본 카드로 설정
}

// 카드 수정 요청 인터페이스
interface UpdateCardRequest {
  isDefault?: boolean;
}
