FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --only=production

COPY dist ./dist
COPY config ./dist/config

EXPOSE 8080
CMD ["node", "dist/index.js"]