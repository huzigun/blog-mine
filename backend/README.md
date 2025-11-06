# Blog Mine - Backend

NestJS 기반 블로그 애플리케이션의 백엔드 REST API 서버입니다.

## 기술 스택

- **Framework**: NestJS 11
- **Language**: TypeScript
- **ORM**: Prisma 6
- **Database**: PostgreSQL
- **Configuration**: @nestjs/config
- **Package Manager**: pnpm

## 프로젝트 설정

```bash
# 의존성 설치
pnpm install

# 환경 변수 설정
cp .env.example .env
# .env 파일을 열어 실제 값으로 수정하세요
```

## 환경 변수 설정

이 프로젝트는 환경별로 구분된 설정 파일을 사용합니다.

### 환경 파일 우선순위

1. `.env.{NODE_ENV}` (예: `.env.development`, `.env.production`)
2. `.env` (공통 설정)

### 환경 파일 구조

- **`.env`**: 모든 환경에서 공통으로 사용되는 설정
- **`.env.development`**: 개발 환경 전용 설정
- **`.env.production`**: 프로덕션 환경 전용 설정
- **`.env.example`**: 환경 변수 템플릿 (버전 관리에 포함)

### 설정 방법

```bash
# 1. .env.example을 복사하여 환경별 파일 생성
cp .env.example .env
cp .env.example .env.development
cp .env.example .env.production

# 2. 각 파일을 열어 환경에 맞는 값으로 수정
```

### 주요 환경 변수

```bash
# Application
APP_NAME=blog-mine-backend
APP_VERSION=0.0.1

# Server
PORT=3000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=your_username
DB_PASSWORD=your_password
DB_DATABASE=blog_mine

# Prisma Database URL
DATABASE_URL="postgresql://username:password@host:port/database?schema=public"

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=1d

# CORS
CORS_ORIGIN=http://localhost:3000

# Logging
LOG_LEVEL=info
```

## 애플리케이션 실행

```bash
# 개발 모드 (watch mode)
pnpm run dev
# 또는
pnpm run start:dev

# 일반 실행
pnpm run start

# 프로덕션 모드
pnpm run start:prod
```

### 환경별 실행

```bash
# 개발 환경 (.env.development 사용)
NODE_ENV=development pnpm run start:dev

# 프로덕션 환경 (.env.production 사용)
NODE_ENV=production pnpm run start:prod
```

## 데이터베이스 (Prisma)

```bash
# Prisma Client 생성
pnpm run prisma:generate

# 마이그레이션 생성 및 적용 (개발 환경)
NODE_ENV=development pnpm run prisma:migrate

# 프로덕션 마이그레이션 적용
NODE_ENV=production pnpm run prisma:migrate:prod

# Prisma Studio (데이터베이스 GUI)
pnpm run prisma:studio

# 데이터 시드
pnpm run prisma:seed
```

### User 모델 스키마

```prisma
model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  name      String?
  password  String
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("users")
}
```

## 테스트

```bash
# 유닛 테스트
pnpm run test

# watch 모드
pnpm run test:watch

# 테스트 커버리지
pnpm run test:cov

# E2E 테스트
pnpm run test:e2e

# 디버그 모드 테스트
pnpm run test:debug
```

## 린트 & 포맷팅

```bash
# ESLint (자동 수정)
pnpm run lint

# Prettier 포맷팅
pnpm run format
```

## 빌드

```bash
# 프로덕션 빌드
pnpm run build

# 빌드 결과물은 dist/ 디렉토리에 생성됩니다
```

## 프로젝트 구조

```
backend/
├── prisma/
│   ├── migrations/          # 데이터베이스 마이그레이션
│   └── schema.prisma        # Prisma 스키마 정의
├── src/
│   ├── config/              # 환경 설정
│   │   ├── configuration.ts # 설정 팩토리
│   │   ├── config.service.ts # 타입 안전 설정 서비스
│   │   └── index.ts
│   ├── prisma/              # Prisma 모듈
│   │   ├── prisma.service.ts # Prisma 서비스
│   │   ├── prisma.module.ts  # Prisma 모듈
│   │   └── index.ts
│   ├── app.module.ts        # 루트 모듈
│   ├── app.controller.ts
│   ├── app.service.ts
│   └── main.ts              # 진입점
├── test/                    # E2E 테스트
├── .env.example             # 환경 변수 템플릿
├── .env                     # 공통 환경 변수 (git 무시)
├── .env.development         # 개발 환경 변수 (git 무시)
├── .env.production          # 프로덕션 환경 변수 (git 무시)
└── prisma.config.ts         # Prisma 설정 파일
```

## ConfigService 사용법

타입 안전한 방식으로 환경 변수에 접근할 수 있습니다.

```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from './config';

@Injectable()
export class YourService {
  constructor(private configService: ConfigService) {}

  someMethod() {
    // 타입 안전한 접근
    const port = this.configService.port; // number
    const isDev = this.configService.isDevelopment; // boolean

    // 데이터베이스 설정
    const dbHost = this.configService.dbHost;
    const dbPort = this.configService.dbPort;

    // JWT 설정
    const jwtSecret = this.configService.jwtSecret;

    // 커스텀 값 가져오기
    const customValue = this.configService.get<string>('custom.key');
  }
}
```

## PrismaService 사용법

Prisma를 통해 타입 안전한 데이터베이스 쿼리를 수행할 수 있습니다.

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  // 모든 사용자 조회
  async findAll() {
    return this.prisma.user.findMany();
  }

  // 특정 사용자 조회
  async findOne(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  // 사용자 생성
  async create(data: { email: string; name?: string; password: string }) {
    return this.prisma.user.create({
      data,
    });
  }

  // 사용자 수정
  async update(id: number, data: { email?: string; name?: string }) {
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  // 사용자 삭제
  async remove(id: number) {
    return this.prisma.user.delete({
      where: { id },
    });
  }
}
```

## 보안 주의사항

⚠️ **중요**: 환경 변수 파일을 절대 버전 관리 시스템에 커밋하지 마세요!

- `.env`, `.env.development`, `.env.production` 파일은 `.gitignore`에 포함되어 있습니다
- `.env.example` 파일만 버전 관리에 포함됩니다
- 프로덕션 환경의 시크릿 키는 반드시 강력하고 고유한 값을 사용하세요

## License

UNLICENSED
