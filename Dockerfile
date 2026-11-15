# =============================================================================
# LuminaFM CMMS Backend - Hardened Multi-Stage Production Dockerfile
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Builder (Prisma Client Generation & TypeScript Compilation)
# -----------------------------------------------------------------------------
FROM node:22-alpine AS builder

WORKDIR /app

RUN apk add --no-cache openssl

COPY package.json package-lock.json* ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Prune development dependencies for minimal production image footprint
RUN npm prune --production

# -----------------------------------------------------------------------------
# Stage 2: Production Runtime (Hardened, Non-Root)
# -----------------------------------------------------------------------------
FROM node:22-alpine AS production

WORKDIR /app

# Install security updates, OpenSSL (Prisma runtime), postgresql-client (readiness checks), and tini (PID 1 signal handler)
RUN apk add --no-cache openssl postgresql-client wget tini bash

ENV NODE_ENV=production
ENV PORT=3000

# Copy node_modules, compiled distribution code, and database migrations
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY docker/backend-entrypoint.sh /app/docker/backend-entrypoint.sh

# Create persistent directories and assign ownership to unprivileged user 'node'
RUN mkdir -p /app/uploads /var/backups/luminafm && \
    sed -i 's/\r$//' /app/docker/backend-entrypoint.sh && \
    chmod +x /app/docker/backend-entrypoint.sh && \
    chown -R node:node /app /var/backups/luminafm

# Switch to unprivileged non-root user for container security
USER node

EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health/live || exit 1

ENTRYPOINT ["/sbin/tini", "--", "/app/docker/backend-entrypoint.sh"]
