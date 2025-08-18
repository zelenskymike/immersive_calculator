# Build stage
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy all files
COPY . .

# Production stage
FROM node:18-alpine

# Install additional tools for better debugging
RUN apk add --no-cache curl

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy application files
COPY --from=builder --chown=nodejs:nodejs /app .

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:5000/ || exit 1

# Switch to non-root user
USER nodejs

# Start the application
CMD ["node", "server.js"]