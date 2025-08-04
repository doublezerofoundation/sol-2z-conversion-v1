#!/bin/bash
set -e


ENV="dev3"
AWS_REGION="us-east-1"
IMAGE_TAG="$ENV-v1.0.0"
SERVICE_NAME="swap-oracle-service"
ECR_REGISTRY=""
ECR_REPOSITORY="double-zero-oracle-pricing-service"


# Function to display usage
help() {
    echo "Usage: $0 [OPTIONS]"
    echo "Options:"
    echo "  --env ENV                Environment (default: dev3)"
    echo "  --region REGION          AWS Region (default: us-east-1)"
    echo "  --image-tag TAG          Docker image tag (default: v1.0.0)"
    echo "  --container-name NAME    Container name (default: swap-oracle-service)"
    echo "  --ecr-registry REGISTRY  ECR registry URL (optional, will be auto-detected)"
    echo "  --ecr-repository REPO    ECR repository name (default: double-zero-oracle-pricing-service)"
    echo "  -h, --help              Display this help message"
    echo ""
    echo "Example:"
    echo "  $0 --env prod --region us-west-2 --image-tag prod-v2.0.0"
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

IMAGE_TAG=$ENV-$IMAGE_TAG
echo "=== Deployment Configuration ==="
echo "Environment: $ENV"
echo "AWS Region: $AWS_REGION"
echo "Image Tag: $IMAGE_TAG"
echo "Service Name: $SERVICE_NAME"
echo "ECR Repository: $ECR_REPOSITORY"
echo "ECR Registry: ${ECR_REGISTRY:-'(will be auto-detected)'}"
echo "================================"


publish() {
  echo "Publish the image to ECR"

  if [[ ! -d "../../off-chain/$SERVICE_NAME" ]]; then
      echo "Error: Offchain component directory not found: $SERVICE_NAME"
      exit 1
  fi
  pushd "../../off-chain/$SERVICE_NAME" > /dev/null
  ./build_and_deploy.sh --region "$AWS_REGION" --env "$ENV" --repository "$ECR_REPOSITORY" --tag "$IMAGE_TAG"
  popd > /dev/null


}

deploy() {
  ./deploy_application.sh --env $ENV --region $AWS_REGION --image-tag $IMAGE_TAG  --ecr-repository $ECR_REPOSITORY  --container-name $SERVICE_NAME
}

main() {

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

    echo "Operation '$COMMAND' completed successfully!"
}

# Run main function
main


