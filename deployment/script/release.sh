#!/bin/bash
set -e

source ./common.sh

SERVICE_NAME=""
ECR_REPOSITORY=""

# Service configurations
declare -A SERVICE_CONFIGS
SERVICE_CONFIGS["swap-oracle-service"]="double-zero-oracle-pricing-service"
SERVICE_CONFIGS["indexer-service"]="double-zero-indexer-service"

help() {
    cat << EOF
Options:
    --release-tag     Release tag to use for service image (required)
    --env             Environment alias
    --action          publish-artifacts | upgrade | publish-and-upgrade
    --auto-approve    Skip interactive approval prompts
    --region          AWS region (default: us-east-1)
EOF
}

while [[ $# -gt 0 ]]; do
    case $1 in
        --env)
            ENV="$2"
            shift 2
            ;;
        --action)
            COMMAND="$2"
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
        -h|--help)
            help
            ;;
        *)
            echo "Unknown option: $1"
            help
            exit 1
            ;;
    esac
done

case $COMMAND in
    publish-artifacts|upgrade|publish-and-upgrade)
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
  echo "=============== RELEASE UPGRADE TRIGGERED ${RELEASE_TAG} ================="
  ./deploy_update.sh --env "$ENV" --region "$AWS_REGION" --release-tag "$RELEASE_TAG"
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
        publish-and-upgrade)
            publish_artifacts
            upgrade
            ;;
    esac

    echo "Operation '$COMMAND' completed successfully for all specified services!"
}

main