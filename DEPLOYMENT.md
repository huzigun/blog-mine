# 배포 가이드 (EC2 + CloudFront + ACM)

이 가이드는 AWS EC2, CloudFront, ACM을 사용한 배포 방법을 설명합니다.

## 아키텍처 개요

```
사용자 브라우저
  ↓ (HTTPS - ACM 인증서)
CloudFront (CDN)
  ↓ (HTTP - Origin)
EC2 Instance
  ├─ Nginx (Reverse Proxy) :80
  ├─ Frontend (Nuxt SSR) :3000
  └─ Backend (NestJS) :9706
      └─ RDS PostgreSQL (외부)
```

### 주요 특징
- **CloudFront**: HTTPS 처리 (ACM 인증서), CDN 캐싱, DDoS 보호
- **EC2**: HTTP만 처리 (certbot 불필요), Docker Compose로 서비스 관리
- **RDS**: 관리형 PostgreSQL, 자동 백업, Multi-AZ 지원
- **보안**: CloudFront Origin Shield, Security Groups, Private Subnet 격리

---

## 1. 사전 준비

### 필수 요구사항
- [ ] AWS 계정 및 IAM 권한 (EC2, CloudFront, ACM, Route53)
- [ ] 도메인 보유 (Route53 또는 외부 DNS)
- [ ] Docker 및 Docker Compose 설치 (EC2에 설치 필요)
- [ ] Git 저장소 접근 권한

### 환경 변수 준비
```bash
# 데이터베이스
DB_USERNAME=your_db_user
DB_PASSWORD=your_secure_password
DB_DATABASE=blog_mine_production

# JWT
JWT_SECRET=your-strong-jwt-secret-min-32-chars

# OpenAI
OPENAI_API_KEY=sk-your-openai-api-key

# Nicepay (결제)
NICEPAY_MERCHANT_KEY=your-nicepay-key
NICEPAY_MERCHANT_ID=your-nicepay-id

# 도메인
DOMAIN=yourdomain.com
```

---

## 2. ACM 인증서 발급

### 2.1 AWS Certificate Manager에서 인증서 요청

1. **AWS Console** → **Certificate Manager** (us-east-1 리전 선택 필수!)
   - CloudFront는 us-east-1의 인증서만 사용 가능

2. **인증서 요청**:
   - 도메인 이름: `yourdomain.com`
   - 추가 도메인: `*.yourdomain.com` (와일드카드)
   - 검증 방법: DNS 검증 (권장) 또는 이메일 검증

3. **DNS 검증**:
   - ACM이 제공하는 CNAME 레코드를 Route53 또는 DNS 제공업체에 추가
   - 검증 완료까지 5-30분 소요

4. **인증서 ARN 저장**:
   ```
   arn:aws:acm:us-east-1:123456789012:certificate/abc123...
   ```

---

## 3. RDS PostgreSQL 설정

### 3.1 RDS 인스턴스 생성

**권장 스펙**:
- Engine: PostgreSQL 15.x
- Instance Class: db.t3.micro (프리티어) 또는 db.t3.small (프로덕션)
- Storage: 20GB gp3 (자동 확장 활성화)
- Multi-AZ: 프로덕션 환경에서 권장
- Public Access: No (EC2에서만 접근)

**보안 그룹 설정**:
```
Port 5432 - PostgreSQL (EC2 보안 그룹에서만 허용)
```

### 3.2 RDS 초기 설정

1. **VPC 및 Subnet 설정**:
   - VPC: EC2와 같은 VPC 선택
   - Subnet Group: Private subnet 사용 권장
   - Security Group: RDS 전용 보안 그룹 생성

2. **데이터베이스 생성**:
   ```
   Database name: blog_mine_production
   Master username: postgres (또는 원하는 이름)
   Master password: 강력한 비밀번호 (최소 16자)
   ```

3. **연결 정보 저장**:
   ```
   Endpoint: your-rds-instance.xxxxxx.ap-northeast-2.rds.amazonaws.com
   Port: 5432
   Database: blog_mine_production
   Username: postgres
   Password: your-secure-password
   ```

### 3.3 RDS 보안 그룹 설정

```bash
# EC2 보안 그룹 ID 확인
aws ec2 describe-security-groups --group-names "blog-mine-ec2-sg"

# RDS 보안 그룹에 EC2 보안 그룹 허용
aws ec2 authorize-security-group-ingress \
  --group-id sg-rds-xxxxx \
  --protocol tcp \
  --port 5432 \
  --source-group sg-ec2-xxxxx
```

### 3.4 초기 데이터베이스 설정 (선택사항)

```bash
# EC2에서 psql 클라이언트 설치
sudo yum install -y postgresql15

# RDS 연결 테스트
psql -h your-rds-instance.xxxxxx.rds.amazonaws.com \
     -U postgres \
     -d blog_mine_production

# 연결 성공 후 종료
\q
```

---

## 4. EC2 인스턴스 설정

### 4.1 EC2 인스턴스 생성

**권장 스펙**:
- AMI: Amazon Linux 2023 또는 Ubuntu 22.04 LTS
- 인스턴스 타입: t3.medium (최소 t3.small)
- 스토리지: 30GB gp3
- 보안 그룹:
  ```
  Port 22  - SSH (관리자 IP만 허용)
  Port 80  - HTTP (CloudFront에서만 허용)
  Port 443 - HTTPS (선택사항, CloudFront 전용)
  ```

### 4.2 EC2 초기 설정

```bash
# SSH 접속
ssh -i your-key.pem ec2-user@your-ec2-ip

# 시스템 업데이트
sudo yum update -y  # Amazon Linux
# sudo apt update && sudo apt upgrade -y  # Ubuntu

# Docker 설치
sudo yum install -y docker
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker ec2-user

# Docker Compose 설치
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 재접속하여 docker 그룹 적용
exit
ssh -i your-key.pem ec2-user@your-ec2-ip
```

### 4.3 프로젝트 배포

```bash
# Git 설치 (Amazon Linux)
sudo yum install -y git

# 프로젝트 클론
cd ~
git clone https://github.com/your-repo/blog-mine.git
cd blog-mine

# 환경 변수 설정 (RDS 연결 정보 포함)
cat > .env << EOF
# RDS Database (외부 PostgreSQL)
DB_HOST=your-rds-instance.xxxxxx.ap-northeast-2.rds.amazonaws.com
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_secure_rds_password
DB_DATABASE=blog_mine_production
DB_SSL=true

# JWT
JWT_SECRET=your-strong-jwt-secret-min-32-chars

# CloudFront Domain
CORS_ORIGIN=https://yourdomain.com

# OpenAI
OPENAI_API_KEY=sk-your-openai-api-key
OPENAI_SUMMARY_MODEL=gpt-4o-mini
OPENAI_GENERATION_MODEL=gpt-4o

# Nicepay
NICEPAY_MERCHANT_KEY=your-nicepay-key
NICEPAY_MERCHANT_ID=your-nicepay-id
EOF

# Nginx 설정 복사
cp nginx.conf.example nginx.conf

# Docker Compose 빌드 및 실행 (RDS 사용, PostgreSQL 컨테이너 없음)
docker-compose -f docker-compose.prod.yml up -d --build

# 로그 확인
docker-compose -f docker-compose.prod.yml logs -f
```

### 4.4 데이터베이스 마이그레이션

```bash
# Backend 컨테이너 접속
docker exec -it blog-mine-backend bash

# Prisma 마이그레이션 실행
npx prisma migrate deploy

# 시드 데이터 (선택사항)
npm run seed

# 컨테이너 종료
exit
```

---

## 5. CloudFront 배포

### 5.1 CloudFront Distribution 생성

1. **AWS Console** → **CloudFront** → **Create Distribution**

2. **Origin Settings**:
   - Origin Domain: `ec2-xx-xx-xx-xx.compute.amazonaws.com` (EC2 Public DNS)
   - Protocol: HTTP Only
   - HTTP Port: 80
   - Origin Shield: Enabled (선택사항, 비용 발생)

3. **Default Cache Behavior**:
   - Viewer Protocol Policy: **Redirect HTTP to HTTPS**
   - Allowed HTTP Methods: GET, HEAD, OPTIONS, PUT, POST, PATCH, DELETE
   - Cache Policy: `CachingOptimized` (또는 커스텀)
   - Origin Request Policy: `AllViewer`
   - Response Headers Policy: `SecurityHeadersPolicy` (권장)
   - Compress Objects Automatically: Yes

4. **Settings**:
   - Alternate Domain Names (CNAMEs): `yourdomain.com`, `www.yourdomain.com`
   - Custom SSL Certificate: 앞서 발급한 ACM 인증서 선택
   - Supported HTTP Versions: HTTP/2, HTTP/3
   - Default Root Object: (비워두기 - Nuxt SSR이 처리)
   - IPv6: Enabled

5. **Create Distribution** 클릭
   - 배포 완료까지 15-20분 소요
   - Distribution Domain Name 저장: `d111111abcdef8.cloudfront.net`

### 5.2 CloudFront Cache Policy (커스텀)

**추천 설정** (선택사항):

```yaml
Name: BlogMine-CachePolicy
Minimum TTL: 0
Maximum TTL: 31536000 (1년)
Default TTL: 86400 (1일)

Cache Key Settings:
  Headers:
    - Authorization
    - CloudFront-Viewer-Country
  Query Strings: All
  Cookies:
    - access_token
    - refresh_token

Compression: Gzip, Brotli
```

### 5.3 CloudFront Functions (선택사항)

**Viewer Request 함수** - Security Headers 추가:

```javascript
function handler(event) {
    var response = event.response;
    var headers = response.headers;

    headers['strict-transport-security'] = { value: 'max-age=63072000; includeSubdomains; preload'};
    headers['x-content-type-options'] = { value: 'nosniff'};
    headers['x-frame-options'] = { value: 'SAMEORIGIN'};
    headers['x-xss-protection'] = { value: '1; mode=block'};

    return response;
}
```

---

## 6. Route53 DNS 설정

### 6.1 A Record (Alias) 생성

1. **Route53** → **Hosted Zones** → 도메인 선택

2. **Create Record**:
   ```
   Record name: (비워두기 - apex domain)
   Record type: A
   Alias: Yes
   Route traffic to: CloudFront distribution
   Distribution: d111111abcdef8.cloudfront.net 선택
   Routing policy: Simple routing
   ```

3. **WWW 서브도메인**:
   ```
   Record name: www
   Record type: A
   Alias: Yes
   Route traffic to: CloudFront distribution
   Distribution: d111111abcdef8.cloudfront.net 선택
   ```

### 6.2 DNS 전파 확인

```bash
# DNS 전파 확인 (5-10분 소요)
dig yourdomain.com
dig www.yourdomain.com

# CloudFront 응답 확인
curl -I https://yourdomain.com
```

---

## 7. 쿠키 관리 전략

### 7.1 현재 구조 (Nuxt Server API 사용)

```
사용자 브라우저
  ↓ HTTPS (CloudFront)
CloudFront
  ↓ HTTP (Origin)
Nginx (:80)
  ↓
Frontend (Nuxt SSR :3000)
  ├─ /api/auth/* → Nuxt Server API
  │   ↓
  └─ Backend (NestJS :9706)
```

**쿠키 설정**:
- `frontend/server/utils/cookies.ts`에서 환경별 자동 설정
- Production: `secure: true`, `sameSite: 'strict'`
- httpOnly 쿠키는 Nuxt Server API에서 관리

**환경 변수**:
```bash
# frontend/.env.production
NUXT_PUBLIC_API_BASE_URL=http://backend:9706
NUXT_PUBLIC_USE_DIRECT_API=false

# backend/.env.production
CORS_ORIGIN=https://yourdomain.com
```

### 7.2 쿠키 동작 확인

```bash
# 로그인 테스트
curl -X POST https://yourdomain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}' \
  -c cookies.txt \
  -v

# 쿠키 확인
cat cookies.txt

# 인증 API 호출
curl https://yourdomain.com/api/user/profile \
  -b cookies.txt \
  -v
```

---

## 8. 모니터링 및 로그

### 8.1 CloudWatch Logs 설정

```bash
# EC2에 CloudWatch Logs Agent 설치
sudo yum install -y amazon-cloudwatch-agent

# 설정 파일 생성
sudo cat > /opt/aws/amazon-cloudwatch-agent/etc/config.json << EOF
{
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/var/log/docker/*.log",
            "log_group_name": "/aws/ec2/blog-mine",
            "log_stream_name": "{instance_id}/docker"
          }
        ]
      }
    }
  }
}
EOF

# Agent 시작
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config \
  -m ec2 \
  -s \
  -c file:/opt/aws/amazon-cloudwatch-agent/etc/config.json
```

### 8.2 Docker 로그 확인

```bash
# 전체 서비스 로그
docker-compose -f docker-compose.prod.yml logs -f

# 특정 서비스 로그
docker-compose -f docker-compose.prod.yml logs -f frontend
docker-compose -f docker-compose.prod.yml logs -f backend
```

### 8.3 CloudFront 모니터링

- **AWS Console** → **CloudFront** → Distribution → **Monitoring**
- 주요 메트릭:
  - Requests
  - Bytes Downloaded/Uploaded
  - Error Rate (4xx, 5xx)
  - Cache Hit Rate

---

## 9. 배포 자동화 (CI/CD)

### 9.1 GitHub Actions 예시

`.github/workflows/deploy.yml`:

```yaml
name: Deploy to EC2

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Deploy to EC2
        env:
          PRIVATE_KEY: ${{ secrets.EC2_SSH_KEY }}
          HOST: ${{ secrets.EC2_HOST }}
          USER: ec2-user
        run: |
          echo "$PRIVATE_KEY" > private_key
          chmod 600 private_key

          ssh -o StrictHostKeyChecking=no -i private_key ${USER}@${HOST} '
            cd ~/blog-mine
            git pull origin main
            docker-compose -f docker-compose.prod.yml down
            docker-compose -f docker-compose.prod.yml up -d --build
            docker-compose -f docker-compose.prod.yml exec -T backend npx prisma migrate deploy
          '

      - name: Invalidate CloudFront Cache
        run: |
          aws cloudfront create-invalidation \
            --distribution-id ${{ secrets.CLOUDFRONT_DISTRIBUTION_ID }} \
            --paths "/*"
```

---

## 10. 보안 체크리스트

### EC2 보안
- [ ] Security Group: CloudFront IP만 허용 (AWS Managed Prefix List 사용)
- [ ] SSH: 관리자 IP만 허용, Key-based authentication
- [ ] 시스템 패키지 정기 업데이트
- [ ] Docker 이미지 보안 스캔 (Trivy, Snyk)
- [ ] IAM Role: 최소 권한 원칙

### CloudFront 보안
- [ ] HTTPS Only (Redirect HTTP to HTTPS)
- [ ] ACM 인증서 자동 갱신 확인
- [ ] WAF 연결 (선택사항, SQL Injection, XSS 방어)
- [ ] Origin Shield 활성화 (DDoS 방어)
- [ ] Geo-restriction (필요시)

### 애플리케이션 보안
- [ ] JWT_SECRET: 강력한 랜덤 문자열 (최소 32자)
- [ ] 데이터베이스: Private subnet 격리
- [ ] 환경 변수: AWS Secrets Manager 사용 (권장)
- [ ] CORS: 특정 도메인만 허용
- [ ] Rate Limiting: API 요청 제한

---

## 11. 비용 최적화

### 예상 월 비용 (참고)

| 서비스 | 스펙 | 월 비용 (USD) |
|--------|------|--------------|
| EC2 t3.medium | On-Demand | ~$30 |
| EBS 30GB gp3 | - | ~$3 |
| RDS db.t3.micro | PostgreSQL 15 | ~$15 |
| RDS Storage 20GB | gp3 | ~$2.5 |
| CloudFront | 10GB 전송 | ~$1 |
| ACM | 인증서 | 무료 |
| Route53 | Hosted Zone | $0.50 |
| **합계** | - | **~$52** |

### 비용 절감 팁
- **EC2 Reserved Instances**: 1년 예약 시 40% 절감
- **RDS Reserved Instances**: 1년 예약 시 35% 절감
- **RDS 자동 백업**: 보존 기간 7일로 제한 (기본 설정)
- **CloudFront Origin Shield**: 트래픽이 낮을 때 비활성화
- **EBS 스냅샷**: 주기적으로 정리 (최신 3개만 유지)
- **CloudWatch Logs**: 보존 기간 7-14일로 설정
- **개발 환경**: RDS 인스턴스는 필요 시에만 실행 (Stop/Start)

---

## 12. 트러블슈팅

### CloudFront 502/504 에러
```bash
# EC2 헬스체크 확인
curl http://localhost/health

# Nginx 로그 확인
docker-compose -f docker-compose.prod.yml logs nginx

# Backend 상태 확인
docker-compose -f docker-compose.prod.yml ps
```

### RDS 연결 오류
```bash
# EC2에서 RDS 연결 테스트
psql -h your-rds-instance.xxxxxx.rds.amazonaws.com \
     -U postgres \
     -d blog_mine_production

# 연결 실패 시 확인 사항:
# 1. RDS 보안 그룹에 EC2 보안 그룹이 허용되어 있는지 확인
# 2. RDS VPC와 EC2 VPC가 동일한지 확인
# 3. DB_HOST, DB_USERNAME, DB_PASSWORD 환경 변수 확인

# Backend 컨테이너에서 직접 테스트
docker exec -it blog-mine-backend bash
npx prisma db pull  # 스키마 가져오기 테스트
```

### 쿠키가 설정되지 않음
- CloudFront Cache Policy에서 쿠키 전달 확인
- Nginx `proxy_set_header Cookie` 설정 확인
- 브라우저 개발자 도구 → Application → Cookies 확인

### HTTPS 인증서 오류
- ACM 인증서가 us-east-1 리전에 있는지 확인
- CloudFront Distribution의 CNAMEs와 도메인 일치 확인
- DNS CNAME 레코드 전파 확인

### 개발 환경 빌드 문제
```bash
# docker-compose.dev.yml 사용 시
docker-compose -f docker-compose.dev.yml up -d --build

# 로그 확인
docker-compose -f docker-compose.dev.yml logs -f

# 컨테이너 재시작
docker-compose -f docker-compose.dev.yml restart

# 완전 재빌드
docker-compose -f docker-compose.dev.yml down -v
docker-compose -f docker-compose.dev.yml up -d --build
```

---

## 13. 참고 자료

- [AWS CloudFront 문서](https://docs.aws.amazon.com/cloudfront/)
- [AWS Certificate Manager 가이드](https://docs.aws.amazon.com/acm/)
- [Nuxt 배포 가이드](https://nuxt.com/docs/getting-started/deployment)
- [NestJS 프로덕션 배포](https://docs.nestjs.com/deployment)
- [COOKIE-STRATEGY.md](COOKIE-STRATEGY.md) - 쿠키 관리 상세 가이드
