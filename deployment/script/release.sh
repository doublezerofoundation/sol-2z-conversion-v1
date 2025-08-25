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

setup_aws_environment() {
    echo "Setting up AWS environment..."

    aws_account_id=$(aws sts get-caller-identity --query 'Account' --output text)
    if [[ $? -ne 0 ]]; then
        print_error_and_exit "Failed to get AWS account ID. Please check your AWS credentials."
    fi

    export env_alias="${ENV}"
    export region="${AWS_REGION}"
    export account_id="${aws_account_id}"
    export release_tag="${RELEASE_TAG}"

    echo "AWS Account ID: ${account_id}"
    echo "Environment: ${env_alias}"
    echo "Region: ${region}"
    echo "Release Tag: ${release_tag}"
}

prepare_terraform_backend() {
    local env_path="../environments/"

    if [[ ! -d "${env_path}" ]]; then
        print_error_and_exit "Environment directory ${env_path} does not exist"
    fi

    cd "${env_path}"

    echo "Cleaning previous Terraform state..."
    rm -rf ./.terraform
    rm -rf ./.terraform.lock.hcl
    rm -rf ./backend_config.tf

    echo "Generating Terraform backend configuration..."
    if [[ ! -f "./templates/backend_config.tf.template" ]]; then
        print_error_and_exit "Backend configuration template not found at ../templates/backend_config.tf.template"
    fi

    envsubst '$region $env_alias $account_id $release_tag' < './templates/backend_config.tf.template' > backend_config.tf

    if [[ $? -ne 0 ]]; then
        print_error_and_exit "Failed to generate backend configuration"
    fi

    echo "Backend configuration generated successfully"
}

update_release_tag() {
    ENV_TERRAFORM_DIR="../environments"
    echo "=== Deploying Infrastructure with Image Tag: $RELEASE_TAG ==="
    local plan_timeout_duration=300
    local apply_timeout_duration=1800

    prepare_terraform_backend

    echo "Initializing Terraform..."
    terraform init
    if [[ $? -ne 0 ]]; then
        print_error_and_exit "Terraform initialization failed"
    fi


    echo "Running terraform plan with dynamic image tag..."
    timeout $plan_timeout_duration terraform plan \
        -var-file='./terraform.tfvars' \
        -var="release_tag=$release_tag" \
        -var="environment=$env_alias" \
        -var="aws_region=$region" \
        -var="accountId=${account_id}" \
        -out=tfplan

    local plan_exit_code=$?

    if [[ $plan_exit_code -eq 124 ]]; then
        print_error_and_exit "Terraform plan timed out after $plan_timeout_duration seconds"
    elif [[ $plan_exit_code -ne 0 ]]; then
        print_error_and_exit "Terraform plan failed with exit code: $plan_exit_code"
    fi

    echo "✅ Terraform plan successful"
    echo ""
    echo "Plan saved to tfplan. Review the changes above."
    echo -n "Do you want to apply these changes? (yes/no): "
    read -r response

    if [[ "$response" != "yes" ]]; then
        echo "❌ Apply cancelled by user"
        rm -f tfplan
        exit 1
    fi

    echo "Applying terraform changes..."
    timeout $apply_timeout_duration terraform apply tfplan

    local apply_exit_code=$?


    if [[ $apply_exit_code -eq 124 ]]; then
        echo "The apply process may still be running in the background."
        echo "Check the terraform state and AWS console to verify the deployment status."
        print_error_and_exit "Terraform apply timed out after $apply_timeout_duration seconds"
    elif [[ $apply_exit_code -eq 0 ]]; then
        echo "✅ Infrastructure deployment completed successfully"
        echo "New image tag deployed: $RELEASE_TAG"
        echo "Waiting for infrastructure stabilization..."

    else
        echo "Checking terraform state for any partial changes..."
        terraform show -json > /dev/null 2>&1 || true
        print_error_and_exit "Terraform apply failed with exit code: $apply_exit_code"
    fi

    rm -f tfplan

    cd - > /dev/null
}


upgrade() {
  echo "=============== RELEASE UPGRADE TRIGGERED ${RELEASE_TAG} ================="
  setup_aws_environment
  update_release_tag
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