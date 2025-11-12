import { Injectable } from '@nestjs/common';
import * as dayjs from 'dayjs';
import * as utc from 'dayjs/plugin/utc';
import * as timezone from 'dayjs/plugin/timezone';

// dayjs 플러그인 활성화
dayjs.extend(utc);
dayjs.extend(timezone);

// 기본 타임존을 Asia/Seoul로 설정
dayjs.tz.setDefault('Asia/Seoul');

@Injectable()
export class DateService {
  /**
   * 현재 시간 반환 (Asia/Seoul 타임존)
   */
  now(): dayjs.Dayjs {
    return dayjs().tz('Asia/Seoul');
  }

  /**
   * 날짜 문자열 또는 Date 객체를 dayjs 객체로 변환 (Asia/Seoul 타임존)
   */
  parse(date?: string | Date): dayjs.Dayjs {
    return dayjs(date).tz('Asia/Seoul');
  }

  /**
   * 오늘 날짜를 YYYY-MM-DD 형식으로 반환
   */
  getTodayDateStr(): string {
    return this.now().format('YYYY-MM-DD');
  }

  /**
   * 특정 날짜를 YYYY-MM-DD 형식으로 반환
   */
  formatDate(date: string | Date | dayjs.Dayjs, format = 'YYYY-MM-DD'): string {
    if (dayjs.isDayjs(date)) {
      return date.tz('Asia/Seoul').format(format);
    }
    return dayjs(date).tz('Asia/Seoul').format(format);
  }

  /**
   * 특정 날짜를 YYYY-MM-DD HH:mm:ss 형식으로 반환
   */
  formatDateTime(
    date: string | Date | dayjs.Dayjs,
    format = 'YYYY-MM-DD HH:mm:ss',
  ): string {
    if (dayjs.isDayjs(date)) {
      return date.tz('Asia/Seoul').format(format);
    }
    return dayjs(date).tz('Asia/Seoul').format(format);
  }

  /**
   * 두 날짜 간의 차이 계산
   */
  diff(
    date1: string | Date | dayjs.Dayjs,
    date2: string | Date | dayjs.Dayjs,
    unit: dayjs.UnitType = 'day',
  ): number {
    const d1 = dayjs.isDayjs(date1) ? date1 : dayjs(date1).tz('Asia/Seoul');
    const d2 = dayjs.isDayjs(date2) ? date2 : dayjs(date2).tz('Asia/Seoul');
    return d1.diff(d2, unit);
  }

  /**
   * 날짜에 시간 추가
   */
  add(
    date: string | Date | dayjs.Dayjs,
    amount: number,
    unit: dayjs.ManipulateType,
  ): dayjs.Dayjs {
    if (dayjs.isDayjs(date)) {
      return date.add(amount, unit).tz('Asia/Seoul');
    }
    return dayjs(date).tz('Asia/Seoul').add(amount, unit);
  }

  /**
   * 날짜에서 시간 빼기
   */
  subtract(
    date: string | Date | dayjs.Dayjs,
    amount: number,
    unit: dayjs.ManipulateType,
  ): dayjs.Dayjs {
    if (dayjs.isDayjs(date)) {
      return date.subtract(amount, unit).tz('Asia/Seoul');
    }
    return dayjs(date).tz('Asia/Seoul').subtract(amount, unit);
  }

  /**
   * 날짜가 다른 날짜보다 이전인지 확인
   */
  isBefore(
    date1: string | Date | dayjs.Dayjs,
    date2: string | Date | dayjs.Dayjs,
  ): boolean {
    const d1 = dayjs.isDayjs(date1) ? date1 : dayjs(date1).tz('Asia/Seoul');
    const d2 = dayjs.isDayjs(date2) ? date2 : dayjs(date2).tz('Asia/Seoul');
    return d1.isBefore(d2);
  }

  /**
   * 날짜가 다른 날짜보다 이후인지 확인
   */
  isAfter(
    date1: string | Date | dayjs.Dayjs,
    date2: string | Date | dayjs.Dayjs,
  ): boolean {
    const d1 = dayjs.isDayjs(date1) ? date1 : dayjs(date1).tz('Asia/Seoul');
    const d2 = dayjs.isDayjs(date2) ? date2 : dayjs(date2).tz('Asia/Seoul');
    return d1.isAfter(d2);
  }

  /**
   * 두 날짜가 같은지 확인
   */
  isSame(
    date1: string | Date | dayjs.Dayjs,
    date2: string | Date | dayjs.Dayjs,
    unit: dayjs.OpUnitType = 'day',
  ): boolean {
    const d1 = dayjs.isDayjs(date1) ? date1 : dayjs(date1).tz('Asia/Seoul');
    const d2 = dayjs.isDayjs(date2) ? date2 : dayjs(date2).tz('Asia/Seoul');
    return d1.isSame(d2, unit);
  }

  /**
   * 날짜의 시작 시간 반환 (예: 일의 시작 00:00:00)
   */
  startOf(
    date: string | Date | dayjs.Dayjs,
    unit: dayjs.OpUnitType,
  ): dayjs.Dayjs {
    if (dayjs.isDayjs(date)) {
      return date.startOf(unit).tz('Asia/Seoul');
    }
    return dayjs(date).tz('Asia/Seoul').startOf(unit);
  }

  /**
   * 날짜의 끝 시간 반환 (예: 일의 끝 23:59:59)
   */
  endOf(
    date: string | Date | dayjs.Dayjs,
    unit: dayjs.OpUnitType,
  ): dayjs.Dayjs {
    if (dayjs.isDayjs(date)) {
      return date.endOf(unit).tz('Asia/Seoul');
    }
    return dayjs(date).tz('Asia/Seoul').endOf(unit);
  }

  /**
   * Date 객체로 변환
   */
  toDate(date: string | Date | dayjs.Dayjs): Date {
    if (dayjs.isDayjs(date)) {
      return date.tz('Asia/Seoul').toDate();
    }
    return dayjs(date).tz('Asia/Seoul').toDate();
  }

  /**
   * ISO 8601 문자열로 변환
   */
  toISOString(date: string | Date | dayjs.Dayjs): string {
    if (dayjs.isDayjs(date)) {
      return date.tz('Asia/Seoul').toISOString();
    }
    return dayjs(date).tz('Asia/Seoul').toISOString();
  }

  /**
   * Unix timestamp (초) 반환
   */
  toUnix(date: string | Date | dayjs.Dayjs): number {
    if (dayjs.isDayjs(date)) {
      return date.unix();
    }
    return dayjs(date).tz('Asia/Seoul').unix();
  }

  /**
   * Unix timestamp (밀리초) 반환
   */
  toMilliseconds(date: string | Date | dayjs.Dayjs): number {
    if (dayjs.isDayjs(date)) {
      return date.valueOf();
    }
    return dayjs(date).tz('Asia/Seoul').valueOf();
  }

  /**
   * Unix timestamp에서 dayjs 객체 생성
   */
  fromUnix(timestamp: number): dayjs.Dayjs {
    return dayjs.unix(timestamp).tz('Asia/Seoul');
  }

  /**
   * 날짜 유효성 검사
   */
  isValid(date: string | Date | dayjs.Dayjs): boolean {
    return dayjs(date).isValid();
  }

  /**
   * 로컬 날짜 문자열(YYYY-MM-DD)을 해당 날짜의 시작/끝 Date 객체로 변환
   *
   * 사용 사례: 날짜 필터링 시 사용자의 로컬 날짜로 검색할 때
   *
   * 예시:
   * - 한국(UTC+9)에서 "2024-01-15" 검색
   * - startOfDay: 2024-01-15 00:00:00 KST → 2024-01-14T15:00:00.000Z (UTC)
   * - endOfDay: 2024-01-15 23:59:59.999 KST → 2024-01-15T14:59:59.999Z (UTC)
   *
   * @param dateStr YYYY-MM-DD 형식의 날짜 문자열
   * @returns { start: Date, end: Date } - 해당 날짜의 시작과 끝 시간 (Date 객체, UTC로 저장됨)
   */
  getLocalDateRange(dateStr: string): { start: Date; end: Date } {
    // 로컬 타임존 기준으로 날짜의 시작과 끝을 계산
    const startOfDay = dayjs(dateStr).tz('Asia/Seoul').startOf('day').toDate();

    const endOfDay = dayjs(dateStr).tz('Asia/Seoul').endOf('day').toDate();

    return {
      start: startOfDay,
      end: endOfDay,
    };
  }

  /**
   * 두 날짜 문자열(YYYY-MM-DD)을 기간의 시작/끝 Date 객체로 변환
   *
   * @param startDateStr 시작 날짜 (YYYY-MM-DD)
   * @param endDateStr 종료 날짜 (YYYY-MM-DD)
   * @returns { start: Date, end: Date } - 기간의 시작과 끝 시간
   */
  getDateRangeForQuery(
    startDateStr?: string,
    endDateStr?: string,
  ): { start?: Date; end?: Date } {
    const result: { start?: Date; end?: Date } = {};

    if (startDateStr) {
      // 시작 날짜의 00:00:00 (로컬 타임존)
      result.start = dayjs(startDateStr)
        .tz('Asia/Seoul')
        .startOf('day')
        .toDate();
    }

    if (endDateStr) {
      // 종료 날짜의 23:59:59.999 (로컬 타임존)
      result.end = dayjs(endDateStr).tz('Asia/Seoul').endOf('day').toDate();
    }

    return result;
  }
}
