# Blog Mine

NestJS와 Nuxt로 구축된 풀스택 블로그 애플리케이션입니다. pnpm workspace 모노레포로 관리됩니다.

## 기술 스택

- **백엔드**: NestJS 11 + TypeScript
- **프론트엔드**: Nuxt 4 + Vue 3 + @nuxt/ui
- **패키지 매니저**: pnpm workspace

## 빠른 시작

```bash
# 모든 의존성 설치
pnpm install

# 백엔드와 프론트엔드를 동시에 개발 모드로 실행
pnpm dev

# 백엔드만 실행 (http://localhost:3000)
pnpm dev:backend

# 프론트엔드만 실행 (http://localhost:3000)
pnpm dev:frontend
```

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

- 백엔드와 프론트엔드 모두 기본적으로 3000 포트를 사용합니다. 동시 실행 시 포트를 다르게 설정해야 합니다.
- 백엔드는 CommonJS 모듈을 사용합니다 (`"module": "commonjs"`)
- 프론트엔드는 ES 모듈을 사용합니다 (`"type": "module"`)
- Workspace 의존성은 가능한 경우 루트 `node_modules/`로 호이스팅됩니다

## 라이센스

UNLICENSED
