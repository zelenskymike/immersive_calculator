# Simplified single-container Dockerfile for TCO Calculator
FROM node:18-alpine

# Install curl for health checks
RUN apk add --no-cache curl

# Create app directory
WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S tcocalc && \
    adduser -S tcocalc -u 1001 -G tcocalc

# Copy the standalone calculator (no external dependencies needed)
COPY tco-calculator.js ./

# Set ownership
RUN chown -R tcocalc:tcocalc /app

# Switch to non-root user
USER tcocalc

# Expose port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:4000/ || exit 1

# Run the calculator
CMD ["node", "tco-calculator.js"]