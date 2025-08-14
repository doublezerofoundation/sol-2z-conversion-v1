#!/bin/bash
set -e

ENV="dev"
AWS_REGION="us-east-1"
IMAGE_TAG="v1.0.0-night"
SERVICE_NAME=""
ECR_REGISTRY=""
ECR_REPOSITORY=""

# Service configurations
declare -A SERVICE_CONFIGS
SERVICE_CONFIGS["swap-oracle-service"]="double-zero-oracle-pricing-service"
SERVICE_CONFIGS["indexer-service"]="double-zero-indexer-service"

# Function to display usage
help() {
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo "Commands:"
    echo "  publish                     Publish service(s) to ECR"
    echo "  deploy                      Deploy service(s)"
    echo "  publish-and-deploy          Publish and deploy service(s)"
    echo ""
    echo "Options:"
    echo "  --env ENV                   Environment"
    echo "  --region REGION             AWS Region (default: us-east-1)"
    echo "  --image-tag TAG             Docker image tag"
    echo "  --service-name NAME         Service name (swap-oracle-service|indexer-service)"
    echo "                              If not specified, both services will be processed"
    echo "  --ecr-repository REPO       ECR repository name (overrides default)"
    echo "  -h, --help                  Display this help message"
    echo ""
    echo "Available services:"
    echo "  - swap-oracle-service (ECR: double-zero-oracle-pricing-service)"
    echo "  - indexer-service (ECR: double-zero-indexer-service)"
    echo ""
    echo "Examples:"
    echo "  $0 publish --image-tag v2.0.0"
    echo "  $0 deploy --env prod --image-tag v2.0.0 --service-name swap-oracle-service"
    exit 1
}

COMMAND="$1"
shift

# Validate command
case $COMMAND in
    publish|deploy|publish-and-deploy)
        ;;
    -h|--help)
        help
        ;;
    *)
        echo "Error: Unknown command '$COMMAND'"
        help
        ;;
esac

while [[ $# -gt 0 ]]; do
    case $1 in
        --env)
            ENV="$2"
            shift 2
            ;;
        --region)
            AWS_REGION="$2"
            shift 2
            ;;
        --image-tag)
            IMAGE_TAG="$2"
            shift 2
            ;;
        --service-name)
            SERVICE_NAME="$2"
            shift 2
            ;;
        --ecr-repository)
            ECR_REPOSITORY="$2"
            shift 2
            ;;
        -h|--help)
            help
            ;;
        *)
            echo "Unknown option: $1"
            help
            ;;
    esac
done

get_services_to_process() {
    if [[ -n "$SERVICE_NAME" ]]; then
        if [[ -z "${SERVICE_CONFIGS[$SERVICE_NAME]}" ]]; then
            echo "Error: Invalid service name '$SERVICE_NAME'"
            echo "Available services:" "${!SERVICE_CONFIGS[@]}"
            exit 1
        fi
        echo "$SERVICE_NAME"
    else
        echo "${!SERVICE_CONFIGS[@]}"
    fi
}

get_ecr_repository() {
    local service_name="$1"
    if [[ -n "$ECR_REPOSITORY" ]]; then
        echo "$ECR_REPOSITORY"
    else
        echo "${SERVICE_CONFIGS[$service_name]}"
    fi
}

echo "=== Deployment Configuration ==="
echo "Environment: $ENV"
echo "AWS Region: $AWS_REGION"
echo "Image Tag: $IMAGE_TAG"
echo "Service Name: ${SERVICE_NAME:-'ALL SERVICES'}"
echo "================================"

publish() {
    local services=($(get_services_to_process))

    for service in "${services[@]}"; do
        local repository=$(get_ecr_repository "$service")

        echo "=== Publishing $service to ECR ==="
        echo "Service: $service"
        echo "ECR Repository: $repository"

        if [[ ! -d "../../off-chain/$service" ]]; then
            echo "Error: Offchain component directory not found: $service"
            exit 1
        fi

        pushd "../../off-chain/$service" > /dev/null
        ./build_and_deploy.sh --region "$AWS_REGION" --repository "$repository" --tag "$IMAGE_TAG"
        popd > /dev/null

        echo "✅ Successfully published $service"
        echo ""
    done
}

deploy() {
    local services=($(get_services_to_process))

    for service in "${services[@]}"; do
        local repository=$(get_ecr_repository "$service")

        echo "=== Deploying $service ==="
        echo "Service: $service"
        echo "ECR Repository: $repository"

        ./deploy_application.sh --env $ENV --region $AWS_REGION --image-tag $IMAGE_TAG --ecr-repository $repository --container-name $service

        echo "✅ Successfully deployed $service"
        echo ""
    done
}

main() {
    local services=($(get_services_to_process))

    echo "Services to process: ${services[*]}"
    echo ""

    case $COMMAND in
        publish)
            publish
            ;;
        deploy)
            deploy
            ;;
        publish-and-deploy)
            publish
            deploy
            ;;
    esac

    echo "Operation '$COMMAND' completed successfully for all specified services!"
}

main