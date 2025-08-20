#!/bin/bash
set -e
source ./common.sh

ENV_TERRAFORM_DIR="../environments"
successful_instances=()
failed_instances=()

# ENV="dev1"
# AWS_REGION="us-east-1"
# RELEASE_TAG="dev1-v1.0.6"
# CONTAINER_NAME="indexer-service"
# ECR_REGISTRY=""
# ECR_REPOSITORY="double-zero-indexer-service"
# successful_instances=()
# failed_instances=()

# Parse arguments
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
        --container-name)
            CONTAINER_NAME="$2"
            shift 2
            ;;
        --ecr-registry)
            ECR_REGISTRY="$2"
            shift 2
            ;;
        --ecr-repository)
            ECR_REPOSITORY="$2"
            shift 2
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  --env ENV                 Environment"
            echo "  --region REGION           AWS Region (default: us-east-1)"
            echo "  --image-tag TAG           Docker image tag"
            echo "  --container-name NAME     Container name"
            echo "  --ecr-repository REPO     ECR repository name"
            echo "  -h, --help                Display this help message"
            exit 1
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

echo "=== Deployment Configuration ==="
echo "Environment: $ENV"
echo "AWS Region: $AWS_REGION"
echo "Image Tag: $RELEASE_TAG"
echo "Container Name: $CONTAINER_NAME"
echo "ECR Repository: $ECR_REPOSITORY"
echo "ECR Registry: ${ECR_REGISTRY:-'(will be auto-detected)'}"
echo "================================"

get_ecr_config(){
  echo "Retrieve ECR config"
  local account_id=$(aws sts get-caller-identity --query Account --output text)
  ECR_REGISTRY="${account_id}.dkr.ecr.${AWS_REGION}.amazonaws.com"
  echo "Ecr registry: ${ECR_REGISTRY}"
}

find_ec2_instance(){
  INSTANCE_IDS=$(
     aws ec2 describe-instances --region "$AWS_REGION" \
     --filters "Name=tag:Environment,Values=$ENV" "Name=tag:Service,Values=double-zero-$CONTAINER_NAME" \
    --query 'Reservations[].Instances[].InstanceId' \
    --output text)
  echo "instance $INSTANCE_IDS"
}

verify_ecr_image(){
  echo "verify the ecr image $ECR_REPOSITORY  $RELEASE_TAG"
  if aws ecr describe-images --region "$AWS_REGION" --repository-name "$ECR_REPOSITORY" --image-ids imageTag="$RELEASE_TAG" &> /dev/null; then
    echo "ECR image found"
  else
    echo "ECR image not found"
  fi
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

update_pricing_service_image_tag() {
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
        wait_for_pricing_service_template_ready

    else
        echo "Checking terraform state for any partial changes..."
        terraform show -json > /dev/null 2>&1 || true
        print_error_and_exit "Terraform apply failed with exit code: $apply_exit_code"
    fi

    rm -f tfplan

    cd - > /dev/null
}

wait_for_pricing_service_template_ready() {
    echo "Verifying infrastructure components are ready..."
    local max_wait_time=600  # 10 minutes
    local check_interval=30  # 30 seconds
    local elapsed_time=0

    while [[ $elapsed_time -lt $max_wait_time ]]; do
        echo "Checking infrastructure status... (${elapsed_time}s elapsed)"

        # Check if launch template was updated successfully
        if check_pricing_service_launch_template_ready; then
            echo "✅ Launch template is ready with new image tag"
            break
        fi

        echo "Infrastructure not ready yet, waiting ${check_interval} seconds..."
        sleep $check_interval
        elapsed_time=$((elapsed_time + check_interval))
    done

    if [[ $elapsed_time -ge $max_wait_time ]]; then
        echo "Infrastructure readiness check timed out after ${max_wait_time} seconds"
        echo "The deployment may still be in progress. Check AWS console for current status."
        return 1
    fi

    echo "✅ Infrastructure is ready for deployment"
    return 0
}

check_pricing_service_launch_template_ready() {
    local launch_template_name_pattern="doublezero-${ENV}-swap-oracle-lt"
    local template_info
    template_info=$(aws ec2 describe-launch-templates \
        --region "$AWS_REGION" \
        --filters "Name=launch-template-name,Values=${launch_template_name_pattern}*" \
        --query 'LaunchTemplates[0].{Name:LaunchTemplateName,Id:LaunchTemplateId,LatestVersion:LatestVersionNumber}' \
        --output json 2>/dev/null)

    if [[ -z "$template_info" || "$template_info" == "null" ]]; then
        echo "❌ Could not retrieve launch template information"
        return 1
    fi

    local template_id=$(echo "$template_info" | jq -r '.Id')
    local template_name=$(echo "$template_info" | jq -r '.Name')
    local latest_version=$(echo "$template_info" | jq -r '.LatestVersion')

    if [[ -z "$template_id" || "$template_id" == "null" || -z "$latest_version" || "$latest_version" == "null" ]]; then
        echo "❌ Could not retrieve launch template details"
        return 1
    fi

    echo "Found launch template: $template_name (ID: $template_id, Version: $latest_version)"
    local user_data
    user_data=$(aws ec2 describe-launch-template-versions \
        --region "$AWS_REGION" \
        --launch-template-id "$template_id" \
        --versions "$latest_version" \
        --query 'LaunchTemplateVersions[0].LaunchTemplateData.UserData' \
        --output text 2>/dev/null)

    if [[ -n "$user_data" && "$user_data" != "None" ]]; then
        local decoded_user_data
        decoded_user_data=$(echo "$user_data" | base64 -d 2>/dev/null)

        if echo "$decoded_user_data" | grep -q "IMAGE_TAG=\"${RELEASE_TAG}\""; then
            echo "✅ Launch template already has the correct image tag: $RELEASE_TAG"
            echo "Setting version $latest_version as default..."
            aws ec2 modify-launch-template \
                --region "$AWS_REGION" \
                --launch-template-id "$template_id" \
                --default-version "$latest_version"

            if [[ $? -eq 0 ]]; then
                echo "✅ Set launch template version $latest_version as default"
                return 0
            else
                echo "❌ Failed to set launch template default version"
                return 1
            fi
        else
            echo "⚠️ Launch template exists but doesn't contain expected image tag: $RELEASE_TAG"
            if echo "$decoded_user_data" | grep -q "RELEASE_TAG="; then
                local current_tag=$(echo "$decoded_user_data" | grep -o 'RELEASE_TAG="[^"]*"' | head -1)
                echo "Current image tag in launch template: $current_tag"
            fi
        fi
    else
        echo "⚠️ Launch template exists but has no user data or user data could not be retrieved"
    fi

    return 1
}

trigger_pricing_service_instance_refresh() {
    echo "Triggering Auto Scaling Group instance refresh..."

    local asg_name="doublezero-${ENV}-swap-oracle-asg"
    echo "ASG Name: $asg_name"

    # Verify ASG exists
    if ! aws autoscaling describe-auto-scaling-groups \
        --region "$AWS_REGION" \
        --auto-scaling-group-names "$asg_name" \
        --query 'AutoScalingGroups[0].AutoScalingGroupName' \
        --output text &> /dev/null; then
        echo "❌ Auto Scaling Group not found: $asg_name"
        echo "Available ASGs:"
        aws autoscaling describe-auto-scaling-groups \
            --region "$AWS_REGION" \
            --query 'AutoScalingGroups[].AutoScalingGroupName' \
            --output table
        exit 1
    fi

    local refresh_id
    refresh_id=$(aws autoscaling start-instance-refresh \
        --region "$AWS_REGION" \
        --auto-scaling-group-name "$asg_name" \
        --preferences MinHealthyPercentage=90,InstanceWarmup=300 \
        --query 'InstanceRefreshId' \
        --output text)

    if [[ -n "$refresh_id" && "$refresh_id" != "None" ]]; then
        echo "✅ Instance refresh initiated with ID: $refresh_id"
        echo "New instances will use image tag: $RELEASE_TAG"
        echo ""
        echo "Monitor progress with:"
        echo "aws autoscaling describe-instance-refreshes \\"
        echo "  --region $AWS_REGION \\"
        echo "  --auto-scaling-group-name $asg_name"
        echo ""
        echo "This process will:"
        echo "1. Update the launch template with new image tag"
        echo "2. Gradually replace instances (maintaining 90% healthy)"
        echo "3. New instances will automatically pull and run the new image"
    else
        echo "❌ Failed to initiate instance refresh"
        exit 1
    fi
}

create_deployment_script() {
  local script_path="/tmp/container_deploy.sh"

  # Header: expand here so values are baked into the script safely
  cat > "$script_path" <<EOF
#!/bin/bash
set -e

ENVIRONMENT=${ENV@Q}
AWS_REGION=${AWS_REGION@Q}
ECR_REGISTRY=${ECR_REGISTRY@Q}
ECR_REPOSITORY=${ECR_REPOSITORY@Q}
IMAGE_TAG=${RELEASE_TAG@Q}
CONTAINER_NAME=${CONTAINER_NAME@Q}
REDIS_PORT="${REDIS_PORT}"
REDIS_ENDPOINT="${REDIS_ENDPOINT}"
FULL_IMAGE_URI="\${ECR_REGISTRY}/\${ECR_REPOSITORY}:\${IMAGE_TAG}"
INSTANCE_ID=\$(curl -s http://169.254.169.254/latest/meta-data/instance-id)
EOF

  # Body: no expansion while writing (avoid escaping hell)
  cat >> "$script_path" <<'EOF'
echo "Starting container redeployment on $(hostname)"
echo "Image: $FULL_IMAGE_URI"

aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REGISTRY
docker pull $FULL_IMAGE_URI

echo "Stopping existing container..."
if docker ps -q -f name=$CONTAINER_NAME | grep -q .; then
  docker stop $CONTAINER_NAME || true
fi
if docker ps -aq -f name=$CONTAINER_NAME | grep -q .; then
  docker rm $CONTAINER_NAME || true
fi

echo "Starting new container..."
docker run -d \
  --name $CONTAINER_NAME \
  --restart unless-stopped \
  -p 8080:8080 \
  --log-driver=awslogs \
  --log-opt awslogs-group="/ec2/$ENVIRONMENT/$CONTAINER_NAME" \
  --log-opt awslogs-region=$AWS_REGION  \
  --log-opt awslogs-stream=$INSTANCE_ID \
  --log-opt awslogs-create-group=true \
  -e ENVIRONMENT=$ENVIRONMENT -e AWS_REGION=$AWS_REGION \
  -v /opt/app/logs:/app/logs \
  $FULL_IMAGE_URI

sleep 5
if docker ps | grep -q $CONTAINER_NAME; then
  echo "Container $CONTAINER_NAME is running successfully"
EOF
 if [[ "$CONTAINER_NAME" == "swap-oracle-service" ]]; then
    cat >> "$script_path" <<'EOF'
  echo "Performing health check..."
  if curl -f http://localhost:8080/health &> /dev/null; then
    echo "Health check passed"
  else
    echo "Health check failed, but container is running"
  fi
EOF
fi
cat >> "$script_path" <<'EOF'
else
  echo "Container failed to start"
  docker logs $CONTAINER_NAME || true
  exit 1
fi

echo "Deployment completed successfully on $(hostname)"
EOF

  chmod +x "$script_path"
  echo "$script_path"
}

deploy_application() {
  echo "Creating deployment script..."
  local script_path
  script_path=$(create_deployment_script)

  # base64-encode the script so we can ship it safely via SSM
  local script_b64
  if command -v base64 >/dev/null 2>&1; then
    # GNU coreutils (Linux). -w0 disables wrapping; if not supported, try -b 0 or fallback.
    script_b64=$(base64 -w0 "$script_path" 2>/dev/null || base64 "$script_path")
  else
    echo "❌ 'base64' not found locally. Install coreutils/base64."
    exit 1
  fi

  echo "Starting deployment to instances..."
  for instance_id in $INSTANCE_IDS; do
    echo "Deploying to instance: $instance_id"

    # Build the commands array for SSM (decode -> chmod -> run)
    local commands_json
    commands_json=$(printf '[%s,%s,%s]' \
      "\"echo '$script_b64' | base64 -d > /tmp/container_deploy.sh\"" \
      "\"chmod +x /tmp/container_deploy.sh\"" \
      "\"/tmp/container_deploy.sh\"")

    local command_id
    command_id=$(aws ssm send-command \
      --region "$AWS_REGION" \
      --document-name "AWS-RunShellScript" \
      --targets "Key=InstanceIds,Values=$instance_id" \
      --parameters "commands=$commands_json" \
      --comment "Deploy container on $instance_id with tag $RELEASE_TAG" \
      --query 'Command.CommandId' \
      --output text)

    if [[ -n "$command_id" && "$command_id" != "None" ]]; then
      echo "Command sent, waiting for completion..."
      monitor_deployment "$command_id" "$instance_id"
    else
      echo "Failed to send deployment command to $instance_id"
      failed_instances+=("$instance_id")
    fi
    echo "----------------------------------------"
  done

  rm -f "$script_path"
  print_deployment_summary
}

monitor_deployment() {
  local command_id=$1
  local instance_id=$2
  local status=""
  local attempts=0
  local max_attempts=30
  while [[ "$status" != "Success" && "$status" != "Failed" && $attempts -lt $max_attempts ]]; do
    sleep 10
    status=$(aws ssm get-command-invocation \
      --region "$AWS_REGION" \
      --command-id "$command_id" \
      --instance-id "$instance_id" \
      --query 'Status' \
      --output text 2>/dev/null || echo "InProgress")
    echo "Status for $instance_id: $status (attempt $((attempts+1))/$max_attempts)"
    attempts=$((attempts + 1))
  done
  if [[ "$status" == "Success" ]]; then
    echo "Deployment successful on $instance_id"
    successful_instances+=("$instance_id")
    local output=$(aws ssm get-command-invocation \
      --region "$AWS_REGION" \
      --command-id "$command_id" \
      --instance-id "$instance_id" \
      --query 'StandardOutputContent' \
      --output text 2>/dev/null || echo "No output")
    echo "Output (last 5 lines):"
    echo "$output" | tail -5
  else
    echo "❌ Deployment failed on $instance_id"
    failed_instances+=("$instance_id")
    local error_output=$(aws ssm get-command-invocation \
      --region "$AWS_REGION" \
      --command-id "$command_id" \
      --instance-id "$instance_id" \
      --query 'StandardErrorContent' \
      --output text 2>/dev/null || echo "No error output")
    echo "Error output:"
    echo "$error_output" | tail -10
  fi
}

print_deployment_summary() {
  echo ""
  echo "================== DEPLOYMENT SUMMARY =================="
  echo "✅ Successful: ${#successful_instances[@]}"
  echo "❌ Failed: ${#failed_instances[@]}"
  if [[ ${#failed_instances[@]} -gt 0 ]]; then
    echo "Failed instances: ${failed_instances[*]}"
    exit 1
  fi
  echo "All deployments completed successfully!"
}

get_ecr_config
verify_ecr_image
setup_aws_environment
if [[ "$CONTAINER_NAME" == "swap-oracle-service" ]]; then
  update_pricing_service_image_tag
  trigger_pricing_service_instance_refresh

else
  find_ec2_instance
  deploy_application
  print_deployment_summary

fi
