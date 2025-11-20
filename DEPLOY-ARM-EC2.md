# ARM EC2 (Graviton) 배포 가이드

## 아키텍처

```
로컬 개발 → Docker Build (ARM64) → Docker Hub → EC2 Graviton Pull & Run
```

## 1. Docker Hub에 이미지 푸시

### A. 로컬에서 빌드 및 푸시

```bash
# Docker Hub 로그인
docker login

# ARM64 이미지 빌드 및 푸시
./docker-build-arm.sh

# 버전 태그 지정 (선택사항)
./docker-build-arm.sh v1.0.0
```

**중요**: M1/M2 Mac이나 ARM 장비에서 실행하면 네이티브 ARM64 빌드가 가능합니다.

### B. 다른 아키텍처에서 빌드 (x86_64)

x86_64 장비에서 ARM64 이미지를 빌드하려면 QEMU 설정이 필요합니다:

```bash
# QEMU 설치 (한 번만)
docker run --privileged --rm tonistiigi/binfmt --install arm64

# 크로스 플랫폼 빌드
docker buildx create --name arm-builder --use
docker buildx inspect --bootstrap

# 빌드 및 푸시
docker buildx build \
  --platform linux/arm64 \
  -f backend/Dockerfile \
  -t atmsads/blog-mine-backend:latest \
  --target production \
  --push \
  .

docker buildx build \
  --platform linux/arm64 \
  -f frontend/Dockerfile \
  -t atmsads/blog-mine-frontend:latest \
  --target production \
  --push \
  .
```

## 2. EC2 인스턴스 생성 (Graviton)

### A. 인스턴스 타입 선택

**권장 인스턴스**:
- **t4g.small**: 2 vCPU, 2GB RAM (개발/테스트)
- **t4g.medium**: 2 vCPU, 4GB RAM (소규모 프로덕션)
- **t4g.large**: 2 vCPU, 8GB RAM (프로덕션)
- **c7g.large**: 2 vCPU, 4GB RAM (컴퓨팅 집약적)

### B. AMI 선택

**권장 AMI** (ARM64 지원):
- Amazon Linux 2023 (AL2023) - ARM64
- Ubuntu 22.04 LTS (ARM64)
- Amazon Linux 2 (ARM64)

### C. EC2 생성 체크리스트

```yaml
인스턴스 타입: t4g.medium (또는 요구사항에 맞게)
AMI: Amazon Linux 2023 (ARM64)
스토리지: 20GB gp3 (SSD)
보안 그룹:
  - SSH (22): My IP
  - HTTP (80): 0.0.0.0/0 (CloudFront)
키 페어: 새로 생성 또는 기존 키 사용
```

## 3. EC2 초기 설정

### A. SSH 접속

```bash
ssh -i your-key.pem ec2-user@<EC2-Public-IP>
```

### B. Docker 설치 (Amazon Linux 2023)

```bash
# 시스템 업데이트
sudo dnf update -y

# Docker 설치
sudo dnf install -y docker

# Docker 서비스 시작
sudo systemctl start docker
sudo systemctl enable docker

# 현재 사용자를 docker 그룹에 추가
sudo usermod -a -G docker $USER

# 재로그인 (그룹 변경 적용)
exit
# SSH 다시 접속

# Docker 버전 확인
docker --version
```

### C. Docker Compose 설치

```bash
# Docker Compose 다운로드 (ARM64용)
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# 실행 권한 부여
sudo chmod +x /usr/local/bin/docker-compose

# 버전 확인
docker-compose --version
```

### D. 프로젝트 파일 배포

```bash
# 프로젝트 디렉토리 생성
mkdir -p ~/blog-mine
cd ~/blog-mine

# Git 클론 (설정 파일용)
git clone https://github.com/your-username/blog-mine.git .

# 또는 필요한 파일만 복사
scp -i your-key.pem docker-compose.prod-hub.yml ec2-user@<EC2-IP>:~/blog-mine/
scp -i your-key.pem nginx-unified.conf ec2-user@<EC2-IP>:~/blog-mine/
scp -i your-key.pem .env ec2-user@<EC2-IP>:~/blog-mine/
```

## 4. 환경 변수 설정

### A. .env 파일 생성

```bash
cd ~/blog-mine
nano .env
```

```bash
# Application
APP_NAME=blog-mine-backend
APP_VERSION=0.0.1
NODE_ENV=production
PORT=9706

# RDS Database
DB_HOST=your-rds-instance.xxxxxx.ap-northeast-2.rds.amazonaws.com
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your-secure-password
DB_DATABASE=blog_mine_production
DB_SYNCHRONIZE=false
DB_LOGGING=false
DB_SSL=true

# Prisma Database URL
DATABASE_URL="postgresql://postgres:your-password@your-rds.ap-northeast-2.rds.amazonaws.com:5432/blog_mine_production?schema=public&sslmode=require"

# JWT
JWT_SECRET=your-strong-secret-min-32-chars
JWT_EXPIRES_IN=1d

# CORS
CORS_ORIGIN=https://blogmine.ai.kr

# Logging
LOG_LEVEL=warn

# Swagger
SWAGGER_ENABLED=false

# Rate Limiting
RATE_LIMIT_TTL=60
RATE_LIMIT_MAX=100

# OpenAI
OPENAI_API_KEY=sk-your-api-key
OPENAI_SUMMARY_MODEL=gpt-4o-mini
OPENAI_GENERATION_MODEL=gpt-4o

# Naver API
NAVER_CLIENT_ID=your-client-id
NAVER_CLIENT_SECRET=your-client-secret

# Email
EMAIL_SMTP=smtp.yourdomain.com
EMAIL_USER=noreply@yourdomain.com
EMAIL_PASS=your-email-password

# Nicepay
NICEPAY_UNAUTH_MID=your-nicepay-mid
NICEPAY_UNAUTH_KEY=your-nicepay-key
```

## 5. Docker 이미지 Pull 및 실행

### A. 이미지 Pull

```bash
cd ~/blog-mine

# Docker Hub에서 이미지 가져오기
docker pull atmsads/blog-mine-backend:latest
docker pull atmsads/blog-mine-frontend:latest

# 이미지 확인
docker images | grep blog-mine
```

### B. 컨테이너 실행

```bash
# docker-compose로 실행
docker-compose -f docker-compose.prod-hub.yml up -d

# 로그 확인
docker-compose -f docker-compose.prod-hub.yml logs -f

# 컨테이너 상태 확인
docker ps
```

### C. 헬스체크

```bash
# Nginx 헬스체크
curl http://localhost/health

# 백엔드 헬스체크 (호스트 헤더 지정)
curl -H "Host: api.blogmine.ai.kr" http://localhost/health

# 프론트엔드 헬스체크
curl -H "Host: blogmine.ai.kr" http://localhost/health
```

## 6. Prisma 마이그레이션 실행

```bash
# 백엔드 컨테이너에서 마이그레이션 실행
docker exec -it blog-mine-backend sh

# 컨테이너 내부에서
cd /app/backend
npx prisma migrate deploy

# 마이그레이션 확인
npx prisma migrate status

# 종료
exit
```

## 7. 업데이트 프로세스

### A. 새 버전 배포

```bash
# 1. 로컬에서 새 이미지 빌드 및 푸시
./docker-build-arm.sh v1.1.0

# 2. EC2에서 이미지 업데이트
cd ~/blog-mine

# 기존 컨테이너 중지
docker-compose -f docker-compose.prod-hub.yml down

# 최신 이미지 pull
docker pull atmsads/blog-mine-backend:latest
docker pull atmsads/blog-mine-frontend:latest

# 컨테이너 재시작
docker-compose -f docker-compose.prod-hub.yml up -d

# 로그 확인
docker-compose -f docker-compose.prod-hub.yml logs -f
```

### B. 롤백

```bash
# 이전 버전으로 롤백
docker-compose -f docker-compose.prod-hub.yml down

# 특정 버전 pull
docker pull atmsads/blog-mine-backend:v1.0.0
docker pull atmsads/blog-mine-frontend:v1.0.0

# docker-compose.prod-hub.yml 수정 (버전 태그 변경)
nano docker-compose.prod-hub.yml
# image: atmsads/blog-mine-backend:v1.0.0

# 재시작
docker-compose -f docker-compose.prod-hub.yml up -d
```

## 8. 모니터링

### A. 컨테이너 상태

```bash
# 실시간 상태 모니터링
docker stats

# 로그 확인
docker logs -f blog-mine-backend
docker logs -f blog-mine-frontend
docker logs -f blog-mine-nginx

# 컨테이너 재시작
docker-compose -f docker-compose.prod-hub.yml restart
```

### B. 디스크 사용량

```bash
# 디스크 확인
df -h

# Docker 이미지 정리
docker image prune -a

# Docker 시스템 정리
docker system prune -a --volumes
```

### C. 성능 모니터링

```bash
# CPU/메모리 사용량
top

# 네트워크 통계
netstat -tuln

# Nginx 액세스 로그
docker exec blog-mine-nginx tail -f /var/log/nginx/access.log
```

## 9. 보안 체크리스트

- [ ] Security Group에서 SSH는 My IP만 허용
- [ ] .env 파일 권한 설정 (600)
- [ ] RDS 보안 그룹에서 EC2 보안 그룹만 허용
- [ ] CloudFront에서만 EC2 접근 가능하도록 설정
- [ ] 정기적인 보안 업데이트 적용
- [ ] Docker 이미지 정기 업데이트

```bash
# .env 파일 권한
chmod 600 ~/blog-mine/.env

# 보안 업데이트
sudo dnf update -y
```

## 10. 문제 해결

### A. 컨테이너가 시작되지 않음

```bash
# 로그 확인
docker logs blog-mine-backend
docker logs blog-mine-frontend

# 환경 변수 확인
docker exec blog-mine-backend env | grep DATABASE_URL

# 컨테이너 재빌드
docker-compose -f docker-compose.prod-hub.yml up -d --force-recreate
```

### B. 데이터베이스 연결 실패

```bash
# RDS 연결 테스트
telnet your-rds-instance.ap-northeast-2.rds.amazonaws.com 5432

# 보안 그룹 확인
# RDS 보안 그룹에서 EC2 보안 그룹 허용 확인

# DATABASE_URL 확인
docker exec blog-mine-backend env | grep DATABASE_URL
```

### C. 502 Bad Gateway

```bash
# 컨테이너 상태 확인
docker ps

# Nginx 로그
docker logs blog-mine-nginx

# 백엔드/프론트엔드 헬스체크
curl http://localhost:9706/health
curl http://localhost:3000/health
```

## 11. 비용 최적화

### A. 인스턴스 타입 최적화

- 개발: t4g.micro (1GB RAM) - 무료 티어
- 테스트: t4g.small (2GB RAM)
- 프로덕션: t4g.medium 이상

### B. 스토리지 최적화

```bash
# 사용하지 않는 이미지 삭제
docker image prune -a

# 로그 로테이션 설정
sudo nano /etc/logrotate.d/docker-containers
```

### C. 예약 인스턴스

- 1년/3년 예약 시 최대 72% 할인
- Savings Plans 활용

## 참고 자료

- [AWS Graviton Processors](https://aws.amazon.com/ec2/graviton/)
- [Docker Multi-platform Builds](https://docs.docker.com/build/building/multi-platform/)
- [Docker Hub](https://hub.docker.com/)
- [Amazon Linux 2023](https://aws.amazon.com/linux/amazon-linux-2023/)
