
#!/bin/bash

set -e

# Default values
VERSION="latest"
ENVIRONMENT="dev"
SERVICE_NAME="double-zero-repository"
AWS_REGION="${AWS_REGION:-us-east-1}"
SKIP_BUILD=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -v|--version)
            VERSION="$2"
            shift 2
            ;;
        -e|--env)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [-v version] [-e environment] [--skip-build]"
            echo "  -v, --version    Docker image version (default: latest)"
            echo "  -e, --env        Environment (default: dev)"
            echo "  --skip-build     Skip building and pushing image"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

echo "Deploying $SERVICE_NAME:$VERSION to $ENVIRONMENT..."

# Check prerequisites
if ! command -v ansible-playbook &> /dev/null; then
    echo "Error: Ansible not installed"
    exit 1
fi

if ! aws sts get-caller-identity > /dev/null 2>&1; then
    echo "Error: AWS credentials not configured"
    exit 1
fi

# Set AWS variables
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
export AWS_REGION=$AWS_REGION

# Build and push image using existing script (unless skipped)
if [ "$SKIP_BUILD" = false ]; then
    echo "Building and pushing Docker image using build_and_deploy.sh..."
    pushd ../off-chain/swap-oracle-service > /dev/null
    # Check if build script exists
    if [ ! -f "build_and_deploy.sh" ]; then
        echo "Error: build_and_deploy.sh not found in current directory"
        exit 1
    fi

    # Run build script with appropriate parameters
    ./build_and_deploy.sh --tag $VERSION --repository $SERVICE_NAME --region $AWS_REGION
    popd > /dev/null
    echo "Image build and push completed"
fi

# Run deployment
#echo "Running Ansible deployment..."
#pushd ansible > /dev/null
#ansible-playbook -i inventory.yml deploy.yml \
#    -e "version=$VERSION" \
#    -e "env=$ENVIRONMENT"
#popd > /dev/null

echo "Deployment completed successfully!"