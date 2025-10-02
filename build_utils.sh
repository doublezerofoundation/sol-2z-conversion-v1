#!/bin/bash

# ---- Logging utility functions

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

# ---- Docker utility functions

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

build_image() {
    local image_tag=$1

    log_info "Building Docker image..."
    docker build --platform linux/amd64 -t "$SERVICE_NAME:$BUILD_TAG" .
    docker tag "$SERVICE_NAME:$BUILD_TAG" "$image_tag"
    log_info "Image built successfully: $image_tag"
}

push_image() {
    local image_tag=$1
    log_info "Pushing image to ECR..."

    docker push "$image_tag"

    log_info "Image pushed successfully: $image_tag"
}

# ---- AWS utility functions

check_aws_cli() {
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI is not installed. Please install it first."
        exit 1
    fi
}

get_account_id() {
    aws sts get-caller-identity --query Account --output text
}

check_aws_credentials() {
    log_info "Checking AWS credentials..."
    if ! aws sts get-caller-identity --output text &>/dev/null; then
        log_error "AWS credentials are not configured or are invalid."
        exit 1
    fi
    log_info "AWS credentials are valid."
}

ecr_login() {
    log_info "Logging into Amazon ECR..."
    aws ecr get-login-password --region "$AWS_REGION" | docker login --username AWS --password-stdin "$1"
}

# ---- Project utility functions

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

build_project_sync() {
    log_info "Building TypeScript project..."
    npm run build

    local timeout=30
    local counter=0

    while [ ! -d "lib" ] && [ $counter -lt $timeout ]; do
        sleep 1
        counter=$((counter + 1))
        log_info "Waiting for lib directory... ($counter/$timeout)"
    done

    if [ ! -d "lib" ]; then
        log_error "lib directory was not created after $timeout seconds"
        exit 1
    fi

    sleep 2
    log_info "Project built successfully"
}

remove_directory() {
    local dir_name=$1
    local timeout=${2:-30}

    if [ -d "$dir_name" ]; then
        log_info "Removing $dir_name..."
        rm -rf "$dir_name"

        # Wait for directory to be fully removed
        local counter=0
        while [ -d "$dir_name" ] && [ $counter -lt $timeout ]; do
            sleep 1
            counter=$((counter + 1))
            if [ $((counter % 5)) -eq 0 ]; then
                log_info "Still waiting for $dir_name removal... ($counter/$timeout)"
            fi
        done

        if [ -d "$dir_name" ]; then
            log_error "Failed to remove $dir_name after $timeout seconds"
            return 1
        fi

        log_info "Successfully removed $dir_name"
    fi
    return 0
}


clean_project() {
    log_info "Cleaning build artifacts..."


    remove_directory "node_modules" 30
    remove_directory "lib" 10
    remove_directory "dist" 10

    sync

    log_info "Clean completed"
}
