FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
ENV PORT=8080
ENV NODE_ENV=production
EXPOSE 8080
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser
CMD ["node", "server.js"]
