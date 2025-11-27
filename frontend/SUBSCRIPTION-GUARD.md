# 구독 가드 (Subscription Guard)

특정 페이지에서 유료 구독이 필요한 기능에 대해 블러 처리 및 구독 안내 모달을 표시하는 기능입니다.

## 기능

- ✅ 비활성 구독 시 화면 블러 처리
- ✅ 구독 안내 모달 자동 표시
- ✅ 구독 페이지로 이동 기능
- ✅ 반응형 디자인
- ✅ 재사용 가능한 컴포넌트

## 구성 요소

### 1. Composable: `useSubscriptionGuard`

구독 상태 확인 및 모달 제어 로직을 담당하는 composable입니다.

**위치**: `frontend/app/composables/useSubscriptionGuard.ts`

**기능**:
- `checkSubscription()`: 구독 상태 확인
- `closeModal()`: 모달 닫기
- `goToSubscription()`: 구독 페이지로 이동
- `hasActiveSubscription`: 활성 구독 여부 (computed)
- `isModalOpen`: 모달 열림 상태 (ref)

### 2. 컴포넌트: `SubscriptionGuard`

페이지 콘텐츠를 감싸서 구독 상태에 따라 블러 처리 및 모달을 표시하는 래퍼 컴포넌트입니다.

**위치**: `frontend/app/components/subscription/SubscriptionGuard.vue`

**기능**:
- 비활성 구독 시 자동으로 콘텐츠 블러 처리
- 오버레이에 "구독하고 이용하기" 버튼 표시
- 구독 안내 모달 자동 표시

### 3. 컴포넌트: `SubscriptionRequiredModal`

구독이 필요함을 안내하는 모달 컴포넌트입니다.

**위치**: `frontend/app/components/subscription/SubscriptionRequiredModal.vue`

**Props**:
- `open`: boolean - 모달 열림/닫힘 상태

**Events**:
- `close`: 모달 닫기
- `subscribe`: 구독하기 버튼 클릭

## 사용 방법

### 기본 사용법

페이지 전체에 구독 가드를 적용하려면 `<SubscriptionGuard>` 컴포넌트로 콘텐츠를 감싸면 됩니다.

```vue
<template>
  <SubscriptionGuard>
    <!-- 실제 페이지 콘텐츠 -->
    <div>
      <h1>AI 이미지 생성</h1>
      <p>이 기능은 유료 구독이 필요합니다.</p>
    </div>
  </SubscriptionGuard>
</template>
```

### 실제 예시: AI 이미지 페이지

```vue
<script lang="ts" setup>
definePageMeta({
  layout: 'default',
  middleware: ['auth'],
});
</script>

<template>
  <SubscriptionGuard>
    <ComingSoon
      title="AI 이미지 생성 서비스 준비중"
      description="고품질 AI 이미지 생성 기능을 준비하고 있습니다."
      icon="i-heroicons-photo"
    >
      <!-- 콘텐츠 -->
    </ComingSoon>
  </SubscriptionGuard>
</template>
```

### 커스텀 사용법

Composable을 직접 사용하여 더 세밀한 제어가 필요한 경우:

```vue
<script setup lang="ts">
const {
  isModalOpen,
  hasActiveSubscription,
  checkSubscription,
  closeModal,
  goToSubscription,
} = useSubscriptionGuard();

onMounted(() => {
  // 페이지 진입 시 구독 상태 확인
  checkSubscription();
});

// 특정 액션 실행 전 구독 상태 확인
const handleAction = () => {
  if (!checkSubscription()) {
    return; // 구독이 없으면 모달이 뜨고 함수 종료
  }
  // 구독이 있으면 실제 로직 실행
  performAction();
};
</script>

<template>
  <div>
    <div :class="{ 'blur-sm': !hasActiveSubscription }">
      <!-- 콘텐츠 -->
    </div>

    <SubscriptionSubscriptionRequiredModal
      :open="isModalOpen"
      @close="closeModal"
      @subscribe="goToSubscription"
    />
  </div>
</template>
```

## 구독 상태 확인 로직

구독 가드는 `authStore`의 `hasActiveSubscription` getter를 사용합니다:

```typescript
// frontend/app/stores/auth.ts
hasActiveSubscription: (state) =>
  state.subscription?.status === 'ACTIVE' ||
  state.subscription?.status === 'TRIAL'
```

**활성 구독 상태**:
- `ACTIVE`: 유료 구독 활성
- `TRIAL`: 무료 체험 중

**비활성 구독 상태**:
- `PAST_DUE`: 결제 실패 (유예 기간)
- `CANCELED`: 사용자 취소
- `EXPIRED`: 만료됨
- `null`: 구독 정보 없음

## 스타일링

### 블러 효과
- 비활성 구독 시 `blur-sm` 클래스 적용 (4px blur)
- `pointer-events-none`으로 클릭 방지
- `select-none`으로 텍스트 선택 방지

### 오버레이
- 반투명 배경: `bg-neutral-900/20` (라이트 모드)
- 반투명 배경: `bg-neutral-950/40` (다크 모드)
- 추가 블러: `backdrop-blur-[2px]`

### 모달
- 최대 너비: `sm:max-w-md`
- 반응형: 모바일에서는 풀 너비, 데스크탑에서는 고정 너비
- Nuxt UI v4 스타일 사용

## 적용 가능한 페이지

구독 가드는 다음과 같은 페이지에 적용할 수 있습니다:

- ✅ AI 이미지 생성 페이지
- ✅ 고급 분석 페이지
- ✅ 우선 처리 기능
- ✅ API 접근 페이지
- ✅ 커스텀 페르소나 생성
- ✅ 무제한 블로그 생성

## 주의사항

1. **인증 미들웨어 필수**: 구독 가드는 로그인된 사용자를 전제로 하므로, 페이지에 `middleware: ['auth']`를 반드시 추가해야 합니다.

2. **구독 정보 로드**: authStore의 `fetchSubscription()`이 호출되어 구독 정보가 로드되어 있어야 합니다. 로그인 시 자동으로 호출됩니다.

3. **구독 페이지 경로**: 기본적으로 `/pricing` 페이지로 이동합니다. 다른 경로를 사용하려면 composable의 `goToSubscription` 함수를 수정해야 합니다.

## 테스트

구독 가드를 테스트하려면:

1. **비구독 상태 테스트**:
   - 무료 플랜 사용자로 로그인
   - 또는 authStore에서 `subscription`을 `null`로 설정
   - 구독 가드가 적용된 페이지 방문
   - 블러 및 모달이 표시되는지 확인

2. **활성 구독 테스트**:
   - 유료 플랜 사용자로 로그인
   - 또는 authStore에서 `subscription.status`를 `'ACTIVE'`로 설정
   - 구독 가드가 적용된 페이지 방문
   - 콘텐츠가 정상적으로 표시되는지 확인

## 개선 사항

향후 추가될 수 있는 기능:

- [ ] 플랜별 다른 메시지 표시
- [ ] 특정 기능만 제한하는 부분 가드
- [ ] 무료 체험 기간 만료 안내
- [ ] 구독 업그레이드 추천
- [ ] A/B 테스트를 위한 다양한 모달 스타일
