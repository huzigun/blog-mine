# Multi-stage Dockerfile for NestJS Backend (pnpm workspace)
# Stage 1: Development (with hot reload support)
FROM node:20-alpine AS development

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace root files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./

# Copy backend package.json
COPY backend/package.json ./backend/

# Install all workspace dependencies
RUN pnpm install --frozen-lockfile

# Copy backend source code
COPY backend ./backend

# Generate Prisma Client
WORKDIR /app/backend
RUN pnpm prisma generate

# Expose port
EXPOSE 9706

# Development command (override in docker-compose)
CMD ["pnpm", "run", "start:dev"]


# Stage 2: Build (compile TypeScript)
FROM node:20-alpine AS build

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace root files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./

# Copy backend package.json
COPY backend/package.json ./backend/

# Install all dependencies (including devDependencies for build)
RUN pnpm install --frozen-lockfile

# Copy backend source code
COPY backend ./backend

# Generate Prisma Client
WORKDIR /app/backend
RUN pnpm prisma generate

# Build the application
RUN pnpm run build

# 빌드 결과 확인 (디버깅용)
RUN ls -la dist/ && ls -la dist/

# Note: pnpm prune --prod 제거
# pnpm workspace에서 prune하면 Prisma 클라이언트가 삭제될 수 있음
# 대신 production 스테이지에서 필요한 파일만 복사


# Stage 3: Production
FROM node:20-alpine AS production

# Install pnpm and dumb-init
RUN corepack enable && corepack prepare pnpm@latest --activate && \
    apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

WORKDIR /app

# Copy workspace root files
COPY --from=build /app/pnpm-workspace.yaml /app/package.json /app/pnpm-lock.yaml ./

# Copy backend package.json
COPY --from=build /app/backend/package.json ./backend/

# Copy production dependencies
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/backend/node_modules ./backend/node_modules

# Copy Prisma schema and generated client
# Prisma 클라이언트는 node_modules 내부에 포함되어 있음
COPY --from=build /app/backend/prisma ./backend/prisma

# Copy compiled application
COPY --from=build /app/backend/dist ./backend/dist

# Change ownership to non-root user
RUN chown -R nestjs:nodejs /app

# Switch to non-root user
USER nestjs

# Set working directory to backend
WORKDIR /app/backend

# Expose port
EXPOSE 9706

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:9706/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/src/main"]
