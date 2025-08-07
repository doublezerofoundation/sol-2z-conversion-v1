# build image
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY idl ./idl
COPY src ./src

RUN npm run build

# runtime image
FROM node:20-alpine AS runner

WORKDIR /app

COPY --from=builder /app/package.json ./
COPY --from=builder /app/package-lock.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist

# environment variables
ENV ENV=dev1 \
    RPC_URL=http://127.0.0.1:8899 \
    CONCURRENCY=8

CMD ["node", "dist/src/index.js"]
