#!/bin/bash

source ./common.sh

set -e

# Script configuration
SCRIPT_NAME="$(basename "$0")"
VALID_COMMANDS=("create" "destroy")


help() {
    cat << EOF
Options:
    --release-tag     Release tag to use for service image (required)
    --env             Environment alias
    --action          create | destroy
    --auto-approve    Skip interactive approval prompts
    --region          AWS region (default: us-east-1)

EOF
}

validate_arguments() {
    if [[ ! " ${VALID_COMMANDS[*]} " =~ " ${COMMAND} " ]]; then
        print_error_and_exit "Invalid command: ${COMMAND}. Valid commands: ${VALID_COMMANDS[*]}"
    fi

    if [[ -z "${REGION}" ]]; then
        print_error_and_exit "--region is required"
    fi

    if [[ -z "${ENVIRONMENT}" ]]; then
        print_error_and_exit "--env is required"
    fi

    if [[ -z "${RELEASE_TAG}" ]]; then
        print_error_and_exit "--release-tag is required"
    fi


    if [[ ! "${RELEASE_TAG}" =~ ^v[0-9]+\.[0-9]+\.[0-9]+.*$ ]]; then
        print_warning "Release tag '${RELEASE_TAG}' doesn't follow semantic versioning format (vX.Y.Z)"
    fi
}

setup_aws_environment() {
    echo "Setting up AWS environment..."

    aws_account_id=$(aws sts get-caller-identity --query 'Account' --output text)
    if [[ $? -ne 0 ]]; then
        print_error_and_exit "Failed to get AWS account ID. Please check your AWS credentials."
    fi

    export env_alias="${ENVIRONMENT}"
    export region="${REGION}"
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

create_environment() {
    echo "Creating environment: ${ENVIRONMENT}"


    echo "Initializing Terraform..."
    terraform init
    if [[ $? -ne 0 ]]; then
        print_error_and_exit "Terraform initialization failed"
    fi

    echo "Planning Terraform changes..."
    terraform plan -var="release_tag=${RELEASE_TAG}" -var="environment=${ENVIRONMENT}" -var="aws_region=${REGION}" -var="accountId=${account_id}" -out=tfplan
    if [[ $? -ne 0 ]]; then
        print_error_and_exit "Terraform planning failed"
    fi

    if [[ $AUTO_APPROVE -eq 1 ]]; then
        echo "run in auto"
        terraform apply -auto-approve tfplan
    else
        echo "run with confirmation prompt"
        terraform apply -var="release_tag=${RELEASE_TAG}" -var="environment=${ENVIRONMENT}" -var="aws_region=${REGION}" -var="accountId=${account_id}"
    fi


    if [[ $? -ne 0 ]]; then
        print_error_and_exit "Terraform apply failed"
    fi

    echo "Environment ${ENVIRONMENT} created successfully with release tag ${RELEASE_TAG}"
}


destroy_environment() {
    echo "Destroying environment: ${ENVIRONMENT}"

    echo "Initializing Terraform..."
    terraform init
    if [[ $? -ne 0 ]]; then
        print_error_and_exit "Terraform initialization failed"
    fi

    if [[ $AUTO_APPROVE -eq 1 ]]; then
        terraform destroy -var="release_tag=${RELEASE_TAG}" -var="environment=${ENVIRONMENT}" -var="aws_region=${REGION}" -var="accountId=${account_id}"  -auto-approve
    else
        terraform destroy -var="release_tag=${RELEASE_TAG}" -var="environment=${ENVIRONMENT}" -var="aws_region=${REGION}" -var="accountId=${account_id}"
    fi

    if [[ $? -ne 0 ]]; then
        print_error_and_exit "Terraform destroy failed"
    fi

    echo "Environment ${ENVIRONMENT} destroyed successfully"
}

main() {
    if [[ $# -lt 3 ]]; then
        help
        exit 1
    fi

    AUTO_APPROVE=0
    while [[ $# -gt 0 ]]; do
        case $1 in
            --auto-approve)
                AUTO_APPROVE=1
                export AUTO_APPROVE
                shift
                ;;
            --region)
                REGION="$2"
                shift 2
                ;;
            --action)
                COMMAND="$2"
                shift 2
                ;;
            --env)
                ENVIRONMENT="$2"
                shift 2
                ;;
            --release-tag)
                RELEASE_TAG="$2"
                shift 2
                ;;
            -h|--help)
                help
                exit 0
                ;;
            *)
                print_error_and_exit "Unknown option: $1"
                ;;
        esac
    done
    validate_arguments
    setup_aws_environment
    prepare_terraform_backend
    case $COMMAND in
        create)
            create_environment
            ;;
        destroy)
            destroy_environment
            ;;
        *)
            print_error_and_exit "Invalid command: $COMMAND"
            ;;
    esac

    echo "Script execution completed successfully"
}

trap 'print_error_and_exit "Script interrupted"' INT TERM

main "$@"

#./env_ceration.sh create dev-test v1.0.0 --region us-east-1