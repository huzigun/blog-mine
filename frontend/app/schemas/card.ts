import { z } from 'zod';

/**
 * 카드 등록 스키마
 * - 카드 번호: 14-16자리 (Diners: 14, Amex: 15, 일반: 16)
 * - 주민번호/사업자번호: 6자리(주민번호 앞자리) 또는 10자리(사업자번호)
 */
export const cardRegistrationSchema = z.object({
  cardNumber: z
    .string()
    .min(1, '카드 번호를 입력하세요')
    .refine(
      (val) => {
        const cleaned = val.replace(/-/g, '');
        return cleaned.length >= 14 && cleaned.length <= 16;
      },
      { message: '카드 번호는 14-16자리여야 합니다' },
    )
    .refine(
      (val) => {
        // 하이픈 제거 후 숫자만 체크
        const cleaned = val.replace(/-/g, '');
        return /^\d+$/.test(cleaned);
      },
      { message: '카드 번호는 숫자만 입력 가능합니다' },
    ),

  expiryDate: z
    .string()
    .length(5, '유효기간은 MM/YY 형식이어야 합니다')
    .regex(/^\d{2}\/\d{2}$/, '유효기간은 MM/YY 형식으로 입력하세요')
    .refine(
      (val) => {
        const parts = val.split('/');
        if (parts.length !== 2) return false;

        const monthStr = parts[0];
        if (!monthStr) return false;

        const month = parseInt(monthStr, 10);
        return month >= 1 && month <= 12;
      },
      { message: '올바른 월을 입력하세요 (01-12)' },
    )
    .refine(
      (val) => {
        const parts = val.split('/');
        if (parts.length !== 2) return false;

        const monthStr = parts[0];
        const yearStr = parts[1];
        if (!monthStr || !yearStr) return false;

        const month = parseInt(monthStr, 10);
        const year = parseInt(yearStr, 10);

        const now = new Date();
        const currentYear = now.getFullYear() % 100;
        const currentMonth = now.getMonth() + 1; // 0-based to 1-based

        // 입력된 연도가 현재 연도보다 이후인 경우 유효
        if (year > currentYear) {
          return true;
        }

        // 같은 연도인 경우 월을 비교
        if (year === currentYear) {
          return month >= currentMonth;
        }

        // 과거 연도는 만료
        return false;
      },
      { message: '만료된 카드입니다' },
    ),

  idNo: z
    .string()
    .refine(
      (val) => val.length === 6 || val.length === 10,
      '주민등록번호 앞 6자리 또는 사업자번호 10자리를 입력하세요',
    )
    .refine((val) => /^\d+$/.test(val), '숫자만 입력 가능합니다'),

  cardPw: z
    .string()
    .length(2, '카드 비밀번호 앞 2자리를 입력하세요')
    .regex(/^\d{2}$/, '비밀번호는 숫자 2자리여야 합니다'),
});

export type CardRegistrationForm = z.infer<typeof cardRegistrationSchema>;

/**
 * 카드 번호 포맷팅 (하이픈 추가)
 * - Amex (15자리): XXXX-XXXXXX-XXXXX
 * - Diners (14자리): XXXX-XXXXXX-XXXX
 * - 일반 (16자리): XXXX-XXXX-XXXX-XXXX
 * - 마스킹된 카드 번호(*포함)도 지원
 */
export function formatCardNumber(cardNumber: string): string {
  // 숫자와 * 만 추출 (하이픈과 공백 제거)
  const cleaned = cardNumber.replace(/[^\d*]/g, '');

  if (cleaned.length === 15) {
    // American Express
    return cleaned.replace(/(.{4})(.{6})(.{5})/, '$1-$2-$3');
  } else if (cleaned.length === 14) {
    // Diners Club
    return cleaned.replace(/(.{4})(.{6})(.{4})/, '$1-$2-$3');
  } else if (cleaned.length === 16) {
    // Visa, MasterCard, etc.
    return cleaned.replace(/(.{4})(.{4})(.{4})(.{4})/, '$1-$2-$3-$4');
  }

  return cleaned;
}

/**
 * 카드 타입 감지
 */
export function detectCardType(cardNumber: string): string {
  const cleaned = cardNumber.replace(/\D/g, '');

  // American Express: 34, 37로 시작하는 15자리
  if (/^3[47]\d{13}$/.test(cleaned)) {
    return 'amex';
  }

  // Diners Club: 300-305, 36, 38로 시작하는 14자리
  if (/^3(?:0[0-5]|[68]\d)\d{11}$/.test(cleaned)) {
    return 'diners';
  }

  // Visa: 4로 시작하는 16자리
  if (/^4\d{15}$/.test(cleaned)) {
    return 'visa';
  }

  // MasterCard: 51-55, 2221-2720로 시작하는 16자리
  if (
    /^(5[1-5]\d{14}|2(?:22[1-9]|2[3-9]\d|[3-6]\d{2}|7[01]\d|720)\d{12})$/.test(
      cleaned,
    )
  ) {
    return 'mastercard';
  }

  return 'unknown';
}

/**
 * 주민번호/사업자번호 포맷팅
 */
export function formatIdNo(idNo: string): string {
  const cleaned = idNo.replace(/\D/g, '');

  if (cleaned.length === 6) {
    // 주민등록번호 앞 6자리 (YYMMDD)
    return cleaned.replace(/(\d{2})(\d{2})(\d{2})/, '$1.$2.$3');
  } else if (cleaned.length === 10) {
    // 사업자번호 (XXX-XX-XXXXX)
    return cleaned.replace(/(\d{3})(\d{2})(\d{5})/, '$1-$2-$3');
  }

  return cleaned;
}

/**
 * 주민번호/사업자번호 타입 감지
 */
export function detectIdNoType(
  idNo: string,
): 'personal' | 'business' | 'unknown' {
  const cleaned = idNo.replace(/\D/g, '');

  if (cleaned.length === 6) {
    return 'personal';
  } else if (cleaned.length === 10) {
    return 'business';
  }

  return 'unknown';
}
