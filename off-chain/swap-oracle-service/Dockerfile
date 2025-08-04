FROM node:20-alpine

# Create app directory
WORKDIR /app
ARG AWS_REGION='us-east-1'
ENV AWS_REGION=$AWS_REGION
ARG ENV='dev3'
ENV ENV=$ENV
COPY . /app
EXPOSE 8080
CMD ["node", "bin/service"]