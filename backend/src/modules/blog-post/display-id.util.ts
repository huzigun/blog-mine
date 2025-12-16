/**
 * displayId 생성 유틸리티
 *
 * 형식: YYYYMMDD + Base36 단축코드
 * - 기본: 3문자 Base36 (000~ZZZ, 0~46655)
 * - 범위 초과: 숫자 그대로 확장
 *
 * 예시:
 * - 20251216000 (첫 번째)
 * - 20251216001 (두 번째)
 * - 2025121600A (11번째)
 * - 2025121600Z (36번째)
 * - 20251216010 (37번째)
 * - 20251216ZZZ (46656번째)
 * - 2025121646656 (46657번째, 숫자 확장)
 */

const BASE36_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const BASE36_MAX = 46655; // ZZZ in Base36 = 35*36*36 + 35*36 + 35

/**
 * 숫자를 Base36 문자열로 변환 (3자리 패딩)
 * @param num - 변환할 숫자 (0 ~ 46655)
 * @returns 3자리 Base36 문자열
 */
function toBase36Padded(num: number): string {
  if (num < 0 || num > BASE36_MAX) {
    throw new Error(
      `Number ${num} is out of Base36 3-char range (0-${BASE36_MAX})`,
    );
  }

  const d2 = Math.floor(num / (36 * 36));
  const d1 = Math.floor((num % (36 * 36)) / 36);
  const d0 = num % 36;

  return BASE36_CHARS[d2] + BASE36_CHARS[d1] + BASE36_CHARS[d0];
}

/**
 * 날짜 문자열 생성 (YYYYMMDD)
 * @param date - Date 객체 (기본: 현재 시각, KST 기준)
 * @returns YYYYMMDD 형식 문자열
 */
export function getDatePrefix(date: Date = new Date()): string {
  // KST 기준으로 날짜 계산 (UTC+9)
  const kstOffset = 9 * 60 * 60 * 1000;
  const kstDate = new Date(date.getTime() + kstOffset);

  const year = kstDate.getUTCFullYear();
  const month = String(kstDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(kstDate.getUTCDate()).padStart(2, '0');

  return `${year}${month}${day}`;
}

/**
 * displayId의 단축코드 생성
 * @param sequence - 해당 날짜의 시퀀스 번호 (0부터 시작)
 * @returns 단축코드 문자열
 */
export function generateShortCode(sequence: number): string {
  if (sequence < 0) {
    throw new Error('Sequence must be non-negative');
  }

  // Base36 3문자 범위 내 (0 ~ 46655)
  if (sequence <= BASE36_MAX) {
    return toBase36Padded(sequence);
  }

  // 범위 초과 시 숫자 그대로 확장
  return String(sequence);
}

/**
 * 완전한 displayId 생성
 * @param datePrefix - YYYYMMDD 형식 날짜 문자열
 * @param sequence - 해당 날짜의 시퀀스 번호 (0부터 시작)
 * @returns 완전한 displayId
 */
export function generateDisplayId(
  datePrefix: string,
  sequence: number,
): string {
  return datePrefix + generateShortCode(sequence);
}

/**
 * displayId에서 날짜 부분 추출
 * @param displayId - 완전한 displayId
 * @returns YYYYMMDD 형식 날짜 문자열
 */
export function extractDateFromDisplayId(displayId: string): string {
  return displayId.substring(0, 8);
}

/**
 * displayId에서 단축코드 부분 추출
 * @param displayId - 완전한 displayId
 * @returns 단축코드 문자열
 */
export function extractShortCodeFromDisplayId(displayId: string): string {
  return displayId.substring(8);
}
