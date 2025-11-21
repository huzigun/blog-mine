# Scheduler Module

NestJS 스케줄링 모듈 - Cron 작업을 관리하는 인프라 계층 모듈입니다.

## 개요

이 모듈은 `@nestjs/schedule`을 사용하여 주기적으로 실행되는 작업을 관리합니다. 컨트롤러가 없는 인프라 모듈로 백그라운드 작업을 처리합니다.

## 설치

```bash
pnpm add @nestjs/schedule
```

## 사용법

### 1. 기본 Cron 작업

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDailyTask() {
    this.logger.log('매일 자정에 실행됩니다');
    // 작업 로직
  }
}
```

### 2. 커스텀 Cron 표현식

```typescript
// 매주 월요일 오전 9시
@Cron('0 9 * * 1')
async handleWeeklyTask() {
  this.logger.log('매주 월요일 9시에 실행');
}

// 매월 1일 오전 6시
@Cron('0 6 1 * *')
async handleMonthlyTask() {
  this.logger.log('매월 1일 6시에 실행');
}
```

### 3. 타임존 설정

```typescript
@Cron('0 0 * * *', {
  timeZone: 'Asia/Seoul',
})
async handleTaskWithTimeZone() {
  this.logger.log('한국 시간 기준 자정에 실행');
}
```

### 4. Interval 작업

```typescript
import { Interval } from '@nestjs/schedule';

@Interval(10000) // 10초마다 실행
async handleIntervalTask() {
  this.logger.log('10초마다 실행');
}
```

### 5. Timeout 작업 (앱 시작 후 한 번 실행)

```typescript
import { Timeout } from '@nestjs/schedule';

@Timeout(5000) // 5초 후 한 번 실행
async handleTimeoutTask() {
  this.logger.log('앱 시작 5초 후 한 번 실행');
}
```

## 주요 Cron 표현식

| 표현식 | 설명 |
|--------|------|
| `CronExpression.EVERY_SECOND` | 매초 |
| `CronExpression.EVERY_5_SECONDS` | 5초마다 |
| `CronExpression.EVERY_10_SECONDS` | 10초마다 |
| `CronExpression.EVERY_30_SECONDS` | 30초마다 |
| `CronExpression.EVERY_MINUTE` | 매분 |
| `CronExpression.EVERY_5_MINUTES` | 5분마다 |
| `CronExpression.EVERY_10_MINUTES` | 10분마다 |
| `CronExpression.EVERY_30_MINUTES` | 30분마다 |
| `CronExpression.EVERY_HOUR` | 매시간 |
| `CronExpression.EVERY_DAY_AT_MIDNIGHT` | 매일 자정 |
| `CronExpression.EVERY_DAY_AT_NOON` | 매일 정오 |
| `CronExpression.EVERY_WEEK` | 매주 |
| `CronExpression.EVERY_MONTH` | 매월 |
| `CronExpression.EVERY_YEAR` | 매년 |

## Cron 표현식 형식

```
* * * * * *
│ │ │ │ │ │
│ │ │ │ │ └─ 요일 (0-7, 0과 7은 일요일)
│ │ │ │ └─── 월 (1-12)
│ │ │ └───── 일 (1-31)
│ │ └─────── 시 (0-23)
│ └───────── 분 (0-59)
└─────────── 초 (0-59, 선택사항)
```

### 예제

- `0 0 * * *` - 매일 자정
- `0 */2 * * *` - 2시간마다
- `0 9-17 * * 1-5` - 평일 9시부터 17시까지 매시간
- `*/10 * * * *` - 10분마다
- `0 0 1 * *` - 매월 1일 자정

## 실제 사용 예제

### 블로그 순위 추적 (매일 새벽 2시)

```typescript
@Cron('0 2 * * *', {
  name: 'daily-blog-rank-tracking',
  timeZone: 'Asia/Seoul',
})
async trackBlogRankings() {
  this.logger.log('블로그 순위 추적 시작');

  // 활성화된 키워드 추적 가져오기
  const trackings = await this.keywordTrackingService.findAllActive();

  for (const tracking of trackings) {
    try {
      // 네이버 API로 순위 데이터 수집
      await this.naverApiService.collectRankings(tracking);

      // 수집 시간 업데이트
      await this.keywordTrackingService.updateLastCollectedAt(tracking.id);

      this.logger.log(`순위 수집 완료: ${tracking.keyword}`);
    } catch (error) {
      this.logger.error(`순위 수집 실패: ${tracking.keyword}`, error.stack);
    }
  }
}
```

### 구독 만료 확인 (매일 오전 9시)

```typescript
@Cron('0 9 * * *', {
  name: 'check-expired-subscriptions',
  timeZone: 'Asia/Seoul',
})
async checkExpiredSubscriptions() {
  this.logger.log('구독 만료 확인 시작');

  const expiredSubs = await this.subscriptionService.findExpiredSubscriptions();

  for (const sub of expiredSubs) {
    await this.subscriptionService.markAsExpired(sub.id);
    await this.emailService.sendExpirationNotice(sub.userId);
  }

  this.logger.log(`${expiredSubs.length}개 구독 만료 처리 완료`);
}
```

### 크레딧 만료 처리 (매일 자정)

```typescript
@Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, {
  name: 'expire-credits',
  timeZone: 'Asia/Seoul',
})
async expireCredits() {
  this.logger.log('만료 크레딧 처리 시작');

  const expiredCredits = await this.creditService.findExpiredCredits();

  for (const credit of expiredCredits) {
    await this.creditService.expireCredit(credit.id);
  }

  this.logger.log(`${expiredCredits.length}개 크레딧 만료 처리 완료`);
}
```

## 모듈 구조

```
backend/src/lib/scheduler/
├── scheduler.module.ts    # 모듈 정의 (ScheduleModule.forRoot() 포함)
├── scheduler.service.ts   # Cron 작업 정의
├── index.ts              # Export 파일
└── README.md             # 이 문서
```

## 주의사항

1. **서버 시간대**: 배포 환경의 시간대를 확인하고 `timeZone` 옵션 사용
2. **로깅**: 모든 Cron 작업은 시작/종료 로그를 남기기
3. **에러 처리**: Try-catch로 에러를 잡아 전체 작업이 중단되지 않도록 처리
4. **성능**: 오래 걸리는 작업은 큐(Bull, BullMQ)를 고려
5. **중복 실행 방지**: 분산 환경에서는 Redis 락 등을 사용하여 중복 실행 방지

## 참고 자료

- [NestJS Schedule 공식 문서](https://docs.nestjs.com/techniques/task-scheduling)
- [Cron 표현식 생성기](https://crontab.guru/)
- [node-cron GitHub](https://github.com/node-cron/node-cron)
