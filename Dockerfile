FROM node:20-alpine
# Set working directory
WORKDIR /app
# Copy package files first for layer caching
COPY package*.json ./
# Install production dependencies only
RUN npm ci --omit=dev
# Copy source
COPY server.js ./
# Cloud Run expects the container to listen on $PORT (default 8080)
ENV PORT=8080
ENV NODE_ENV=production
EXPOSE 8080
# Run as non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser
CMD ["node", "server.js"]