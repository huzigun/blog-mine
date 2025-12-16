# 실시간 알림 시스템 구현 플랜

## 개요

고객에게 실시간 알림을 제공하는 시스템을 구현합니다. SSE(Server-Sent Events)를 활용하여 실시간 알림 전달을 구현하고, 기존 header.vue의 임시 알림 UI를 실제 시스템으로 교체합니다.

---

## 1. 데이터베이스 설계

### 1.1 Prisma Schema

```prisma
// prisma/schema.prisma에 추가

enum NotificationType {
  SYSTEM           // 시스템 공지
  BLOG_POST        // 원고 생성 완료/실패
  SUBSCRIPTION     // 구독 관련 (결제, 만료 임박, 갱신)
  CREDIT           // 크레딧 관련 (충전, 부족)
  PROMOTION        // 프로모션/이벤트
}

model Notification {
  id          Int              @id @default(autoincrement())
  userId      Int              @map("user_id")
  type        NotificationType
  title       String           @db.VarChar(200)
  message     String
  data        Json?            // 추가 데이터 (링크, 관련 ID 등)
  isRead      Boolean          @default(false) @map("is_read")
  readAt      DateTime?        @map("read_at")
  createdAt   DateTime         @default(now()) @map("created_at")

  user        User             @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, isRead])
  @@index([userId, createdAt])
  @@map("notifications")
}
```

### 1.2 User 모델 관계 추가

```prisma
model User {
  // ... 기존 필드들
  notifications Notification[]
}
```

### 1.3 마이그레이션 SQL

```sql
-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('SYSTEM', 'BLOG_POST', 'SUBSCRIPTION', 'CREDIT', 'PROMOTION');

-- CreateTable
CREATE TABLE "notifications" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notifications_user_id_is_read_idx" ON "notifications"("user_id", "is_read");
CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications"("user_id", "created_at");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

---

## 2. 백엔드 구현

### 2.1 모듈 구조

```
backend/src/modules/notification/
├── notification.module.ts
├── notification.controller.ts
├── notification.service.ts
├── dto/
│   ├── create-notification.dto.ts
│   └── filter-notification.dto.ts
└── types/
    └── notification.types.ts
```

### 2.2 NotificationService 메서드

| 메서드 | 설명 |
|--------|------|
| `create(userId, type, title, message, data?)` | 알림 생성 + SSE 전송 |
| `findAll(userId, filter)` | 알림 목록 조회 (페이지네이션) |
| `getUnreadCount(userId)` | 읽지 않은 알림 수 조회 |
| `markAsRead(userId, notificationId)` | 단일 알림 읽음 처리 |
| `markAllAsRead(userId)` | 전체 알림 읽음 처리 |
| `delete(userId, notificationId)` | 알림 삭제 |
| `deleteOldNotifications(days)` | 오래된 알림 삭제 (스케줄러용) |
| `subscribe(userId)` | SSE 구독 등록 |
| `unsubscribe(userId)` | SSE 구독 해제 |

### 2.3 API 엔드포인트

| Method | Endpoint | 설명 | Auth |
|--------|----------|------|------|
| GET | `/notifications` | 알림 목록 조회 | Required |
| GET | `/notifications/unread-count` | 읽지 않은 알림 수 | Required |
| GET | `/notifications/stream` | SSE 스트림 연결 | Required |
| PATCH | `/notifications/:id/read` | 단일 읽음 처리 | Required |
| PATCH | `/notifications/read-all` | 전체 읽음 처리 | Required |
| DELETE | `/notifications/:id` | 알림 삭제 | Required |

### 2.4 SSE 구현 방식

```typescript
// NestJS SSE 엔드포인트
@Sse('stream')
@UseGuards(JwtAuthGuard)
stream(@Req() req): Observable<MessageEvent> {
  const userId = req.user.id;
  return this.notificationService.subscribe(userId);
}

// NotificationService 내부
private subjects = new Map<number, Subject<Notification>>();

subscribe(userId: number): Observable<MessageEvent> {
  if (!this.subjects.has(userId)) {
    this.subjects.set(userId, new Subject<Notification>());
  }

  return this.subjects.get(userId)!.pipe(
    map((notification) => ({
      data: JSON.stringify(notification),
    })),
  );
}

// 알림 생성 시 SSE로 전송
async create(...) {
  const notification = await this.prisma.notification.create({ ... });

  // SSE 구독자에게 전송
  const subject = this.subjects.get(userId);
  if (subject) {
    subject.next(notification);
  }

  return notification;
}
```

### 2.5 DTO 정의

```typescript
// create-notification.dto.ts
export class CreateNotificationDto {
  @IsInt()
  userId: number;

  @IsEnum(NotificationType)
  type: NotificationType;

  @IsString()
  @MaxLength(200)
  title: string;

  @IsString()
  message: string;

  @IsOptional()
  @IsObject()
  data?: Record<string, any>;
}

// filter-notification.dto.ts
export class FilterNotificationDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 20;

  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;

  @IsOptional()
  @IsBoolean()
  isRead?: boolean;
}
```

---

## 3. 프론트엔드 구현

### 3.1 타입 정의

```typescript
// frontend/app/type/notification.d.ts
type NotificationType = 'SYSTEM' | 'BLOG_POST' | 'SUBSCRIPTION' | 'CREDIT' | 'PROMOTION';

interface Notification {
  id: number;
  userId: number;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

interface NotificationFilter {
  page?: number;
  limit?: number;
  type?: NotificationType;
  isRead?: boolean;
}
```

### 3.2 Composable

```typescript
// frontend/app/composables/useNotifications.ts
export function useNotifications() {
  const notifications = ref<Notification[]>([]);
  const unreadCount = ref(0);
  const isConnected = ref(false);
  let eventSource: EventSource | null = null;

  // 알림 목록 조회
  async function fetchNotifications(filter?: NotificationFilter) { ... }

  // 읽지 않은 알림 수 조회
  async function fetchUnreadCount() { ... }

  // 단일 읽음 처리
  async function markAsRead(id: number) { ... }

  // 전체 읽음 처리
  async function markAllAsRead() { ... }

  // SSE 연결
  function connectSSE() {
    const token = useCookie('access_token');
    eventSource = new EventSource(`/api/notifications/stream?token=${token.value}`);

    eventSource.onmessage = (event) => {
      const notification = JSON.parse(event.data);
      notifications.value.unshift(notification);
      unreadCount.value++;
    };

    eventSource.onopen = () => { isConnected.value = true; };
    eventSource.onerror = () => { isConnected.value = false; };
  }

  // SSE 연결 해제
  function disconnectSSE() {
    eventSource?.close();
    isConnected.value = false;
  }

  return {
    notifications,
    unreadCount,
    isConnected,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    connectSSE,
    disconnectSSE,
  };
}
```

### 3.3 Header 컴포넌트 수정

```vue
<!-- frontend/app/components/console/header.vue -->
<script setup lang="ts">
const {
  notifications,
  unreadCount,
  fetchNotifications,
  fetchUnreadCount,
  markAsRead,
  markAllAsRead,
  connectSSE,
  disconnectSSE
} = useNotifications();

// 컴포넌트 마운트 시 초기화
onMounted(async () => {
  await fetchNotifications({ limit: 5 });
  await fetchUnreadCount();
  connectSSE();
});

// 컴포넌트 언마운트 시 정리
onBeforeUnmount(() => {
  disconnectSSE();
});

// 알림 클릭 핸들러
const handleNotificationClick = async (notification: Notification) => {
  if (!notification.isRead) {
    await markAsRead(notification.id);
  }

  // data에 따라 적절한 페이지로 이동
  if (notification.data?.link) {
    navigateTo(notification.data.link);
  }
};

// 알림 아이콘 매핑
const getNotificationIcon = (type: NotificationType) => {
  const icons = {
    SYSTEM: 'i-heroicons-bell',
    BLOG_POST: 'i-heroicons-document-text',
    SUBSCRIPTION: 'i-heroicons-credit-card',
    CREDIT: 'i-heroicons-wallet',
    PROMOTION: 'i-heroicons-gift',
  };
  return icons[type] || 'i-heroicons-bell';
};
</script>
```

### 3.4 알림 아이템 컴포넌트

```
frontend/app/components/notification/
├── NotificationItem.vue      # 단일 알림 표시
├── NotificationList.vue      # 알림 목록 (드롭다운용)
└── NotificationBadge.vue     # 읽지 않은 알림 수 배지
```

---

## 4. 알림 발송 트리거

### 4.1 자동 발송 연동 위치

| 서비스 | 트리거 | 알림 타입 | 제목 예시 |
|--------|--------|----------|----------|
| BlogPostService | 원고 생성 완료 | BLOG_POST | 원고 생성이 완료되었습니다 |
| BlogPostService | 원고 생성 실패 | BLOG_POST | 원고 생성에 실패했습니다 |
| SubscriptionService | 구독 갱신 성공 | SUBSCRIPTION | 구독이 갱신되었습니다 |
| SubscriptionService | 결제 실패 | SUBSCRIPTION | 결제에 실패했습니다 |
| SubscriptionService | 만료 임박 (3일 전) | SUBSCRIPTION | 구독이 곧 만료됩니다 |
| CreditService | 크레딧 충전 완료 | CREDIT | 크레딧이 충전되었습니다 |
| CreditService | 크레딧 부족 알림 | CREDIT | 크레딧이 부족합니다 |

### 4.2 알림 발송 헬퍼 메서드

```typescript
// NotificationService에 추가
async sendBlogPostCompleted(userId: number, blogPostId: number, displayId: string) {
  return this.create(userId, 'BLOG_POST', '원고 생성 완료',
    `원고(${displayId})가 성공적으로 생성되었습니다.`,
    { link: `/console/workspace/${blogPostId}`, blogPostId }
  );
}

async sendBlogPostFailed(userId: number, blogPostId: number, displayId: string, reason: string) {
  return this.create(userId, 'BLOG_POST', '원고 생성 실패',
    `원고(${displayId}) 생성에 실패했습니다: ${reason}`,
    { link: `/console/workspace/${blogPostId}`, blogPostId }
  );
}

async sendSubscriptionRenewed(userId: number, planName: string) {
  return this.create(userId, 'SUBSCRIPTION', '구독 갱신 완료',
    `${planName} 플랜이 성공적으로 갱신되었습니다.`,
    { link: '/mypage/subscription' }
  );
}

async sendPaymentFailed(userId: number, reason: string) {
  return this.create(userId, 'SUBSCRIPTION', '결제 실패',
    `결제에 실패했습니다: ${reason}. 결제 수단을 확인해주세요.`,
    { link: '/mypage/payment' }
  );
}

async sendCreditCharged(userId: number, amount: number) {
  return this.create(userId, 'CREDIT', '크레딧 충전 완료',
    `${amount.toLocaleString()} BloC가 충전되었습니다.`,
    { link: '/mypage/credits' }
  );
}
```

---

## 5. 스케줄러 작업

### 5.1 오래된 알림 삭제

```typescript
// scheduler.service.ts에 추가
@Cron('0 0 3 * * *') // 매일 03:00 KST
async handleOldNotificationCleanup() {
  const deletedCount = await this.notificationService.deleteOldNotifications(30);
  this.logger.log(`Deleted ${deletedCount} old notifications`);
}
```

### 5.2 구독 만료 임박 알림

```typescript
// scheduler.service.ts에 추가
@Cron('0 0 9 * * *') // 매일 09:00 KST
async handleSubscriptionExpiryReminder() {
  const expiringSubscriptions = await this.subscriptionService.findExpiringInDays(3);

  for (const sub of expiringSubscriptions) {
    await this.notificationService.create(
      sub.userId,
      'SUBSCRIPTION',
      '구독 만료 예정',
      `구독이 ${sub.daysUntilExpiry}일 후 만료됩니다. 자동 갱신을 확인해주세요.`,
      { link: '/mypage/subscription' }
    );
  }
}
```

---

## 6. 구현 순서 및 체크리스트

### Phase 1: 데이터베이스 (직접 실행)
- [ ] Prisma 스키마에 NotificationType enum 추가
- [ ] Prisma 스키마에 Notification 모델 추가
- [ ] User 모델에 notifications 관계 추가
- [ ] `pnpm prisma migrate dev --name add_notification_system` 실행
- [ ] `pnpm prisma generate` 실행

### Phase 2: 백엔드 기본 구조
- [ ] notification 모듈 폴더 생성
- [ ] DTO 파일 생성
- [ ] NotificationService 구현
- [ ] NotificationController 구현 (REST API)
- [ ] NotificationModule 설정 및 AppModule에 등록

### Phase 3: SSE 실시간 연동
- [ ] NotificationService에 SSE 관련 메서드 추가
- [ ] SSE 엔드포인트 추가 (/notifications/stream)
- [ ] 프론트엔드 타입 정의 추가
- [ ] useNotifications composable 구현
- [ ] Header 컴포넌트 수정

### Phase 4: 알림 발송 연동
- [ ] NotificationService에 헬퍼 메서드 추가
- [ ] BlogPostService에 알림 발송 연동
- [ ] SubscriptionService에 알림 발송 연동
- [ ] CreditService에 알림 발송 연동

### Phase 5: 스케줄러 및 마무리
- [ ] 오래된 알림 삭제 스케줄러 추가
- [ ] 구독 만료 알림 스케줄러 추가
- [ ] 테스트 및 검증

---

## 7. 고려사항

### 성능
- 알림 조회 시 복합 인덱스 활용 (userId + isRead, userId + createdAt)
- SSE 연결 풀 관리 (메모리 누수 방지)
- 오래된 알림 자동 삭제로 DB 크기 관리

### 보안
- SSE 엔드포인트 인증 필수 (JWT 토큰 검증)
- 사용자별 알림 접근 권한 검증

### UX
- 알림 클릭 시 관련 페이지로 자동 이동
- 읽음 상태 실시간 반영
- 알림 타입별 아이콘 및 색상 구분
- 연결 끊김 시 자동 재연결 시도

### 확장성
- data 필드로 유연한 메타데이터 저장
- NotificationType으로 타입별 처리 가능
- 추후 푸시 알림, 이메일 알림 연동 가능

---

## 8. 예상 작업 시간

| Phase | 작업 | 예상 시간 |
|-------|------|----------|
| 1 | 데이터베이스 | 10분 |
| 2 | 백엔드 기본 구조 | 1시간 |
| 3 | SSE 실시간 연동 | 1시간 30분 |
| 4 | 알림 발송 연동 | 1시간 |
| 5 | 스케줄러 및 마무리 | 30분 |
| **Total** | | **4시간 10분** |

---

## 변경 이력

| 날짜 | 버전 | 변경 내용 |
|------|------|----------|
| 2024-12-16 | 1.0 | 초기 플랜 작성 |
