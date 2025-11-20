# Blog-Mine 프로덕션 배포 체크리스트

완료된 EC2 Graviton + CloudFront 배포 설정 검증 체크리스트

## 배포 아키텍처 개요

```
사용자 → CloudFront (단일 배포본) → EC2 Nginx (도메인 라우팅) → Backend/Frontend 컨테이너
```

- **프론트엔드**: https://blogmine.ai.kr (Nuxt SSR)
- **백엔드 API**: https://api.blogmine.ai.kr (NestJS)
- **인프라**: AWS EC2 Graviton (ARM64) + CloudFront + Route53
- **배포 방식**: Docker Hub 이미지 사용

---

## 1. 사전 준비 (완료)

### AWS 리소스
- [x] ACM 인증서 발급 (us-east-1, 멀티 도메인)
  - blogmine.ai.kr
  - api.blogmine.ai.kr
- [x] EC2 Graviton 인스턴스 생성 (t4g.medium 권장)
- [x] RDS PostgreSQL 인스턴스 생성 및 설정
- [x] Security Groups 설정
  - EC2: SSH (22), HTTP (80)
  - RDS: PostgreSQL (5432) from EC2 SG only

### 도메인 및 DNS
- [x] Route53 호스팅 영역 생성
- [x] 도메인 네임서버 설정

---

## 2. EC2 초기 설정 (완료)

### 시스템 설정
- [x] Docker 설치 및 설정
```bash
sudo dnf update -y
sudo dnf install -y docker
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -a -G docker $USER
```

- [x] Docker Compose 설치 (ARM64용)
```bash
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 프로젝트 파일 배포
- [x] 프로젝트 디렉토리 생성: `~/blog-mine`
- [x] 필수 파일 배포
  - docker-compose.prod-hub.yml
  - nginx-unified.conf
  - backend/.env (환경 변수)

---

## 3. 환경 변수 설정 (완료)

### backend/.env 파일
- [x] 파일 위치: `~/blog-mine/backend/.env`
- [x] 파일 권한 설정: `chmod 600 backend/.env`
- [x] 파일 소유자 설정: `sudo chown ec2-user:docker backend/.env`

**필수 환경 변수**:
```bash
NODE_ENV=production
PORT=9706
DATABASE_URL=postgresql://...
JWT_SECRET=your-strong-secret-min-32-chars
CORS_ORIGIN=https://blogmine.ai.kr
OPENAI_API_KEY=sk-...
NAVER_CLIENT_ID=...
NAVER_CLIENT_SECRET=...
```

---

## 4. Docker 이미지 및 컨테이너 (완료)

### Docker Hub 이미지
- [x] 로컬에서 ARM64 이미지 빌드 및 푸시
```bash
./docker-build-arm.sh
```

- [x] EC2에서 이미지 Pull
```bash
docker pull atmsads/blog-mine-backend:latest
docker pull atmsads/blog-mine-frontend:latest
```

### 컨테이너 실행
- [x] 컨테이너 실행
```bash
docker-compose -f docker-compose.prod-hub.yml up -d
```

- [x] 컨테이너 상태 확인
```bash
docker ps
# 3개 컨테이너 모두 healthy 상태 확인:
# - blog-mine-backend (atmsads/blog-mine-backend:latest)
# - blog-mine-frontend (atmsads/blog-mine-frontend:latest)
# - blog-mine-nginx (nginx:alpine)
```

### Healthcheck 검증
- [x] Backend: `docker logs blog-mine-backend` (에러 없음)
- [x] Frontend: `docker logs blog-mine-frontend` (에러 없음)
- [x] Nginx: `docker logs blog-mine-nginx` (에러 없음)

---

## 5. Nginx 설정 검증 (완료)

### 로컬 테스트 (EC2 내부)
- [x] 프론트엔드 헬스체크
```bash
curl http://localhost/
# 응답: Nuxt HTML 페이지
```

- [x] 백엔드 헬스체크
```bash
curl -H "Host: api.blogmine.ai.kr" http://localhost/health
# 응답: {"status":"ok"}
```

### 도메인 라우팅 확인
- [x] server_name 설정 확인
```bash
cat nginx-unified.conf | grep "server_name"
# api.blogmine.ai.kr → 백엔드
# blogmine.ai.kr localhost _ → 프론트엔드 (default_server)
```

- [x] Nginx 설정 테스트
```bash
docker exec blog-mine-nginx nginx -t
# syntax is ok
# test is successful
```

---

## 6. Prisma 마이그레이션 (완료)

- [x] 마이그레이션 실행
```bash
docker exec -it blog-mine-backend sh
cd /app/backend
npx prisma migrate deploy
npx prisma migrate status
exit
```

---

## 7. CloudFront 설정 (완료)

### Origin 설정
- [x] Origin Domain: EC2 Public IP
- [x] Origin Type: Custom Origin (기타)
- [x] Protocol: HTTP only
- [x] HTTP Port: 80

### Cache Behavior 설정
- [x] Default (*): CachingDisabled (API 및 SSR)
- [x] `/_nuxt/*`: CachingOptimized (1년 캐시)
- [x] 정적 자산: 7일 캐시

### General Settings
- [x] Price Class: Use Only North America, Europe, Asia, Middle East, and Africa
- [x] Alternate Domain Names (CNAMEs):
  - blogmine.ai.kr
  - api.blogmine.ai.kr
- [x] SSL Certificate: ACM 인증서 연결
- [x] Viewer Protocol: Redirect HTTP to HTTPS
- [x] IPv6: Enabled

---

## 8. Route53 DNS 설정 (완료)

### A 레코드 (별칭)
- [x] blogmine.ai.kr → CloudFront Distribution
- [x] api.blogmine.ai.kr → CloudFront Distribution

**중요**: 두 도메인 모두 같은 CloudFront Distribution을 가리킴

---

## 9. 최종 동작 확인 (완료)

### 브라우저 테스트
- [x] https://blogmine.ai.kr 접속 확인
  - 프론트엔드 페이지 정상 로드
  - SSL 인증서 유효 확인

- [x] https://api.blogmine.ai.kr/health 접속 확인
  - 백엔드 API 응답 정상: `{"status":"ok"}`

### 개발자 도구 확인
- [x] 네트워크 탭: 응답 헤더 확인
  - `X-Cache: Miss from cloudfront` or `Hit from cloudfront`
  - CORS 헤더 정상
  - Security 헤더 존재

- [x] 콘솔 탭: 에러 없음 확인
  - CORS 에러 없음
  - Mixed Content 경고 없음

### 정적 자산 캐싱 확인
- [x] `/_nuxt/*` 파일: `Cache-Control: public, immutable`
- [x] 이미지 파일: `Cache-Control: public, max-age=604800`

---

## 10. 보안 체크리스트 (완료)

### EC2 보안
- [x] Security Group: SSH는 My IP만 허용
- [x] backend/.env 파일 권한: 600
- [x] backend/.env 파일 소유자: ec2-user:docker

### 네트워크 보안
- [x] RDS 보안 그룹: EC2 보안 그룹만 허용
- [x] CloudFront → EC2: HTTP (포트 80)만 허용
- [x] 모든 사용자 트래픽: HTTPS (CloudFront에서 SSL 처리)

### 애플리케이션 보안
- [x] CORS Origin: https://blogmine.ai.kr만 허용
- [x] Security Headers 설정:
  - X-Content-Type-Options: nosniff
  - X-XSS-Protection: 1; mode=block
  - Strict-Transport-Security (HSTS)
  - Referrer-Policy

---

## 11. 모니터링 및 로깅 (완료)

### 컨테이너 상태
- [x] `docker ps` 명령어로 3개 컨테이너 Up 확인
- [x] Healthcheck 상태: healthy

### 로그 확인
- [x] Backend 로그: `docker logs -f blog-mine-backend`
- [x] Frontend 로그: `docker logs -f blog-mine-frontend`
- [x] Nginx 로그: `docker logs -f blog-mine-nginx`

### Nginx 액세스 로그
- [x] 도메인별 트래픽 확인 가능
```bash
docker exec blog-mine-nginx tail -f /var/log/nginx/access.log | grep 'host='
```

---

## 12. 운영 프로세스

### 새 버전 배포
```bash
# 1. 로컬에서 빌드 및 푸시
./docker-build-arm.sh v1.1.0

# 2. EC2에서 업데이트
cd ~/blog-mine
docker-compose -f docker-compose.prod-hub.yml down
docker pull atmsads/blog-mine-backend:latest
docker pull atmsads/blog-mine-frontend:latest
docker-compose -f docker-compose.prod-hub.yml up -d

# 3. 로그 확인
docker-compose -f docker-compose.prod-hub.yml logs -f
```

### 롤백
```bash
# 특정 버전으로 롤백
docker-compose -f docker-compose.prod-hub.yml down
docker pull atmsads/blog-mine-backend:v1.0.0
docker pull atmsads/blog-mine-frontend:v1.0.0

# docker-compose.prod-hub.yml 수정 (버전 태그 변경)
nano docker-compose.prod-hub.yml
# image: atmsads/blog-mine-backend:v1.0.0
# image: atmsads/blog-mine-frontend:v1.0.0

docker-compose -f docker-compose.prod-hub.yml up -d
```

### CloudFront 캐시 무효화
```bash
# 전체 캐시 무효화
aws cloudfront create-invalidation \
  --distribution-id <DISTRIBUTION-ID> \
  --paths "/*"

# 특정 경로만
aws cloudfront create-invalidation \
  --distribution-id <DISTRIBUTION-ID> \
  --paths "/_nuxt/*"
```

---

## 13. 트러블슈팅 가이드

### 컨테이너가 시작되지 않음
```bash
# 로그 확인
docker logs blog-mine-backend
docker logs blog-mine-frontend

# 환경 변수 확인
docker exec blog-mine-backend env | grep DATABASE_URL

# 컨테이너 재생성
docker-compose -f docker-compose.prod-hub.yml up -d --force-recreate
```

### 데이터베이스 연결 실패
```bash
# RDS 연결 테스트
telnet your-rds.ap-northeast-2.rds.amazonaws.com 5432

# 보안 그룹 확인
# RDS SG에서 EC2 SG 허용 확인

# DATABASE_URL 확인
docker exec blog-mine-backend env | grep DATABASE_URL
```

### 502 Bad Gateway
```bash
# 컨테이너 상태 확인
docker ps

# Nginx 로그
docker logs blog-mine-nginx

# 백엔드/프론트엔드 헬스체크
curl http://localhost:9706/health
curl http://localhost:3000/
```

### Nginx 444 Status (도메인 라우팅 실패)
```bash
# Nginx 로그에서 444 확인
docker logs blog-mine-nginx | grep "444"

# server_name 설정 확인
cat nginx-unified.conf | grep "server_name"

# 해결: default_server와 와일드카드 추가 (이미 적용됨)
# server_name blogmine.ai.kr localhost _;
```

---

## 14. 주요 설정 파일 위치

- `DEPLOY-ARM-EC2.md`: EC2 배포 상세 가이드
- `CLOUDFRONT-UNIFIED-DEPLOYMENT.md`: CloudFront 설정 가이드
- `docker-compose.prod-hub.yml`: 프로덕션 Docker Compose 설정
- `nginx-unified.conf`: Nginx 도메인 라우팅 설정
- `backend/.env`: 백엔드 환경 변수 (EC2 내)
- `docker-build-arm.sh`: ARM64 이미지 빌드 스크립트

---

## 15. 완료 확인

### 배포 완료 기준
- ✅ 모든 컨테이너 healthy 상태
- ✅ https://blogmine.ai.kr 접속 가능
- ✅ https://api.blogmine.ai.kr/health 응답 정상
- ✅ CORS 및 Cookie 정상 동작
- ✅ CloudFront 캐싱 정상 동작
- ✅ SSL 인증서 유효
- ✅ 로그에 에러 없음

### 배포 완료 날짜
- **배포 완료**: 2025년 (사용자 확인 완료)
- **배포 방식**: Docker Hub 기반 EC2 Graviton + CloudFront 단일 배포본
- **최종 확인**: 접속 및 동작 테스트 완료

---

## 참고 문서

- [DEPLOY-ARM-EC2.md](DEPLOY-ARM-EC2.md) - EC2 Graviton 배포 상세 가이드
- [CLOUDFRONT-UNIFIED-DEPLOYMENT.md](CLOUDFRONT-UNIFIED-DEPLOYMENT.md) - CloudFront 단일 배포본 설정 가이드
- [AWS Graviton](https://aws.amazon.com/ec2/graviton/)
- [CloudFront Documentation](https://docs.aws.amazon.com/cloudfront/)
- [Docker Multi-platform Builds](https://docs.docker.com/build/building/multi-platform/)
