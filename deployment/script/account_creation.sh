#!/bin/bash

source ./common.sh

set -e

# Script configuration
SCRIPT_NAME="$(basename "$0")"
VALID_COMMANDS=("create" "destroy")


help() {
    cat << EOF
Options:
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
        REGION="us-east-1"
        echo "Using default region: ${REGION}"
    fi
}

setup_aws_environment() {
    echo "Setting up AWS environment..."

    aws_account_id=$(aws sts get-caller-identity --query 'Account' --output text)
    if [[ $? -ne 0 ]]; then
        print_error_and_exit "Failed to get AWS account ID. Please check your AWS credentials."
    fi

    export account_id="${aws_account_id}"
    export region="${REGION}"

    echo "AWS Account ID: ${account_id}"
    echo "Region: ${region}"
}

prepare_terraform_backend() {
    local account_path="../account/"

    if [[ ! -d "${account_path}" ]]; then
        print_error_and_exit "Account directory ${account_path} does not exist"
    fi

    cd "${account_path}"

    echo "Cleaning previous Terraform state..."
    rm -rf ./.terraform
    rm -rf ./.terraform.lock.hcl
    rm -rf ./backend_config.tf

    echo "Generating Terraform backend configuration..."
    if [[ ! -f "./templates/backend_config.tf.template" ]]; then
        print_error_and_exit "Backend configuration template not found at ./templates/backend_config.tf.template"
    fi

    # Use account template (key = "account/terraform.tfstate")
    envsubst '$account_id' < './templates/backend_config.tf.template' > backend_config.tf

    if [[ $? -ne 0 ]]; then
        print_error_and_exit "Failed to generate backend configuration"
    fi

    echo "Backend configuration generated successfully"
}

create_account_infrastructure() {
    echo "Creating account-level infrastructure"

    echo "Initializing Terraform..."
    terraform init
    if [[ $? -ne 0 ]]; then
        print_error_and_exit "Terraform initialization failed"
    fi

    echo "Planning Terraform changes..."
    terraform plan -var="aws_region=${REGION}" -out=tfplan
    if [[ $? -ne 0 ]]; then
        print_error_and_exit "Terraform planning failed"
    fi

    if [[ $AUTO_APPROVE -eq 1 ]]; then
        echo "Applying changes with auto-approval"
        terraform apply -auto-approve tfplan
    else
        echo "Applying changes with confirmation prompt"
        terraform apply -var="aws_region=${REGION}"
    fi

    if [[ $? -ne 0 ]]; then
        print_error_and_exit "Terraform apply failed"
    fi

    echo "Account-level infrastructure created successfully"
}

destroy_account_infrastructure() {
    echo "Destroying account-level infrastructure"

    echo "Initializing Terraform..."
    terraform init
    if [[ $? -ne 0 ]]; then
        print_error_and_exit "Terraform initialization failed"
    fi

    if [[ $AUTO_APPROVE -eq 1 ]]; then
        terraform destroy -var="aws_region=${REGION}" -auto-approve
    else
        terraform destroy -var="aws_region=${REGION}"
    fi

    if [[ $? -ne 0 ]]; then
        print_error_and_exit "Terraform destroy failed"
    fi

    echo "Account-level infrastructure destroyed successfully"
}

main() {
    if [[ $# -lt 1 ]]; then
        usage
        exit 1
    fi

    AUTO_APPROVE=0
    REGION=""
    while [[ $# -gt 0 ]]; do
        case $1 in
            --auto-approve)
                AUTO_APPROVE=1
                export AUTO_APPROVE
                shift
                ;;
            --action)
                COMMAND="$2"
                shift 2
                ;;
            --region)
                REGION="$2"
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
            create_account_infrastructure
            ;;
        destroy)
            destroy_account_infrastructure
            ;;
        *)
            print_error_and_exit "Invalid command: $COMMAND"
            ;;
    esac

    echo "Script execution completed successfully"
}

trap 'print_error_and_exit "Script interrupted"' INT TERM

main "$@"
