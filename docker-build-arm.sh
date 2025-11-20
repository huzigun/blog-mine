#!/bin/bash

# ARM64용 Docker 이미지 빌드 및 Docker Hub 푸시 스크립트
# EC2 Graviton (ARM) 인스턴스용

set -e  # 에러 발생 시 스크립트 중단

# 변수 설정
DOCKER_USERNAME="atmsads"
REPO_NAME="blog-mine"
VERSION=${1:-latest}  # 첫 번째 인자로 버전 지정, 기본값은 latest

# 색상 출력
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}ARM64 Docker 이미지 빌드 시작${NC}"
echo -e "${BLUE}================================${NC}"

# Docker Hub 로그인 확인
echo -e "\n${GREEN}1. Docker Hub 로그인 확인...${NC}"
if ! docker info | grep -q "Username: $DOCKER_USERNAME"; then
    echo "Docker Hub에 로그인하세요:"
    docker login
else
    echo "이미 로그인되어 있습니다: $DOCKER_USERNAME"
fi

# 백엔드 이미지 빌드
echo -e "\n${GREEN}2. 백엔드 이미지 빌드 (ARM64)...${NC}"
docker build \
    --platform linux/arm64 \
    -f backend/Dockerfile \
    -t ${DOCKER_USERNAME}/${REPO_NAME}-backend:${VERSION} \
    -t ${DOCKER_USERNAME}/${REPO_NAME}-backend:latest \
    --target production \
    .

# 프론트엔드 이미지 빌드
echo -e "\n${GREEN}3. 프론트엔드 이미지 빌드 (ARM64)...${NC}"
docker build \
    --platform linux/arm64 \
    -f frontend/Dockerfile \
    -t ${DOCKER_USERNAME}/${REPO_NAME}-frontend:${VERSION} \
    -t ${DOCKER_USERNAME}/${REPO_NAME}-frontend:latest \
    --target production \
    .

# 이미지 크기 확인
echo -e "\n${GREEN}4. 빌드된 이미지 확인...${NC}"
docker images | grep ${DOCKER_USERNAME}/${REPO_NAME}

# Docker Hub에 푸시
echo -e "\n${GREEN}5. Docker Hub에 푸시 중...${NC}"

echo "백엔드 이미지 푸시..."
docker push ${DOCKER_USERNAME}/${REPO_NAME}-backend:${VERSION}
docker push ${DOCKER_USERNAME}/${REPO_NAME}-backend:latest

echo "프론트엔드 이미지 푸시..."
docker push ${DOCKER_USERNAME}/${REPO_NAME}-frontend:${VERSION}
docker push ${DOCKER_USERNAME}/${REPO_NAME}-frontend:latest

echo -e "\n${GREEN}================================${NC}"
echo -e "${GREEN}✅ 완료!${NC}"
echo -e "${GREEN}================================${NC}"
echo -e "\n이미지 정보:"
echo "  Backend:  ${DOCKER_USERNAME}/${REPO_NAME}-backend:${VERSION}"
echo "  Frontend: ${DOCKER_USERNAME}/${REPO_NAME}-frontend:${VERSION}"
echo -e "\nEC2에서 사용:"
echo "  docker pull ${DOCKER_USERNAME}/${REPO_NAME}-backend:latest"
echo "  docker pull ${DOCKER_USERNAME}/${REPO_NAME}-frontend:latest"
