# Blog Mine

AI 기반 블로그 콘텐츠 생성 및 SEO 최적화 플랫폼. NestJS와 Nuxt로 구축된 풀스택 애플리케이션으로 pnpm workspace 모노레포로 관리됩니다.

## 주요 기능

- **AI 블로그 생성**: OpenAI 기반 자동 블로그 포스트 생성
- **페르소나 시스템**: 다양한 작성 스타일과 톤의 페르소나 관리
- **키워드 순위 추적**: 네이버 블로그 검색 순위 자동 추적
- **크레딧 기반 구독**: 등급별 크레딧 시스템과 유연한 결제 옵션
- **나이스페이먼츠 통합**: 안전한 결제 처리 및 자동 결제

## 기술 스택

- **백엔드**: NestJS 11 + TypeScript + Prisma ORM
- **프론트엔드**: Nuxt 4 + Vue 3 + @nuxt/ui v4
- **데이터베이스**: PostgreSQL
- **인증**: JWT (Access Token + Refresh Token)
- **결제**: 나이스페이먼츠 (Nicepay)
- **AI**: OpenAI API (GPT-4, GPT-4-mini)
- **패키지 매니저**: pnpm workspace

## 빠른 시작

### 로컬 개발 (권장)

```bash
# 모든 의존성 설치
pnpm install

# 백엔드와 프론트엔드를 동시에 개발 모드로 실행
pnpm dev

# 백엔드만 실행 (http://localhost:9706)
pnpm dev:backend

# 프론트엔드만 실행 (http://localhost:8706)
pnpm dev:frontend
```

### Docker 개발 환경

```bash
# RDS 연결 정보를 .env 파일에 설정
cp .env.example .env
# .env 파일 편집 (DB_HOST, DB_USERNAME 등)

# 개발 컨테이너 실행 (Nginx 없음, Frontend + Backend만)
docker-compose -f docker-compose.dev.yml up -d

# 로그 확인
docker-compose -f docker-compose.dev.yml logs -f
```

- **Frontend**: http://localhost:8706
- **Backend**: http://localhost:9706

## 프로젝트 구조

```
blog-mine/
├── backend/          # NestJS REST API
│   ├── src/         # 애플리케이션 소스 코드
│   ├── test/        # E2E 테스트
│   └── dist/        # 빌드 결과물 (자동 생성)
├── frontend/        # Nuxt SSR 애플리케이션
│   ├── app/         # 애플리케이션 코드
│   ├── public/      # 정적 파일
│   └── .nuxt/       # 빌드 결과물 (자동 생성)
├── pnpm-workspace.yaml
└── package.json     # Workspace 스크립트
```

## 사용 가능한 명령어

### 개발

```bash
pnpm dev              # 백엔드와 프론트엔드를 동시에 실행
pnpm dev:backend      # 백엔드만 실행
pnpm dev:frontend     # 프론트엔드만 실행
```

### 빌드

```bash
pnpm build            # 모든 패키지 빌드
pnpm build:backend    # 백엔드만 빌드
pnpm build:frontend   # 프론트엔드만 빌드
```

### 테스트

```bash
pnpm test             # 백엔드 유닛 테스트 실행
pnpm test:e2e         # 백엔드 E2E 테스트 실행
```

### 린트 & 포맷팅

```bash
pnpm lint             # 모든 패키지 린트
pnpm lint:backend     # 백엔드 코드 린트
pnpm format           # 백엔드 코드 Prettier 포맷팅
```

### 정리

```bash
pnpm clean            # 모든 패키지 정리
pnpm clean:backend    # 백엔드 dist/ 및 node_modules/ 삭제
pnpm clean:frontend   # 프론트엔드 .nuxt/, .output/, node_modules/ 삭제
```

## Workspace 명령어

```bash
# 모든 패키지의 의존성 설치
pnpm install

# 특정 패키지에서 명령어 실행
pnpm --filter backend [명령어]
pnpm --filter frontend [명령어]

# 모든 패키지에서 명령어 실행
pnpm -r [명령어]              # 순차 실행
pnpm --parallel [명령어]      # 병렬 실행
```

## 개발 시 참고사항

- **포트 설정**: Backend(9706), Frontend(8706)
- **데이터베이스**: RDS PostgreSQL 사용 (로컬 PostgreSQL 컨테이너 없음)
- 백엔드는 CommonJS 모듈을 사용합니다 (`"module": "commonjs"`)
- 프론트엔드는 ES 모듈을 사용합니다 (`"type": "module"`)
- Workspace 의존성은 가능한 경우 루트 `node_modules/`로 호이스팅됩니다
- **환경 변수 설정 필수**: `.env` 파일에 RDS 연결 정보 등 필수 환경 변수 설정 필요

## 데이터베이스 관리

### Prisma 명령어

```bash
# 마이그레이션 실행 (개발 환경)
DATABASE_URL="postgresql://..." pnpm --filter backend prisma migrate dev --name <migration-name>

# Prisma Client 재생성
pnpm --filter backend prisma generate

# Prisma Studio (데이터베이스 GUI)
DATABASE_URL="postgresql://..." pnpm --filter backend prisma studio
```

### 데이터베이스 스키마

주요 모델: User, Persona, BlogPost, KeywordTracking, SubscriptionPlan, UserSubscription, CreditAccount, Payment

자세한 스키마 정보: [backend/DATABASE-SCHEMA.md](backend/DATABASE-SCHEMA.md)

## 배포

### 프로덕션 배포

상세한 배포 가이드는 [DEPLOYMENT.md](DEPLOYMENT.md)를 참고하세요.

```bash
# 환경 변수 설정 (.env 파일)
DB_HOST=your-rds-instance.rds.amazonaws.com
DB_USERNAME=postgres
DB_PASSWORD=your-password
CORS_ORIGIN=https://yourdomain.com
# ... 기타 환경 변수

# 프로덕션 빌드 및 실행
docker-compose -f docker-compose.prod.yml up -d --build
```

**아키텍처**: CloudFront (HTTPS) → EC2 Nginx (HTTP) → Frontend + Backend → RDS PostgreSQL

## 문서

- **[DEPLOYMENT.md](DEPLOYMENT.md)** - 배포 가이드 (EC2 + CloudFront + ACM + RDS)
- **[COOKIE-STRATEGY.md](COOKIE-STRATEGY.md)** - 쿠키 관리 전략
- **[CLAUDE.md](CLAUDE.md)** - 프로젝트 개요 및 개발 가이드 (AI 개발자용)
- **[DATABASE-SCHEMA.md](DATABASE-SCHEMA.md)** - 데이터베이스 스키마 전체 문서
- **[frontend/VALIDATION.md](frontend/VALIDATION.md)** - Zod 스키마 검증 가이드
- **[frontend/NUXT-UI-V4-MIGRATION.md](frontend/NUXT-UI-V4-MIGRATION.md)** - Nuxt UI v4 마이그레이션 가이드

## 아키텍처

### 크레딧 & 구독 시스템

- **구독 플랜**: 무료, 베이직, 프로, 엔터프라이즈 등급
- **크레딧 타입**: 구독 크레딧, 구매 크레딧, 보너스 크레딧
- **사용 우선순위**: 보너스 → 구독 → 구매 순서로 차감
- **거래 내역**: 모든 크레딧 변동 사항 완전 기록
- **구독 히스토리**: 플랜 변경 이력 스냅샷 저장

### 인증 시스템

- **JWT 기반**: Access Token (15분) + Refresh Token (7일)
- **자동 토큰 갱신**: 498 상태 코드로 프론트엔드 자동 토큰 갱신
- **보안**: bcrypt 비밀번호 해싱, 토큰 회전 정책

## 라이센스

UNLICENSED
