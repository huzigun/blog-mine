# SubscriptionGate Component

구독이 필요한 프리미엄 기능을 보호하는 컴포넌트입니다. 구독이 없거나 만료된 사용자에게는 블러 처리된 미리보기와 업그레이드 CTA를 표시합니다.

## 기본 사용법

```vue
<script setup>
// 컴포넌트는 자동으로 import됨 (Nuxt auto-import)
</script>

<template>
  <SubscriptionGate>
    <!-- 프리미엄 콘텐츠 -->
    <div class="space-y-4">
      <h1>고급 분석 대시보드</h1>
      <AnalyticsChart />
      <DetailedMetrics />
    </div>
  </SubscriptionGate>
</template>
```

## Props

### `requiredStatus`
- **타입**: `('ACTIVE' | 'TRIAL' | 'PAST_DUE')[]`
- **기본값**: `['ACTIVE', 'TRIAL']`
- **설명**: 접근을 허용할 구독 상태 목록

```vue
<!-- ACTIVE만 허용 (TRIAL 제외) -->
<SubscriptionGate :required-status="['ACTIVE']">
  <EnterpriseFeature />
</SubscriptionGate>

<!-- ACTIVE와 PAST_DUE 허용 (결제 지연도 OK) -->
<SubscriptionGate :required-status="['ACTIVE', 'PAST_DUE']">
  <FlexibleFeature />
</SubscriptionGate>
```

### `blurIntensity`
- **타입**: `'sm' | 'md' | 'lg'`
- **기본값**: `'md'`
- **설명**: 블러 효과 강도

```vue
<!-- 약한 블러 (힌트 많이) -->
<SubscriptionGate blur-intensity="sm">
  <ContentPreview />
</SubscriptionGate>

<!-- 강한 블러 (힌트 적게) -->
<SubscriptionGate blur-intensity="lg">
  <SensitiveContent />
</SubscriptionGate>
```

### `showPreview`
- **타입**: `boolean`
- **기본값**: `true`
- **설명**: 미리보기 허용 여부

```vue
<!-- 미리보기 허용 (블러 처리) -->
<SubscriptionGate :show-preview="true">
  <FeatureDemo />
</SubscriptionGate>

<!-- 미리보기 비허용 (완전히 가림) -->
<SubscriptionGate :show-preview="false">
  <ExclusiveContent />
</SubscriptionGate>
```

### `upgradeMessage`
- **타입**: `string`
- **기본값**: `'이 기능을 사용하려면 구독이 필요합니다.'`
- **설명**: 업그레이드 유도 메시지

```vue
<SubscriptionGate
  upgrade-message="고급 분석 기능은 PRO 플랜 이상에서 사용할 수 있습니다."
>
  <AdvancedAnalytics />
</SubscriptionGate>
```

### `upgradeButtonText`
- **타입**: `string`
- **기본값**: `'플랜 업그레이드'`
- **설명**: 업그레이드 버튼 텍스트

```vue
<SubscriptionGate upgrade-button-text="PRO 플랜으로 업그레이드">
  <ProFeature />
</SubscriptionGate>
```

## Slots

### `default` (기본 슬롯)
보호할 프리미엄 콘텐츠를 배치합니다.

```vue
<SubscriptionGate>
  <!-- 프리미엄 콘텐츠 -->
  <YourContent />
</SubscriptionGate>
```

### `locked` (커스텀 메시지)
업그레이드 카드의 내용을 커스터마이징할 수 있습니다.

```vue
<SubscriptionGate>
  <template #locked>
    <div class="space-y-4">
      <h3 class="text-lg font-bold">🚀 API 액세스</h3>
      <p>ENTERPRISE 플랜에서 사용 가능합니다.</p>

      <div class="bg-primary/10 p-4 rounded-lg">
        <ul class="space-y-2">
          <li>✓ REST API 전체 액세스</li>
          <li>✓ 월 100만 요청</li>
          <li>✓ 전용 API 키</li>
          <li>✓ Webhook 지원</li>
        </ul>
      </div>

      <p class="text-sm text-neutral-500">
        문의: enterprise@example.com
      </p>
    </div>
  </template>

  <ApiDocumentation />
</SubscriptionGate>
```

## 사용 예시

### 1. 기본 사용 (프리미엄 기능 보호)

```vue
<template>
  <div class="container">
    <h1>AI 원고 생성</h1>

    <SubscriptionGate>
      <AiPostGenerator />
    </SubscriptionGate>
  </div>
</template>
```

### 2. 부분 보호 (일부만 프리미엄)

```vue
<template>
  <div class="space-y-6">
    <!-- 무료 사용자도 볼 수 있음 -->
    <BasicDashboard />

    <!-- 프리미엄만 사용 가능 -->
    <SubscriptionGate>
      <AdvancedAnalytics />
    </SubscriptionGate>

    <!-- 무료 사용자도 볼 수 있음 -->
    <Footer />
  </div>
</template>
```

### 3. 엔터프라이즈 전용 기능

```vue
<template>
  <SubscriptionGate
    :required-status="['ACTIVE']"
    blur-intensity="lg"
    upgrade-message="API 액세스는 ENTERPRISE 플랜에서만 제공됩니다."
    upgrade-button-text="ENTERPRISE 문의"
  >
    <template #locked>
      <div class="text-center space-y-4">
        <div class="i-heroicons-code-bracket text-6xl text-primary mx-auto" />
        <h3 class="text-2xl font-bold">API 액세스</h3>
        <p>프로그래밍 방식으로 서비스에 액세스하세요.</p>
        <ul class="text-left max-w-sm mx-auto space-y-2">
          <li>✓ RESTful API</li>
          <li>✓ GraphQL 지원</li>
          <li>✓ 실시간 Webhook</li>
          <li>✓ 전용 지원</li>
        </ul>
      </div>
    </template>

    <ApiExplorer />
  </SubscriptionGate>
</template>
```

### 4. 조건부 적용

```vue
<script setup>
const showPremiumFeature = ref(true);
</script>

<template>
  <div>
    <UToggle v-model="showPremiumFeature" label="고급 기능 표시" />

    <SubscriptionGate v-if="showPremiumFeature">
      <PremiumChart />
    </SubscriptionGate>
  </div>
</template>
```

### 5. 페이지 전체 보호

```vue
<!-- pages/console/advanced-analytics.vue -->
<script setup>
definePageMeta({
  middleware: 'auth',
  layout: 'console',
});
</script>

<template>
  <SubscriptionGate
    blur-intensity="md"
    upgrade-message="고급 분석은 PRO 플랜 이상에서 사용할 수 있습니다."
  >
    <div class="space-y-6">
      <h1>고급 분석</h1>
      <AnalyticsGrid />
      <DetailedReports />
      <ExportTools />
    </div>
  </SubscriptionGate>
</template>
```

## 동작 방식

1. **구독 확인**: `useAuth()` store의 `subscription` 상태 확인
2. **상태 비교**: 현재 상태가 `requiredStatus`에 포함되는지 검사
3. **조건부 렌더링**:
   - ✅ **구독 있음**: 콘텐츠 정상 표시
   - ❌ **구독 없음/만료**:
     - `showPreview=true`: 블러 처리 + 오버레이
     - `showPreview=false`: 완전히 가림 + 오버레이

## 스타일링

### 블러 강도
- `sm`: `blur-sm` (4px) - 내용 대부분 보임
- `md`: `blur-md` (8px) - 내용 희미하게 보임 (기본값)
- `lg`: `blur-lg` (12px) - 내용 거의 안 보임

### 오버레이
- 배경: 반투명 검은색 (`bg-neutral-900/50`)
- Backdrop blur: `backdrop-blur-sm`
- 중앙 정렬 카드

## 접근성

- ✅ 키보드 네비게이션 지원
- ✅ 명확한 업그레이드 안내
- ✅ 현재 구독 상태 표시
- ✅ 업그레이드 경로 명확히 제공

## 주의사항

1. **백엔드 보안**: 이 컴포넌트는 UI만 제어합니다. 백엔드 API에서 반드시 구독 검증을 해야 합니다.

2. **SEO**: 블러 처리된 콘텐츠도 HTML에 포함되므로 검색 엔진에 노출될 수 있습니다.

3. **성능**: 큰 콘텐츠에 블러를 적용하면 성능에 영향을 줄 수 있습니다.

## 관련 문서

- [useAuth() Composable](/composables/useAuth.md)
- [Subscription Types](/types/subscription.d.ts)
- [Pricing Page](/pages/pricing.vue)
