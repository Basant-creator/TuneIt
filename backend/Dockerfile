# ---- Build stage -----------------------------------------------------------
FROM node:20-alpine AS builder
WORKDIR /app

# Prisma needs OpenSSL to generate/run its engines on Alpine.
RUN apk add --no-cache openssl

COPY package*.json ./
COPY prisma ./prisma
# `postinstall` runs `prisma generate`, so the schema must already be present.
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
COPY scripts ./scripts
RUN npm run build

# ---- Runtime stage ---------------------------------------------------------
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN apk add --no-cache openssl

COPY package*.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist

# Run unprivileged.
USER node

EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:'+(process.env.PORT||3001)+'/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "dist/src/server.js"]
