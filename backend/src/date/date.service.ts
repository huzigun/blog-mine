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
}
