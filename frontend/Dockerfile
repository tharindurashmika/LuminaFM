# =============================================================================
# LuminaFM CMMS Frontend - Multi-Stage Production Dockerfile (Vite + Nginx)
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Builder (TypeScript Check & Vite Production Bundle)
# -----------------------------------------------------------------------------
FROM node:22-alpine AS builder

WORKDIR /app

# Install frontend dependencies
COPY package.json package-lock.json* ./
RUN npm ci

# Copy frontend source files
COPY . .

# Optional build-time API base URL (defaults to '/api' proxied via Nginx)
ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

# Compile TypeScript and build production static bundle into /app/dist
RUN npm run build

# -----------------------------------------------------------------------------
# Stage 2: Production Web Server (Nginx Alpine)
# -----------------------------------------------------------------------------
FROM nginx:1.27-alpine AS production

# Copy custom Nginx SPA & API reverse-proxy configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy Vite production build output from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]

