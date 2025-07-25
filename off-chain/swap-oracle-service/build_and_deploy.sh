#!/bin/bash

set -e

SERVICE_NAME="swap-oracle-service"
AWS_REGION="${AWS_REGION:-us-east-1}"
ECR_REPOSITORY_NAME="${ECR_REPOSITORY_NAME:-${SERVICE_NAME}}"
BUILD_TAG="${BUILD_TAG:-latest}"


RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}


check_aws_cli() {
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI is not installed. Please install it first."
        exit 1
    fi
}

check_docker() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install it first."
        exit 1
    fi

    if ! docker info &> /dev/null; then
        log_error "Docker daemon is not running. Please start Docker."
        exit 1
    fi
}

get_account_id() {
    aws sts get-caller-identity --query Account --output text
}

check_aws_credentials() {
    log_info "Checking AWS credentials..."

    if [[ -z "$AWS_ACCESS_KEY_ID" ]]; then
        log_error "AWS_ACCESS_KEY_ID is not set"
        exit 1
    else
        log_info "AWS_ACCESS_KEY_ID is set (starts with: ${AWS_ACCESS_KEY_ID:0:4}...)"
    fi

    if [[ -z "$AWS_SECRET_ACCESS_KEY" ]]; then
        log_error "AWS_SECRET_ACCESS_KEY is not set"
        exit 1
    else
        log_info "AWS_SECRET_ACCESS_KEY is set (length: ${#AWS_SECRET_ACCESS_KEY})"
    fi

    if [[ -z "$AWS_REGION" ]]; then
        log_warn "AWS_REGION is not set, using default: $AWS_REGION"
    else
        log_info "AWS_REGION is set to: $AWS_REGION"
    fi
}


ecr_login() {
    log_info "Logging into Amazon ECR..."
    aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $1
}

clean_project() {
    log_info "Cleaning build artifacts..."

    if [ -d "node_modules" ]; then
        rm -rf node_modules
        log_info "Removed node_modules"
    fi

    if [ -d "lib" ]; then
        rm -rf lib
        log_info "Removed dist"
    fi

    log_info "Clean completed"
}

npm_install() {
    log_info "Installing dependencies..."
    if [ -f "package-lock.json" ]; then
        npm ci
    else
        npm install
    fi
    log_info "Dependencies installed successfully"
}

build_project() {
    log_info "Building TypeScript project..."
    npm run build
    log_info "Project built successfully"
}

build_image() {
    local image_tag=$1
    log_info "Building Docker image..."

    docker build -t $SERVICE_NAME:$BUILD_TAG .
    docker tag $SERVICE_NAME:$BUILD_TAG $image_tag

    log_info "Image built successfully: $image_tag"
}

push_image() {
    local image_tag=$1
    log_info "Pushing image to ECR..."

    docker push $image_tag

    log_info "Image pushed successfully: $image_tag"
}


main() {
    log_info "Starting build and deploy process for $SERVICE_NAME"

    check_aws_cli
    check_docker
    check_aws_credentials


    ACCOUNT_ID=$(get_account_id)
    ECR_URI="$ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"
    IMAGE_TAG="$ECR_URI/$ECR_REPOSITORY_NAME:$BUILD_TAG"

    log_info "AWS Account ID: $ACCOUNT_ID"
    log_info "ECR URI: $ECR_URI"
    log_info "Image Tag: $IMAGE_TAG"


    ecr_login $ECR_URI

    clean_project
    npm_install
    build_project

    build_image $IMAGE_TAG

    push_image $IMAGE_TAG

    log_info "Build and deploy completed successfully!"
    log_info "Image URI: $IMAGE_TAG"
}

# Handle script arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --region)
            AWS_REGION="$2"
            shift 2
            ;;
        --repository)
            ECR_REPOSITORY_NAME="$2"
            shift 2
            ;;
        --tag)
            BUILD_TAG="$2"
            shift 2
            ;;
        --help)
            echo "Usage: $0 [options]"
            echo "Options:"
            echo "  --region REGION        AWS region (default: us-east-1)"
            echo "  --repository NAME      ECR repository name (default: swap-oracle-service)"
            echo "  --tag TAG             Build tag (default: latest)"
            echo "  --help                Show this help message"
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

main