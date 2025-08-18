# build image
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY idl ./idl
COPY src ./src
COPY config ./config

RUN npm run build

# runtime image
FROM node:20-alpine AS runner

WORKDIR /app

COPY --from=builder /app/package.json ./
COPY --from=builder /app/package-lock.json ./
COPY --from=builder /app/config ./config
COPY --from=builder /app/config ./dist/config
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist

    
CMD ["node", "dist/src/index.js"]
