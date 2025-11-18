# 쿠키 관리 전략 가이드

## 🎯 핵심 답변

**질문**: "로컬에서는 포트가 달라서 Nuxt Server API로 구성했는데, 배포 후 같은 도메인에서 `/api`는 백엔드로 가게 하면 httpOnly 쿠키는 어떻게 관리해야 할까?"

**답변**: **현재 Nuxt Server API 구조를 그대로 유지하는 것을 권장합니다!** 배포 환경에서도 Nuxt Server API를 통해 백엔드와 통신하면 httpOnly 쿠키가 자동으로 잘 동작합니다.

---

## 🏗️ 현재 구조 (권장 방안)

```
┌─────────────────┐
│  사용자 브라우저  │
│  yourdomain.com │
└────────┬────────┘
         │ HTTPS
         ▼
┌─────────────────────┐
│ Nuxt SSR (Frontend) │
│   Port: 3000/8706   │
└────────┬────────────┘
         │
         │ /api/auth/login
         │ (Nuxt Server API)
         │
         ▼
┌─────────────────────┐
│  NestJS (Backend)   │
│   Port: 9706        │
└─────────────────────┘
```

### 동작 방식

1. **브라우저** → Nuxt Server API 호출 (`/api/auth/login`)
2. **Nuxt Server API** → 백엔드 호출 (`http://backend:9706/auth/login`)
3. **백엔드** → 토큰 반환
4. **Nuxt Server API** → httpOnly 쿠키 설정
5. **브라우저** → 쿠키 자동 저장 및 이후 요청에 포함

### httpOnly 쿠키 설정

[frontend/server/utils/cookies.ts](frontend/server/utils/cookies.ts)
```typescript
// 환경별 쿠키 설정
export function getCookieOptions(type: 'access' | 'refresh') {
  const isProduction = process.env.NODE_ENV === 'production';

  const baseOptions = {
    secure: isProduction,  // HTTPS only in production
    sameSite: isProduction ? ('strict' as const) : ('lax' as const),
    path: '/',
  };

  if (type === 'access') {
    return {
      ...baseOptions,
      httpOnly: false,  // 클라이언트 읽기 가능
      maxAge: 60 * 15,  // 15분
    };
  }

  return {
    ...baseOptions,
    httpOnly: true,   // XSS 방지
    maxAge: 60 * 60 * 24 * 7,  // 7일
  };
}
```

### 환경별 설정

#### 로컬 개발
```bash
# frontend/.env
NUXT_PUBLIC_API_BASE_URL=http://localhost:9706

# backend/.env
PORT=9706
CORS_ORIGIN=http://localhost:8706,http://localhost:3001
```

#### 프로덕션 (EC2 + CloudFront + ACM)
```bash
# frontend/.env.production
NUXT_PUBLIC_API_BASE_URL=http://backend:9706  # Docker Compose 내부 네트워크

# backend/.env.production
PORT=9706
CORS_ORIGIN=https://yourdomain.com  # CloudFront 도메인
```

**참고**: CloudFront에서 HTTPS를 처리하고, EC2는 HTTP만 처리합니다. certbot은 필요하지 않습니다.

---

## 🔄 대안: 직접 백엔드 호출 (비권장)

만약 Nuxt Server API를 제거하고 싶다면:

### 구조
```
┌─────────────────┐
│  사용자 브라우저  │
└────────┬────────┘
         │
         │ /api/auth/login
         │
         ▼
┌─────────────────┐
│  Nginx Proxy    │
└────────┬────────┘
         │
         ├─ / → Frontend
         └─ /api → Backend
```

### 필요한 변경사항

1. **프론트엔드 코드 수정**
```typescript
// stores/auth.ts
async login(credentials: LoginCredentials) {
  // Nuxt Server API 대신 직접 호출
  const data = await useApi<AuthResponse>('/auth/login', {
    method: 'POST',
    body: credentials,
  });
  // 쿠키는 백엔드에서 자동 설정됨
}
```

2. **백엔드 쿠키 설정**
```typescript
// NestJS Controller
@Post('login')
async login(@Res({ passthrough: true }) res: Response) {
  const { accessToken, refreshToken, user } = await this.authService.login();

  // 직접 쿠키 설정
  res.cookie('access_token', accessToken, {
    httpOnly: false,
    secure: true,
    sameSite: 'strict',
    maxAge: 15 * 60 * 1000,
  });

  res.cookie('refresh_token', refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return { accessToken, user };
}
```

3. **Nginx 설정**
```nginx
location /api {
  rewrite ^/api/(.*) /$1 break;
  proxy_pass http://backend:9706;
  proxy_set_header Cookie $http_cookie;
  proxy_cookie_domain backend:9706 yourdomain.com;
}
```

### 단점
- ❌ 백엔드 URL 노출
- ❌ 프론트엔드 코드 대량 수정 필요
- ❌ 백엔드에서 쿠키 직접 관리 (복잡도 증가)
- ❌ CSRF 취약점 증가

---

## ✅ 권장 방안 선택 이유

### 방안 1: Nuxt Server API 유지 (현재 구조)

**장점**:
- ✅ 코드 변경 최소화 (환경변수만 변경)
- ✅ httpOnly 쿠키 안전하게 관리
- ✅ 백엔드 URL 숨김 (보안)
- ✅ CSRF 보호 용이
- ✅ 추가 미들웨어 삽입 용이 (로깅, 캐싱 등)
- ✅ 쿠키 관리 중앙화

**단점**:
- 약간의 오버헤드 (Nuxt Server API 경유)

### 방안 2: 직접 백엔드 호출

**장점**:
- ✅ 성능 최적화 (중간 계층 제거)
- ✅ 같은 도메인 (쿠키 자동 작동)

**단점**:
- ❌ 백엔드 URL 노출
- ❌ 코드 변경 많음
- ❌ 보안 관리 복잡

---

## 🚀 배포 체크리스트

### 프로덕션 배포 전

- [ ] 환경변수 설정 확인
  - [ ] `NUXT_PUBLIC_API_BASE_URL` (프론트엔드)
  - [ ] `CORS_ORIGIN` (백엔드)
  - [ ] `JWT_SECRET` (강력한 시크릿)
- [ ] HTTPS 설정
  - [ ] SSL 인증서 설치
  - [ ] `secure: true` 쿠키 플래그
  - [ ] `sameSite: 'strict'` 설정
- [ ] CORS 화이트리스트 확인
- [ ] 쿠키 도메인 설정 확인
- [ ] 로그 레벨 조정 (`warn` 이상)

### 배포 후 테스트

- [ ] 로그인 기능 테스트
- [ ] 쿠키 저장 확인 (브라우저 개발자 도구)
- [ ] httpOnly 플래그 확인
- [ ] Secure 플래그 확인
- [ ] SameSite 설정 확인
- [ ] 토큰 갱신 테스트
- [ ] 로그아웃 테스트

---

## 📚 관련 파일

### 프론트엔드
- [frontend/server/utils/cookies.ts](frontend/server/utils/cookies.ts) - 쿠키 헬퍼 함수
- [frontend/server/api/auth/login.post.ts](frontend/server/api/auth/login.post.ts) - 로그인 API
- [frontend/server/api/auth/register.post.ts](frontend/server/api/auth/register.post.ts) - 회원가입 API
- [frontend/server/api/auth/logout.post.ts](frontend/server/api/auth/logout.post.ts) - 로그아웃 API
- [frontend/server/api/auth/refresh.post.ts](frontend/server/api/auth/refresh.post.ts) - 토큰 갱신 API
- [frontend/nuxt.config.ts](frontend/nuxt.config.ts) - Nuxt 설정
- [frontend/.env.production](frontend/.env.production) - 프로덕션 환경변수

### 백엔드
- [backend/src/main.ts](backend/src/main.ts) - CORS 설정
- [backend/.env.example](backend/.env.example) - 환경변수 예제
- [backend/.env.production.example](backend/.env.production.example) - 프로덕션 예제

### 배포
- [DEPLOYMENT.md](DEPLOYMENT.md) - 상세 배포 가이드
- [nginx.conf.example](nginx.conf.example) - Nginx 설정 예제
- [docker-compose.prod.yml](docker-compose.prod.yml) - Docker Compose 설정

---

## 🔒 보안 팁

1. **프로덕션에서는 반드시 HTTPS 사용**
2. **JWT_SECRET은 최소 32자 이상의 랜덤 문자열**
3. **CORS는 화이트리스트 방식 사용 (`*` 금지)**
4. **SameSite는 `strict` 사용 (CSRF 방지)**
5. **HttpOnly 플래그로 XSS 방지**
6. **Secure 플래그로 HTTPS 강제**
7. **정기적인 토큰 갱신 구현**

---

## ❓ FAQ

### Q1: 로컬과 배포 환경에서 다른 설정을 어떻게 관리하나요?
**A**: 환경변수 파일로 관리합니다.
- 로컬: `.env`
- 프로덕션: `.env.production`

### Q2: httpOnly 쿠키는 클라이언트에서 읽을 수 없는데 어떻게 인증 상태를 확인하나요?
**A**: Access Token은 `httpOnly: false`로 설정하여 클라이언트에서 읽을 수 있게 합니다. Refresh Token만 `httpOnly: true`로 보호합니다.

### Q3: 쿠키가 설정되지 않아요!
**A**: 다음을 확인하세요:
1. CORS 설정에 `credentials: true`
2. 쿠키 도메인이 현재 도메인과 일치
3. HTTPS 환경에서 `secure: true`
4. SameSite 설정 확인

### Q4: Vercel이나 다른 서버리스 환경에서는 어떻게 하나요?
**A**: Nuxt Server API는 서버리스 환경에서도 잘 작동합니다. `vercel.json`에서 리라이트 규칙만 설정하면 됩니다.

---

## 🎉 결론

**현재 Nuxt Server API 구조를 유지하세요!**

환경변수만 변경하면 배포 환경에서도 httpOnly 쿠키가 안전하게 작동합니다. 코드 변경 없이 보안과 유지보수성을 모두 확보할 수 있습니다.
