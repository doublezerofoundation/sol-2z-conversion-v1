# build image
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# Copy pre-compiled application (built by build script)
COPY dist ./dist
COPY config ./config

RUN npm run build:docker

# runtime image
FROM node:20-alpine AS runner

WORKDIR /app

COPY --from=builder /app/package.json ./
COPY --from=builder /app/package-lock.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/config ./config
COPY --from=builder /app/config ./dist/config

CMD ["node", "dist/src/index.js"]
