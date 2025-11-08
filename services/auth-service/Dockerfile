# =============================================================================
# DOCKERFILE - Authentication Service
# =============================================================================
# Lý thuyết: Containerization
# - Đóng gói application + dependencies vào một image
# - Immutable infrastructure: Same image chạy ở mọi environment
# - Isolation: Mỗi container có filesystem, network riêng
# =============================================================================

# Multi-stage build để giảm image size
# Stage 1: Build stage
FROM node:18-alpine AS builder

# Lý thuyết: Layer Caching
# - Mỗi instruction tạo một layer
# - Layers được cache, rebuild nhanh hơn
# - Đặt ít thay đổi lên trước (dependencies), nhiều thay đổi xuống sau (source code)
WORKDIR /app

# Copy package files trước
# Nếu package.json không đổi, layer này được cache
COPY package*.json ./
RUN npm ci --only=production

# Stage 2: Production stage
FROM node:18-alpine

# Security: Không chạy as root
# Lý thuyết: Principle of Least Privilege
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy dependencies từ builder stage
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copy source code
COPY --chown=nodejs:nodejs . .

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3001

# Health check
# Lý thuyết: Container Health Monitoring
# - Docker/Kubernetes check container health
# - Auto-restart nếu unhealthy
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start server
CMD ["node", "src/server.js"]
