#!/bin/bash

set -euo pipefail

# Source utility functions
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../../build_utils.sh"

SERVICE_NAME="indexer"
AWS_REGION="${AWS_REGION:-us-east-1}"
ECR_REPOSITORY_NAME="${ECR_REPOSITORY_NAME:-${SERVICE_NAME}}"
BUILD_TAG="${BUILD_TAG:-latest}"

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