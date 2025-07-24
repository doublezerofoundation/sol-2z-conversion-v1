#!/bin/bash

set -e


log_info() {
    echo -e "${BLUE}  $1${NC}"
}
log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_step() {
    echo -e "${YELLOW} $1${NC}"
}


# Default values
IMAGE_NAME="oracle-pricing-service"
TAG="latest"

cd "$(dirname "$0")"
repo=$(pwd | rev | cut -d '/' -f 1 | rev)

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'


echo "================================================================================================"
echo "         					BUILD_AND_DEPLOY ($repo) "
echo "================================================================================================"
echo " input $@"

while [[ $# -gt 0 ]]; do
    case $1 in
        -t|--tag)
            TAG="$2"
            shift 2
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
    esac
done


show_help() {
  echo "Usage: $0 [OPTIONS]"
  echo ""
  echo "Build and deploy script for $repo project"
  echo ""
  echo "OPTIONS:"
  echo "  -t, --tag TAG        Set Docker image tag (default: latest)"
  echo "  -h, --help          Show this help message"
  echo ""
  echo "DESCRIPTION:"
  echo "  This script performs the following operations:"
  echo "  1. Clean project artifacts (node_modules, dist)"
  echo "  2. Install npm dependencies"
  echo "  3. Build TypeScript project"
  echo "  4. Build Docker image"
  echo ""
  echo "EXAMPLES:"
  echo "  $0                           # Build with default settings"
  echo "  $0 --tag v1.0.0             # Build with specific tag"
  echo ""
}

clean_project() {
    log_step "Cleaning build artifacts..."

    if [ -d "node_modules" ]; then
        rm -rf node_modules
        log_info "Removed node_modules"
    fi

    if [ -d "lib" ]; then
        rm -rf lib
        log_info "Removed dist"
    fi

    log_success "Clean completed"
}

npm_install() {
    log_step "Installing dependencies..."
    if [ -f "package-lock.json" ]; then
        npm ci
    else
        npm install
    fi
    log_success "Dependencies installed successfully"
}

build_project() {
    log_step "Building TypeScript project..."
    npm run build
    log_success "Project built successfully"
}
build_docker() {
    FULL_IMAGE_NAME="$IMAGE_NAME:$TAG"
    log_step "Building Docker image: $FULL_IMAGE_NAME"

    # Build the image with proper context
    docker buildx build -t "$FULL_IMAGE_NAME" .


    # Check if build was successful
    if [ $? -eq 0 ]; then
        log_success "Successfully built Docker image: $FULL_IMAGE_NAME"
        # Show image info
        echo ""
        log_info "Image information:"
        docker images | head -1
        docker images | grep "$IMAGE_NAME" | head -5

    else
        log_error "Failed to build Docker image"
        exit 1
    fi
}
run_docker() {
    local CONTAINER_NAME="oracle-pricing-service-container"
    local HOST_PORT=8080
    local CONTAINER_PORT=8080
    local FULL_IMAGE_NAME="$IMAGE_NAME:$TAG"

    log_step "Running Docker container: $CONTAINER_NAME"

    # Stop and remove existing container if it exists
    if docker ps -a --format 'table {{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        log_info "Stopping and removing existing container: $CONTAINER_NAME"
        docker stop "$CONTAINER_NAME" >/dev/null 2>&1 || true
        docker rm "$CONTAINER_NAME" >/dev/null 2>&1 || true
    fi

    # Run the container
    docker run -d \
        --name "$CONTAINER_NAME" \
        -p "${HOST_PORT}:${CONTAINER_PORT}" \
        --restart unless-stopped \
        "$FULL_IMAGE_NAME"

    # Check if container started successfully
    if [ $? -eq 0 ]; then
        log_success "Container started successfully: $CONTAINER_NAME"
        log_info "Application is accessible at: http://localhost:$HOST_PORT"

        # Show container status
        echo ""
        log_info "Container information:"
        docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | head -1
        docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep "$CONTAINER_NAME"
    else
        log_error "Failed to start container"
        exit 1
    fi
}


#clean_project
#npm_install
build_project
build_docker
run_docker


