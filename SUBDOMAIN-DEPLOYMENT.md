# 서브도메인 분리 배포 가이드

## 아키텍처

```
사용자 → CloudFront (blogmine.ai.kr) → EC2:80 (Nginx Frontend) → Nuxt (포트 3000)
사용자 → CloudFront (api.blogmine.ai.kr) → EC2:8080 (Nginx Backend) → NestJS (포트 9706)
```

## 1. DNS 설정 (Route 53)

### A. 프론트엔드 도메인
```
레코드 이름: blogmine.ai.kr (또는 @)
레코드 타입: A
별칭: 예
별칭 대상: CloudFront Distribution (프론트엔드용)
라우팅 정책: 단순 라우팅
```

### B. 백엔드 도메인
```
레코드 이름: api
레코드 타입: A
별칭: 예
별칭 대상: CloudFront Distribution (백엔드용)
라우팅 정책: 단순 라우팅
```

## 2. ACM 인증서 발급

**중요**: CloudFront용 인증서는 **반드시 us-east-1 리전**에서 발급해야 합니다.

### A. 멀티 도메인 인증서 발급 (권장)

AWS Certificate Manager (us-east-1 리전):
```
도메인 이름:
  - blogmine.ai.kr
  - api.blogmine.ai.kr

검증 방법: DNS 검증
```

또는 와일드카드 인증서:
```
도메인 이름: *.blogmine.ai.kr
검증 방법: DNS 검증
```

### B. DNS 검증

Route 53 자동 레코드 생성 사용:
1. ACM 콘솔에서 "Route 53에서 레코드 생성" 클릭
2. 자동으로 CNAME 레코드 생성
3. 5-30분 내 검증 완료

## 3. CloudFront 배포본 설정

### A. 프론트엔드 Distribution (blogmine.ai.kr)

#### Origin Settings
```yaml
Origin Domain: <EC2-Public-IP>
Protocol: HTTP only
HTTP Port: 80
Origin Path: (비워둠)
Custom Headers:
  - Header: Host
    Value: blogmine.ai.kr
```

#### Default Cache Behavior
```yaml
Path Pattern: Default (*)
Viewer Protocol Policy: Redirect HTTP to HTTPS
Allowed HTTP Methods: GET, HEAD, OPTIONS, PUT, POST, PATCH, DELETE
Cache Policy: CachingDisabled (SSR용)
Origin Request Policy: AllViewer
```

#### Additional Cache Behaviors (순서 중요!)

**1. `/_nuxt/*` (해시된 빌드 자산)**
```yaml
Path Pattern: /_nuxt/*
Cache Policy: CachingOptimized
TTL: Default 1 year
Compress Objects: Yes
```

**2. `*.ico`, `*.png`, `*.jpg`, `*.svg`, etc. (정적 이미지)**
```yaml
Path Pattern: 각 확장자별 또는 Custom Policy
Cache Policy: Custom
  - Min TTL: 0
  - Max TTL: 604800 (7일)
  - Default TTL: 604800
Compress Objects: Yes
```

#### General Settings
```yaml
Alternate Domain Names (CNAMEs): blogmine.ai.kr
SSL Certificate: ACM 인증서 선택
Supported HTTP Versions: HTTP/2
Default Root Object: (비워둠 - Nuxt SSR 처리)
```

### B. 백엔드 Distribution (api.blogmine.ai.kr)

#### Origin Settings
```yaml
Origin Domain: <EC2-Public-IP>
Protocol: HTTP only
HTTP Port: 8080  # Nginx Backend 포트
Origin Path: (비워둠)
Custom Headers:
  - Header: Host
    Value: api.blogmine.ai.kr
```

#### Default Cache Behavior
```yaml
Path Pattern: Default (*)
Viewer Protocol Policy: Redirect HTTP to HTTPS
Allowed HTTP Methods: GET, HEAD, OPTIONS, PUT, POST, PATCH, DELETE
Cache Policy: CachingDisabled  # API는 캐싱 안 함
Origin Request Policy: AllViewer
```

#### General Settings
```yaml
Alternate Domain Names (CNAMEs): api.blogmine.ai.kr
SSL Certificate: ACM 인증서 선택
Supported HTTP Versions: HTTP/2
```

## 4. EC2 Security Group 설정

```yaml
Inbound Rules:
  # SSH
  - Type: SSH
    Protocol: TCP
    Port: 22
    Source: My IP (관리용)

  # HTTP from CloudFront (프론트엔드)
  - Type: HTTP
    Protocol: TCP
    Port: 80
    Source: 0.0.0.0/0  # CloudFront IP 범위 (또는 CloudFront Prefix List)

  # HTTP from CloudFront (백엔드)
  - Type: Custom TCP
    Protocol: TCP
    Port: 8080
    Source: 0.0.0.0/0  # CloudFront IP 범위
```

**보안 강화 옵션**: CloudFront Managed Prefix List 사용
```
Source: CloudFront Managed Prefix List (com.amazonaws.global.cloudfront.origin-facing)
```

## 5. Docker Compose 배포

### A. 환경 변수 설정

`backend/.env` 파일 생성:
```bash
# .env.production.example을 복사하여 수정
cp .env.production.example backend/.env

# 주요 설정 확인
NODE_ENV=production
CORS_ORIGIN=https://blogmine.ai.kr
DATABASE_URL=postgresql://...
JWT_SECRET=your-strong-secret-min-32-chars
```

### B. Docker 컨테이너 실행

```bash
# EC2 인스턴스에 접속
ssh -i your-key.pem ec2-user@<EC2-Public-IP>

# 프로젝트 디렉토리로 이동
cd /path/to/blog-mine

# 프로덕션 빌드 및 실행
docker-compose -f docker-compose.prod.yml up -d

# 로그 확인
docker-compose -f docker-compose.prod.yml logs -f

# 컨테이너 상태 확인
docker ps
```

### C. 컨테이너 확인

```bash
# 5개의 컨테이너가 실행되어야 함
CONTAINER ID   IMAGE                    STATUS
xxxxxxxxxx     blog-mine-backend        Up
xxxxxxxxxx     blog-mine-frontend       Up
xxxxxxxxxx     nginx:alpine (frontend)  Up
xxxxxxxxxx     nginx:alpine (backend)   Up
```

## 6. 동작 확인

### A. 헬스체크

```bash
# 프론트엔드 Nginx
curl http://<EC2-IP>:80/health
# 응답: healthy

# 백엔드 Nginx
curl http://<EC2-IP>:8080/health
# 응답: healthy
```

### B. CloudFront 테스트

```bash
# 프론트엔드 (브라우저에서)
https://blogmine.ai.kr

# 백엔드 API (curl 또는 브라우저에서)
https://api.blogmine.ai.kr/health
```

### C. CORS 및 Cookie 테스트

브라우저 개발자 도구에서:
```javascript
// 프론트엔드에서 백엔드 API 호출
fetch('https://api.blogmine.ai.kr/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'test@example.com', password: 'test' }),
  credentials: 'include'  // 쿠키 포함
})
```

**확인 사항**:
- ✅ CORS 에러 없음
- ✅ `Set-Cookie` 헤더에 `refresh_token` 포함
- ✅ Cookie에 `Secure`, `HttpOnly`, `SameSite=Lax` 속성 확인

## 7. 배포 체크리스트

### 배포 전
- [ ] ACM 인증서 발급 완료 (us-east-1)
- [ ] DNS 레코드 설정 (blogmine.ai.kr, api.blogmine.ai.kr)
- [ ] backend/.env 파일 설정 완료
- [ ] RDS PostgreSQL 인스턴스 생성 및 연결 확인
- [ ] Prisma 마이그레이션 실행

### CloudFront 설정
- [ ] 프론트엔드 Distribution 생성
  - [ ] Origin: EC2:80
  - [ ] CNAME: blogmine.ai.kr
  - [ ] ACM 인증서 연결
  - [ ] Cache Behaviors 설정 (/_nuxt/*, 정적 자산)
- [ ] 백엔드 Distribution 생성
  - [ ] Origin: EC2:8080
  - [ ] CNAME: api.blogmine.ai.kr
  - [ ] ACM 인증서 연결
  - [ ] CachingDisabled

### EC2 설정
- [ ] Security Group 포트 80, 8080 허용
- [ ] Docker 및 Docker Compose 설치
- [ ] 프로젝트 코드 배포
- [ ] docker-compose.prod.yml 실행
- [ ] 5개 컨테이너 모두 Up 상태 확인

### 테스트
- [ ] https://blogmine.ai.kr 접속 확인
- [ ] https://api.blogmine.ai.kr/health 응답 확인
- [ ] 프론트엔드 → 백엔드 API 호출 테스트
- [ ] CORS 정상 동작 확인
- [ ] Cookie (refresh_token) 정상 설정 확인
- [ ] 정적 자산 캐싱 확인 (Network 탭에서 cache hit)

## 8. 문제 해결

### CORS 에러
```
Access to fetch at 'https://api.blogmine.ai.kr' from origin 'https://blogmine.ai.kr'
has been blocked by CORS policy
```

**해결**:
- `nginx-backend.conf`의 `Access-Control-Allow-Origin` 확인
- 백엔드 `CORS_ORIGIN=https://blogmine.ai.kr` 확인
- Nginx 재시작: `docker-compose -f docker-compose.prod.yml restart nginx-backend`

### Cookie가 설정되지 않음

**원인**: `Secure` 쿠키는 HTTPS에서만 동작

**확인**:
- CloudFront가 HTTPS 제공 중인지 확인
- `nginx-backend.conf`의 `X-Forwarded-Proto: https` 확인
- 백엔드 쿠키 옵션에 `secure: true` 설정 확인

### 502 Bad Gateway

**원인**: CloudFront → Nginx → 컨테이너 연결 실패

**확인**:
```bash
# 컨테이너 상태
docker ps

# Nginx 로그
docker logs blog-mine-nginx-frontend
docker logs blog-mine-nginx-backend

# 백엔드/프론트엔드 로그
docker logs blog-mine-backend
docker logs blog-mine-frontend
```

### CloudFront 캐시 무효화

배포 후 즉시 반영이 필요한 경우:
```bash
# AWS CLI 설치 필요
aws cloudfront create-invalidation \
  --distribution-id <DISTRIBUTION-ID> \
  --paths "/*"
```

## 9. 모니터링

### CloudFront 모니터링
- CloudWatch: 요청 수, 에러율, 데이터 전송량
- CloudFront Reports: 인기 객체, 뷰어 통계

### EC2 모니터링
```bash
# CPU, 메모리 사용량
docker stats

# 디스크 사용량
df -h

# Nginx 액세스 로그
docker exec blog-mine-nginx-frontend tail -f /var/log/nginx/access.log
docker exec blog-mine-nginx-backend tail -f /var/log/nginx/access.log
```

## 10. 비용 최적화

### CloudFront
- 불필요한 Origin 요청 최소화 (캐싱 활용)
- 압축 활성화로 데이터 전송량 감소
- 사용하지 않는 Distribution 삭제

### EC2
- 적절한 인스턴스 타입 선택 (t3.small ~ t3.medium)
- 예약 인스턴스 또는 Savings Plans 고려
- CloudWatch Alarms로 Auto Scaling 설정

## 참고 자료

- [CloudFront Developer Guide](https://docs.aws.amazon.com/cloudfront/)
- [ACM User Guide](https://docs.aws.amazon.com/acm/)
- [Route 53 DNS Setup](https://docs.aws.amazon.com/route53/)
- [CORS on CloudFront](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/header-caching.html#header-caching-web-cors)
