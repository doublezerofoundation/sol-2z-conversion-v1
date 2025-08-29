FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --only=production

COPY dist ./dist
COPY config ./config
COPY config ./dist/config
COPY idl ./idl
COPY bin ./bin

RUN chmod +x bin/service

EXPOSE 8080
CMD ["node", "dist/src/index.js"]
