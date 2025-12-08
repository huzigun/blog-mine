# Multi-stage Dockerfile for Nuxt 4 Frontend (pnpm workspace)
# Stage 1: Development (with HMR support)
FROM node:20-alpine AS development

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace root files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./

# Copy frontend package.json
COPY frontend/package.json ./frontend/

# Install all workspace dependencies
RUN pnpm install --frozen-lockfile

# Copy frontend source code
COPY frontend ./frontend

# Set working directory to frontend
WORKDIR /app/frontend

# Expose Nuxt dev server and DevTools ports
EXPOSE 8706 24678

# Development command (override in docker-compose)
CMD ["pnpm", "run", "dev"]


# Stage 2: Build (compile Nuxt application)
FROM node:20-alpine AS build

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace root files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./

# Copy frontend package.json
COPY frontend/package.json ./frontend/

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Copy frontend source code
COPY frontend ./frontend

# Build Nuxt application
WORKDIR /app/frontend
RUN pnpm run build


# Stage 3: Production
FROM node:20-alpine AS production

# Install pnpm and dumb-init
RUN corepack enable && corepack prepare pnpm@latest --activate && \
    apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nuxt -u 1001

WORKDIR /app

# Copy workspace root files with ownership
COPY --chown=nuxt:nodejs --from=build /app/pnpm-workspace.yaml /app/package.json /app/pnpm-lock.yaml ./

# Copy frontend package.json with ownership
COPY --chown=nuxt:nodejs --from=build /app/frontend/package.json ./frontend/

# Install production dependencies only (avoids copying large node_modules)
RUN pnpm install --prod --frozen-lockfile

# Copy built application from build stage with ownership
COPY --chown=nuxt:nodejs --from=build /app/frontend/.output ./frontend/.output

# Copy public assets (if any) with ownership
COPY --chown=nuxt:nodejs --from=build /app/frontend/public ./frontend/public

# Change ownership of installed node_modules
RUN chown -R nuxt:nodejs /app/node_modules /app/frontend/node_modules 2>/dev/null || true

# Switch to non-root user
USER nuxt

# Set working directory to frontend
WORKDIR /app/frontend

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start Nuxt in production mode
CMD ["node", ".output/server/index.mjs"]
