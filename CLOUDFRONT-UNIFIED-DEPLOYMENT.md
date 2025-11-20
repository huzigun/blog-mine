# CloudFront 단일 배포본 + Nginx 도메인 라우팅 가이드

## 아키텍처

```
사용자 요청
    │
    ├─ https://blogmine.ai.kr ─────┐
    │                              │
    └─ https://api.blogmine.ai.kr ─┤
                                   │
                                   ▼
                        ┌─────────────────────┐
                        │ CloudFront (단일)    │
                        │ - ACM 인증서         │
                        │ - 멀티 도메인 CNAME  │
                        └─────────────────────┘
                                   │
                                   │ HTTP
                                   ▼
                        ┌─────────────────────┐
                        │ EC2 Port 80         │
                        │ Nginx (통합)         │
                        └─────────────────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    │                             │
          Host: blogmine.ai.kr        Host: api.blogmine.ai.kr
                    │                             │
                    ▼                             ▼
          ┌─────────────────┐         ┌─────────────────┐
          │ Nuxt (Port 3000)│         │ NestJS (9706)   │
          │ 프론트엔드         │         │ 백엔드 API       │
          └─────────────────┘         └─────────────────┘
```

## 장점

✅ **단순성**: CloudFront 배포본 1개만 관리
✅ **비용 절감**: CloudFront 요청 수 통합
✅ **중앙 집중식 로깅**: Nginx 하나로 모든 트래픽 로그
✅ **설정 간소화**: Origin 하나, 인증서 관리 간편
✅ **유연성**: Nginx에서 도메인별 세밀한 제어 가능

## 1. ACM 인증서 발급

**중요**: CloudFront용 인증서는 **us-east-1 리전**에서 발급

### 멀티 도메인 인증서 (권장)

AWS Certificate Manager (us-east-1):
```
도메인 이름:
  - blogmine.ai.kr
  - api.blogmine.ai.kr
  - www.blogmine.ai.kr (선택사항)

검증 방법: DNS 검증
```

**또는 와일드카드 인증서**:
```
도메인 이름: *.blogmine.ai.kr
추가 이름: blogmine.ai.kr (루트 도메인)
검증 방법: DNS 검증
```

### DNS 검증

Route 53 자동 레코드 생성:
1. ACM 콘솔에서 "Route 53에서 레코드 생성" 클릭
2. CNAME 레코드 자동 생성
3. 5-30분 내 검증 완료

## 2. CloudFront 배포본 설정 (단일)

### Origin Settings

```yaml
Origin Domain: <EC2-Public-IP>
Origin Type: Custom Origin (기타)
Protocol: HTTP only
HTTP Port: 80
Origin Path: (비워둠)
Custom Headers: (필요 없음 - Nginx가 Host 헤더로 구분)
```

**중요**: Origin Type은 "기타(Custom Origin)"를 선택하세요. EC2 Public IP를 직접 입력합니다.

### Default Cache Behavior (API 및 SSR 기본)

```yaml
Path Pattern: Default (*)
Viewer Protocol Policy: Redirect HTTP to HTTPS
Allowed HTTP Methods: GET, HEAD, OPTIONS, PUT, POST, PATCH, DELETE
Cache Policy: CachingDisabled  # API와 SSR은 캐싱 안 함
Origin Request Policy: AllViewer
Response Headers Policy: (선택사항)
```

### Additional Cache Behaviors (순서 중요!)

#### 1. `/_nuxt/*` - Nuxt 빌드 자산 (최우선)

```yaml
Path Pattern: /_nuxt/*
Viewer Protocol Policy: Redirect HTTP to HTTPS
Allowed HTTP Methods: GET, HEAD
Cache Policy: CachingOptimized
  - TTL: Default 1 year
  - Query strings: All
  - Headers: None
  - Cookies: None
Compress Objects: Yes
```

#### 2. `*.ico`, `*.png`, `*.jpg`, `*.svg`, etc. - 정적 이미지

```yaml
Path Pattern: 각 확장자별 또는 Custom Cache Policy
Cache Policy: Custom
  - Min TTL: 0
  - Default TTL: 604800 (7일)
  - Max TTL: 604800
  - Query strings: None
  - Headers: None
  - Cookies: None
Compress Objects: Yes
```

### General Settings

```yaml
Price Class: Use Only North America, Europe, Asia, Middle East, and Africa (권장)
  - 한국 사용자 대상 서비스에 적합
  - 남미/오세아니아 제외로 비용 절감

Alternate Domain Names (CNAMEs):
  - blogmine.ai.kr
  - api.blogmine.ai.kr

SSL Certificate: ACM 인증서 선택 (us-east-1에서 발급한 인증서)

Supported HTTP Versions: HTTP/2, HTTP/3 (선택사항)

Default Root Object: (비워둠 - Nuxt SSR이 처리)

IPv6: Enabled (권장)
```

**Price Class 설명**:
- **Use All Edge Locations (Best Performance)**: 전 세계 모든 엣지 로케이션 사용 (최고가)
- **Use Only North America, Europe, Asia, Middle East, and Africa**: 남미/오세아니아 제외 (권장)
- **Use Only North America and Europe**: 북미/유럽만 (저가)

### Custom Error Responses (선택사항)

500, 502, 503, 504 에러를 커스텀 페이지로 처리:
```yaml
HTTP Error Code: 502, 503, 504
Response Page Path: /error.html (선택사항)
Response Code: 502 (또는 200으로 변경)
Error Caching Minimum TTL: 10 (초)
```

## 3. Route 53 DNS 설정

### A. 프론트엔드 도메인 (blogmine.ai.kr)

```
레코드 이름: @ (또는 비워둠)
레코드 타입: A
별칭: 예
별칭 대상: CloudFront Distribution 선택
라우팅 정책: 단순 라우팅
```

### B. 백엔드 API 도메인 (api.blogmine.ai.kr)

```
레코드 이름: api
레코드 타입: A
별칭: 예
별칭 대상: 동일한 CloudFront Distribution 선택
라우팅 정책: 단순 라우팅
```

**중요**: 두 도메인 모두 **같은 CloudFront Distribution**을 가리킴

## 4. EC2 Security Group 설정

```yaml
Inbound Rules:
  # SSH (관리용)
  - Type: SSH
    Protocol: TCP
    Port: 22
    Source: My IP

  # HTTP from CloudFront
  - Type: HTTP
    Protocol: TCP
    Port: 80
    Source: 0.0.0.0/0
    Description: CloudFront to Nginx
```

**보안 강화 옵션**: CloudFront Managed Prefix List 사용
```
Source Type: Prefix List
Source: com.amazonaws.global.cloudfront.origin-facing
```

## 5. 환경 변수 설정

### backend/.env 파일

```bash
# .env.production.example을 복사
cp .env.production.example backend/.env

# 주요 설정
NODE_ENV=production
CORS_ORIGIN=https://blogmine.ai.kr
DATABASE_URL=postgresql://...
JWT_SECRET=your-strong-secret-min-32-chars
```

## 6. Docker 배포

### A. 컨테이너 실행 (Docker Hub 이미지 사용)

```bash
# EC2 인스턴스 접속
ssh -i your-key.pem ec2-user@<EC2-Public-IP>

# 프로젝트 디렉토리
cd ~/blog-mine

# 환경 변수 파일 확인 (중요!)
ls -l backend/.env
# backend/.env 파일이 존재하고 설정되어 있어야 함

# 파일 권한 설정
sudo chown ec2-user:docker backend/.env
chmod 600 backend/.env

# Docker Hub에서 최신 이미지 pull
docker pull atmsads/blog-mine-backend:latest
docker pull atmsads/blog-mine-frontend:latest

# 프로덕션 컨테이너 실행
docker-compose -f docker-compose.prod-hub.yml up -d

# 로그 확인
docker-compose -f docker-compose.prod-hub.yml logs -f

# 컨테이너 상태
docker ps
```

**중요 설정 파일**:
- `docker-compose.prod-hub.yml`: Docker Hub 이미지 사용하는 프로덕션 설정
- `backend/.env`: 백엔드 환경 변수 (DB, JWT, API 키 등)
- `nginx-unified.conf`: 도메인 기반 라우팅 설정

### B. 실행 중인 컨테이너 확인

```bash
# 3개의 컨테이너가 실행되어야 함
CONTAINER ID   IMAGE                              STATUS
xxxxxxxxxx     atmsads/blog-mine-backend:latest   Up (healthy)
xxxxxxxxxx     atmsads/blog-mine-frontend:latest  Up (healthy)
xxxxxxxxxx     nginx:alpine                       Up (healthy)
```

## 7. 동작 확인

### A. 로컬 테스트 (EC2 직접 접속)

```bash
# 프론트엔드 헬스체크 (루트 경로)
curl -H "Host: blogmine.ai.kr" http://localhost/
# 응답: Nuxt 페이지 HTML

# 백엔드 헬스체크
curl -H "Host: api.blogmine.ai.kr" http://localhost/health
# 응답: {"status":"ok"}

# localhost로 직접 접속 (default_server)
curl http://localhost/
# 응답: Nuxt 페이지 HTML (프론트엔드가 default)
```

**참고**:
- Nuxt 프론트엔드는 `/health` 엔드포인트가 없으므로 루트 경로(`/`)를 사용합니다.
- Nginx 설정에서 프론트엔드가 `default_server`이므로 도메인 없이 접속하면 프론트엔드로 라우팅됩니다.

### B. CloudFront 테스트

```bash
# 프론트엔드 (브라우저)
https://blogmine.ai.kr

# 백엔드 API
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
  credentials: 'include'
})
```

**확인 사항**:
- ✅ CORS 에러 없음
- ✅ `Set-Cookie` 헤더에 `refresh_token` 포함
- ✅ Cookie 속성: `Secure`, `HttpOnly`, `SameSite=Lax`

## 8. Nginx 로그 분석

### 도메인별 트래픽 확인

```bash
# 프론트엔드 요청
docker exec blog-mine-nginx grep 'host="blogmine.ai.kr"' /var/log/nginx/access.log

# 백엔드 요청
docker exec blog-mine-nginx grep 'host="api.blogmine.ai.kr"' /var/log/nginx/access.log

# 실시간 모니터링
docker exec blog-mine-nginx tail -f /var/log/nginx/access.log | grep --color=auto 'host='
```

### 에러 로그 확인

```bash
docker exec blog-mine-nginx tail -f /var/log/nginx/error.log
```

## 9. 배포 체크리스트

### 배포 전
- [ ] ACM 인증서 발급 완료 (us-east-1, 멀티 도메인)
- [ ] backend/.env 파일 설정
- [ ] RDS PostgreSQL 인스턴스 준비
- [ ] Prisma 마이그레이션 실행

### CloudFront 설정
- [ ] CloudFront Distribution 생성
  - [ ] Origin: EC2:80
  - [ ] CNAMEs: blogmine.ai.kr, api.blogmine.ai.kr
  - [ ] ACM 인증서 연결
  - [ ] Cache Behaviors 설정 (/_nuxt/*, 정적 자산)
  - [ ] Default Cache: CachingDisabled

### DNS 설정
- [ ] Route 53: blogmine.ai.kr → CloudFront
- [ ] Route 53: api.blogmine.ai.kr → CloudFront

### EC2 설정
- [ ] Security Group 포트 80 허용
- [ ] Docker 및 Docker Compose 설치
- [ ] 프로젝트 코드 배포
- [ ] docker-compose.prod.yml 실행
- [ ] 4개 컨테이너 Up 상태 확인

### 테스트
- [ ] https://blogmine.ai.kr 접속 확인
- [ ] https://api.blogmine.ai.kr/health 응답 확인
- [ ] CORS 정상 동작 확인
- [ ] Cookie 설정 확인
- [ ] 정적 자산 캐싱 확인

## 10. 문제 해결

### CORS 에러

```
Access to fetch at 'https://api.blogmine.ai.kr' from origin 'https://blogmine.ai.kr'
has been blocked by CORS policy
```

**해결**:
```bash
# Nginx 설정 확인
docker exec blog-mine-nginx cat /etc/nginx/nginx.conf | grep -A 5 "Access-Control"

# 백엔드 환경 변수 확인
docker exec blog-mine-backend env | grep CORS_ORIGIN

# Nginx 재시작
docker-compose -f docker-compose.prod.yml restart nginx
```

### 도메인 라우팅 실패

**증상**: 모든 도메인이 같은 응답 반환 또는 444 상태 코드

**원인**: Nginx `server_name`이 요청 도메인과 매칭되지 않음

**확인**:
```bash
# Host 헤더 확인
curl -H "Host: blogmine.ai.kr" http://localhost/
curl -H "Host: api.blogmine.ai.kr" http://localhost/health

# Nginx 설정 테스트
docker exec blog-mine-nginx nginx -t

# Nginx 로그 (444는 매칭 실패)
docker logs blog-mine-nginx | grep "444"

# nginx-unified.conf 확인
cat nginx-unified.conf | grep "server_name"
```

**해결**:
```nginx
# 프론트엔드 서버 블록에 default_server와 와일드카드 추가
server {
    listen 80 default_server;
    server_name blogmine.ai.kr localhost _;
    # ...
}
```

### CloudFront 헤더 전달 실패

**증상**: Nginx가 Host 헤더를 제대로 받지 못함

**해결**: CloudFront Origin Request Policy 확인
- Policy: AllViewer (모든 헤더 전달)
- 또는 Custom Policy에서 `Host` 헤더 명시적 포함

### 502 Bad Gateway

```bash
# 컨테이너 상태 확인
docker ps

# Nginx 에러 로그
docker logs blog-mine-nginx

# 백엔드/프론트엔드 로그
docker logs blog-mine-backend
docker logs blog-mine-frontend

# 네트워크 연결 테스트
docker exec blog-mine-nginx ping frontend
docker exec blog-mine-nginx ping backend
```

## 11. 캐시 무효화

### CloudFront 캐시 삭제

```bash
# AWS CLI 설치 필요
aws cloudfront create-invalidation \
  --distribution-id <DISTRIBUTION-ID> \
  --paths "/*"

# 특정 경로만
aws cloudfront create-invalidation \
  --distribution-id <DISTRIBUTION-ID> \
  --paths "/_nuxt/*" "/favicon.ico"
```

## 12. 모니터링

### CloudFront Metrics
- 요청 수, 에러율, 캐시 히트율
- 데이터 전송량 (Origin vs Edge)
- 지역별 트래픽 분포

### Nginx Logs
```bash
# 도메인별 요청 통계
docker exec blog-mine-nginx awk '{print $NF}' /var/log/nginx/access.log | sort | uniq -c

# 상태 코드별 통계
docker exec blog-mine-nginx awk '{print $9}' /var/log/nginx/access.log | sort | uniq -c

# 실시간 모니터링
docker exec blog-mine-nginx tail -f /var/log/nginx/access.log
```

## 13. 비용 최적화

### CloudFront
- ✅ 단일 Distribution으로 비용 절감
- Cache Behaviors 최적화로 Origin 요청 최소화
- 압축 활성화로 데이터 전송량 감소

### EC2
- 적절한 인스턴스 타입 (t3.small ~ t3.medium)
- 예약 인스턴스 또는 Savings Plans
- CloudWatch Alarms + Auto Scaling

## 참고 자료

- [CloudFront Multi-Domain Setup](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/CNAMEs.html)
- [Nginx Server Blocks](http://nginx.org/en/docs/http/server_names.html)
- [ACM Multi-Domain Certificates](https://docs.aws.amazon.com/acm/latest/userguide/acm-certificate.html)
