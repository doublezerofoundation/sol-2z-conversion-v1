#!/bin/bash

set -euo pipefail

# Source utility functions
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../../build_utils.sh"

SERVICE_NAME="double-zero-indexer-service"
AWS_REGION="${AWS_REGION:-us-east-1}"
ECR_REPOSITORY_NAME="${ECR_REPOSITORY_NAME:-${SERVICE_NAME}}"
BUILD_TAG="${BUILD_TAG:-latest}"
ENV="${ENV:-dev1}"
S3_BUCKET_NAME="${S3_BUCKET_NAME:-doublezero-${ENV}-lambda-deployments}"
S3_OBJECT_KEY="${S3_OBJECT_KEY:-metrics-api.zip}"
BUILD_DIR="$SCRIPT_DIR/lambda-build"
ZIP_FILE="$BUILD_DIR/$S3_OBJECT_KEY"

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

    # Build and deploy metrics API Lambda
    build_metrics_api
    package_lambda
    upload_to_s3

    build_image $IMAGE_TAG

    push_image $IMAGE_TAG

    log_info "Build and deploy completed successfully!"
    log_info "Docker Image URI: $IMAGE_TAG"
    log_info "Lambda S3 Location: s3://$S3_BUCKET_NAME/$S3_OBJECT_KEY"
    log_info "Lambda Build Tag: $BUILD_TAG"
}

build_metrics_api() {
    log_info "Building metrics API Lambda function..."
    
    # Clean and create Lambda build directory
    rm -rf "$BUILD_DIR"
    mkdir -p "$BUILD_DIR"
    
    # Copy the compiled metrics-api handler from correct TypeScript output location
    if [ -d "$SCRIPT_DIR/dist/src/metrics-api" ]; then
        # Copy compiled TypeScript files to Lambda build directory
        cp -r "$SCRIPT_DIR/dist/src/metrics-api" "$BUILD_DIR/"
        log_info "Copied compiled metrics-api from $SCRIPT_DIR/dist/src/metrics-api"
    else
        log_error "Compiled metrics-api directory not found at $SCRIPT_DIR/dist/src/metrics-api"
        log_error "Please ensure TypeScript compilation succeeded."
        log_error "Expected structure: $SCRIPT_DIR/dist/src/metrics-api/"
        exit 1
    fi

    # Copy node_modules (production dependencies only)
    if [ -d "$SCRIPT_DIR/node_modules" ]; then
        log_info "Installing production dependencies in Lambda build directory..."
        
        # Copy package.json to identify dependencies
        cp "$SCRIPT_DIR/package.json" "$BUILD_DIR/"
        
        # Install only production dependencies in the build directory
        cd "$BUILD_DIR"
        npm install --omit=dev
        cd - > /dev/null
        
        # Remove package files to reduce size
        rm -f "$BUILD_DIR/package.json" "$BUILD_DIR/package-lock.json"
        
        log_info "Production dependencies installed"
    else
        log_warn "node_modules directory not found, Lambda may be missing dependencies"
    fi
    
    log_info "Metrics API Lambda build completed"
    log_info "Build directory contents:"
    ls -la "$BUILD_DIR"
}

package_lambda() {
    log_info "Packaging Lambda function..."
    
    # Show summary of what we're about to package
    log_info "Lambda build directory summary:"
    log_info "- Handler: $(ls -la "$BUILD_DIR/metrics-api/handler.js" 2>/dev/null && echo "Found" || echo "Missing")"
    log_info "- Dependencies: $(ls -d "$BUILD_DIR/node_modules" 2>/dev/null && echo "$(ls "$BUILD_DIR/node_modules" | wc -l) packages" || echo "Missing")"
    
    cd "$BUILD_DIR"
    
    # Create ZIP file with all contents (quietly to avoid verbose output)
    log_info "Creating ZIP package..."
    zip -r -q "$(basename "$S3_OBJECT_KEY")" . -x "*.DS_Store" "*.git*" "*.zip"
    
    cd - > /dev/null
    
    local zip_size=$(du -h "$ZIP_FILE" | cut -f1)
    log_info "Lambda package created: $ZIP_FILE ($zip_size)"
    
    # Verify ZIP was created successfully
    if [ -f "$ZIP_FILE" ]; then
        log_info "ZIP verification: $(unzip -l "$ZIP_FILE" | tail -1)"
    else
        log_error "Failed to create ZIP file"
        exit 1
    fi
}

upload_to_s3() {
    log_info "Uploading Lambda package to S3..."
    
    # Generate version information
    local git_commit=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
    local git_branch=$(git branch --show-current 2>/dev/null || echo "unknown") 
    local build_timestamp=$(date -u +%Y%m%d-%H%M%S)
    local version_tag="${BUILD_TAG}-${build_timestamp}-${git_commit}"
    
    log_info "Build information:"
    log_info "  - Build Tag: $BUILD_TAG"
    log_info "  - Git Commit: $git_commit"
    log_info "  - Git Branch: $git_branch"
    log_info "  - Version Tag: $version_tag"
    log_info "  - S3 Object Key: $S3_OBJECT_KEY"
    
    # Check if bucket exists
    if ! aws s3api head-bucket --bucket "$S3_BUCKET_NAME" --region "$AWS_REGION" 2>/dev/null; then
        log_error "S3 bucket '$S3_BUCKET_NAME' does not exist or is not accessible."
        log_error "Please ensure the bucket exists and you have proper permissions."
        exit 1
    fi
    
    # Upload with comprehensive metadata
    aws s3 cp "$ZIP_FILE" "s3://$S3_BUCKET_NAME/$S3_OBJECT_KEY" \
        --region "$AWS_REGION" \
        --metadata "service=metrics-api,environment=$ENV,version-tag=$version_tag,build-date=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    
    # Get the version ID of the uploaded object
    local s3_version_id
    s3_version_id=$(aws s3api head-object \
        --bucket "$S3_BUCKET_NAME" \
        --key "$S3_OBJECT_KEY" \
        --region "$AWS_REGION" \
        --query 'VersionId' \
        --output text)
    
    log_info "Lambda upload completed successfully!"
    log_info "S3 Version ID: $s3_version_id"
    log_info "Custom Version Tag: $version_tag"
    log_info "S3 Location: s3://$S3_BUCKET_NAME/$S3_OBJECT_KEY"
    
    # Enhanced tagging with version information
    aws s3api put-object-tagging \
        --bucket "$S3_BUCKET_NAME" \
        --key "$S3_OBJECT_KEY" \
        --version-id "$s3_version_id" \
        --region "$AWS_REGION" \
        --tagging "TagSet=[
            {Key=Service,Value=metrics-api},
            {Key=Environment,Value=$ENV},
            {Key=Version,Value=$version_tag}
        ]" \
        2>/dev/null || log_warn "Failed to add tags to S3 object"
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
        --bucket)
            S3_BUCKET_NAME="$2"
            shift 2
            ;;
        --key)
            S3_OBJECT_KEY="$2"
            shift 2
            ;;
        --help)
            echo "Usage: $0 [options]"
            echo "Options:"
            echo "  --region REGION         AWS region (default: us-east-1)"
            echo "  --repository NAME       ECR repository name (default: double-zero-indexer-service)"
            echo "  --tag TAG               Build tag (default: latest)"
            echo "  --bucket BUCKET         S3 bucket for Lambda deployments (default: doublezero-{env}-lambda-deployments)"
            echo "  --key KEY               S3 object key for Lambda ZIP (default: metrics-api.zip)"
            echo "  --help                  Show this help message"
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

main