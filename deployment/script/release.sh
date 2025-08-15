#!/bin/bash
set -e

source ./common.sh

SERVICE_NAME=""
ECR_REPOSITORY=""

# Service configurations
declare -A SERVICE_CONFIGS
SERVICE_CONFIGS["swap-oracle-service"]="double-zero-oracle-pricing-service"
SERVICE_CONFIGS["indexer-service"]="double-zero-indexer-service"

# Function to display usage
help() {
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo "Commands:"
    echo "  publish-artifacts                     publish-artifacts service(s) to ECR"
    echo "  upgrade                               install service(s)"
    echo "  publish-artifacts-and-upgrade         publish-artifacts and install service(s)"
    echo ""
    echo "Options:"
    echo "  --env ENV                   Environment"
    echo "  --region REGION             AWS Region"
    echo "  --release-tag TAG           Release tag"
    echo "  --ecr-repository REPO       ECR repository name (overrides default)"
    echo "  -h, --help                  Display this help message"
    echo ""
    echo "Available services:"
    echo "  - swap-oracle-service (ECR: double-zero-oracle-pricing-service)"
    echo "  - indexer-service (ECR: double-zero-indexer-service)"
    echo ""
    echo "Examples:"
    echo "  $0 publish-artifacts --release-tag v2.0.0"
    echo "  $0 upgrade --env prod --release-tag v2.0.0 --service-name swap-oracle-service"
    exit 1
}

COMMAND="$1"
shift



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
        --release-tag)
            RELEASE_TAG="$2"
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

case $COMMAND in
    publish-artifacts|upgrade|publish-artifacts-and-upgrade)
        if [[ -z "$AWS_REGION" ]]; then
            print_error_and_exit "--region is required"
        fi

        if [[ -z "$RELEASE_TAG" ]]; then
            print_error_and_exit "release-tag is required"
        fi

        if [[ "$COMMAND" == "upgrade" || "$COMMAND" == "publish-artifacts-and-upgrade" ]] && [[ -z "$ENV" ]]; then
            print_error_and_exit "--env is required for $COMMAND command"
        fi

        ;;
    -h|--help)
        help
        ;;
    *)
        echo "Error: Unknown command '$COMMAND'"
        help
        ;;
esac

get_services_to_process() {
      echo "${!SERVICE_CONFIGS[@]}"
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
echo "Release Tag: $RELEASE_TAG"
echo "================================"

publish_artifacts() {
    local services=($(get_services_to_process))

    for service in "${services[@]}"; do
        local repository=$(get_ecr_repository "$service")

        echo "=== Publishing $service to ECR ==="
        echo "Service: $service"
        echo "ECR Repository: $repository"

        if [[ ! -d "../../off-chain/$service" ]]; then
            print_error_and_exit "Offchain component directory not found: $service"
        fi

        pushd "../../off-chain/$service" > /dev/null
        ./build_and_deploy.sh --region "$AWS_REGION" --repository "$repository" --tag "$RELEASE_TAG"
        popd > /dev/null

        echo "✅ Successfully published $service"
        echo ""
    done
}

upgrade() {
    local services=($(get_services_to_process))

    for service in "${services[@]}"; do
        local repository=$(get_ecr_repository "$service")

        echo "=== Deploying $service ==="
        echo "Service: $service"
        echo "ECR Repository: $repository"

        ./deploy_update.sh --env "$ENV" --region "$AWS_REGION" --release-tag "$RELEASE_TAG" --ecr-repository "$repository" --container-name "$service"

        echo "✅ Successfully deployed $service"
        echo ""
    done
}

main() {
    local services=($(get_services_to_process))

    echo "Services to process: ${services[*]}"
    echo ""

    case $COMMAND in
        publish-artifacts)
            publish_artifacts
            ;;
        upgrade)
            upgrade
            ;;
        publish-artifacts-and-upgrade)
            publish_artifacts
            upgrade
            ;;
    esac

    echo "Operation '$COMMAND' completed successfully for all specified services!"
}

main