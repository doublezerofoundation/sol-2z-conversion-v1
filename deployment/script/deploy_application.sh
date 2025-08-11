#!/bin/bash
set -e


ENV="dev3"
AWS_REGION="us-east-1"
IMAGE_TAG="dev3-v1.0.0"
CONTAINER_NAME="swap-oracle-service"
ECR_REGISTRY=""
ECR_REPOSITORY="double-zero-oracle-pricing-service"
REGIONAL_TERRAFORM_DIR="../regional"
successful_instances=()
failed_instances=()

# ENV="dev1"
# AWS_REGION="us-east-1"
# IMAGE_TAG="dev1-v1.0.6"
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
        --image-tag)
            IMAGE_TAG="$2"
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
echo "Image Tag: $IMAGE_TAG"
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
     --filters "Name=tag:Environment,Values=$ENV" \
    --query 'Reservations[].Instances[].InstanceId' \
    --output text)
  echo "instance $INSTANCE_IDS"
}

verify_ecr_image(){
  echo "verify the ecr image $ECR_REPOSITORY  $IMAGE_TAG"
  if aws ecr describe-images --region "$AWS_REGION" --repository-name "$ECR_REPOSITORY" --image-ids imageTag="$IMAGE_TAG" &> /dev/null; then
    echo "ECR image found"
  else
    echo "ECR image not found"
  fi
}

get_redis_url_from_terraform(){
  echo "Retrieving Redis URL from Terraform outputs..."

  if [[ ! -d "$REGIONAL_TERRAFORM_DIR" ]]; then
    echo "❌ Terraform directory not found: $REGIONAL_TERRAFORM_DIR"
    exit 1
  fi

  # Change to terraform directory and get the output
   cd "$REGIONAL_TERRAFORM_DIR" || {
      echo "❌ Failed to change to terraform directory: $REGIONAL_TERRAFORM_DIR"
      exit 1
  }
  echo "Current directory: $(pwd)"
  echo "Checking terraform state and configuration..."

  echo "Running terraform output commands..."

  # Get Redis endpoint with timeout and retry logic
  echo "Getting Redis endpoint..."
  local max_attempts=3
  local attempt=1
  local timeout_duration=60

  while [[ $attempt -le $max_attempts ]]; do
    echo "Attempt $attempt of $max_attempts..."

    # Use timeout command to limit execution time
    if REDIS_ENDPOINT=$(timeout $timeout_duration terraform output -raw redis_endpoint 2>&1); then
      REDIS_ENDPOINT_EXIT_CODE=0
      break
    else
      REDIS_ENDPOINT_EXIT_CODE=$?
      echo "❌ Attempt $attempt failed (exit code: $REDIS_ENDPOINT_EXIT_CODE)"

      if [[ $attempt -eq $max_attempts ]]; then
        echo "❌ All attempts failed to get redis_endpoint from terraform output."
        echo "Error output: $REDIS_ENDPOINT"
        echo "Make sure:"
        echo "   - Terraform is initialized (run 'terraform init')"
        echo "   - Infrastructure has been applied (run 'terraform apply')"
        echo "   - The Redis infrastructure is fully provisioned"
        echo "   - The 'redis_endpoint' output exists in your terraform configuration"
        echo "   - You have the necessary permissions to access the state"
        cd - > /dev/null
        exit 1
      fi

      echo "Waiting 10 seconds before retry..."
      sleep 10
      attempt=$((attempt + 1))
    fi
  done

  # Get Redis port with timeout and retry logic
  echo "Getting Redis port..."
  attempt=1

  while [[ $attempt -le $max_attempts ]]; do
    echo "Attempt $attempt of $max_attempts for Redis port..."

    if REDIS_PORT=$(timeout $timeout_duration terraform output -raw redis_port 2>&1); then
      REDIS_PORT_EXIT_CODE=0
      break
    else
      REDIS_PORT_EXIT_CODE=$?
      echo "❌ Attempt $attempt failed (exit code: $REDIS_PORT_EXIT_CODE)"

      if [[ $attempt -eq $max_attempts ]]; then
        echo "❌ All attempts failed to get redis_port from terraform output."
        echo "Error output: $REDIS_PORT"
        echo "Make sure:"
        echo "   - Terraform is initialized (run 'terraform init')"
        echo "   - Infrastructure has been applied (run 'terraform apply')"
        echo "   - The Redis infrastructure is fully provisioned"
        echo "   - The 'redis_port' output exists in your terraform configuration"
        echo "   - You have the necessary permissions to access the state"
        cd - > /dev/null
        exit 1
      fi

      echo "Waiting 10 seconds before retry..."
      sleep 10
      attempt=$((attempt + 1))
    fi
  done

  if [[ -z "$REDIS_ENDPOINT" || "$REDIS_ENDPOINT" == "null" ]]; then
    echo "❌ Redis endpoint output is empty or null. Check your Terraform configuration."
    exit 1
  fi

  if [[ -z "$REDIS_PORT" || "$REDIS_PORT" == "null" ]]; then
    echo "❌ Redis port output is empty or null. Check your Terraform configuration."
    exit 1
  fi

  echo "✅ Successfully retrieved Redis configuration:"
  echo "REDIS_ENDPOINT: $REDIS_ENDPOINT"
  echo "REDIS_PORT: $REDIS_PORT"
  cd - > /dev/null
}

create_updated_pricing_service_user_data() {
  local user_data_path="/tmp/updated_user_data.sh"

  # Remove any existing file first
  rm -f "$user_data_path"

  cat > "$user_data_path" <<EOF
#!/bin/bash
set -e

# Variables
ENVIRONMENT="$ENV"
AWS_REGION="$AWS_REGION"
ECR_REGISTRY="$ECR_REGISTRY"
ECR_REPOSITORY="$ECR_REPOSITORY"
IMAGE_TAG="$IMAGE_TAG"
CONTAINER_NAME="$CONTAINER_NAME"
CONTAINER_PORT="8080"
REDIS_ENDPOINT="$REDIS_ENDPOINT"
REDIS_PORT="$REDIS_PORT"

# Derived variables
FULL_IMAGE_URI="\$ECR_REGISTRY/\$ECR_REPOSITORY:\$IMAGE_TAG"
INSTANCE_ID=\$(curl -s http://169.254.169.254/latest/meta-data/instance-id)

# Logging function
log() {
    echo "[\$(date '+%Y-%m-%d %H:%M:%S')] \$1"
}

log "Starting swap-oracle-service deployment on \$(hostname)"
log "Environment: \$ENVIRONMENT"
log "AWS Region: \$AWS_REGION"
log "Image: \$FULL_IMAGE_URI"
log "Redis Endpoint: \$REDIS_ENDPOINT:\$REDIS_PORT"

# Update system packages
log "Updating system packages..."
yum update -y

# Install Docker
log "Installing Docker..."
yum install -y docker
systemctl start docker
systemctl enable docker
usermod -a -G docker ec2-user

# Install AWS CLI v2 (if not already installed)
log "Installing AWS CLI v2..."
if ! command -v aws &> /dev/null; then
    curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
    yum install -y unzip
    unzip awscliv2.zip
    ./aws/install
    rm -rf aws awscliv2.zip
fi

# Install CloudWatch agent
log "Installing CloudWatch agent..."
yum install -y amazon-cloudwatch-agent

# Create application directories
log "Creating application directories..."
mkdir -p /opt/app/logs
chown ec2-user:ec2-user /opt/app/logs

# Login to ECR
log "Logging into ECR..."
aws ecr get-login-password --region \$AWS_REGION | docker login --username AWS --password-stdin \$ECR_REGISTRY

# Pull the Docker image
log "Pulling Docker image: \$FULL_IMAGE_URI"
docker pull \$FULL_IMAGE_URI

# Stop and remove existing container if it exists
log "Cleaning up existing container..."
if docker ps -q -f name=\$CONTAINER_NAME | grep -q .; then
    log "Stopping existing container..."
    docker stop \$CONTAINER_NAME || true
fi
if docker ps -aq -f name=\$CONTAINER_NAME | grep -q .; then
    log "Removing existing container..."
    docker rm \$CONTAINER_NAME || true
fi

# Start the new container
log "Starting new container..."
docker run -d \\
  --name \$CONTAINER_NAME \\
  --restart unless-stopped \\
  -p \$CONTAINER_PORT:\$CONTAINER_PORT \\
  --log-driver=awslogs \\
  --log-opt awslogs-group="/ec2/\$ENVIRONMENT/\$CONTAINER_NAME" \\
  --log-opt awslogs-region=\$AWS_REGION \\
  --log-opt awslogs-stream=\$INSTANCE_ID \\
  --log-opt awslogs-create-group=true \\
  -e ENVIRONMENT=\$ENVIRONMENT \\
  -e AWS_REGION=\$AWS_REGION \\
  -e REDIS_ENDPOINT=\$REDIS_ENDPOINT \\
  -e REDIS_PORT=\$REDIS_PORT \\
  -v /opt/app/logs:/app/logs \\
  \$FULL_IMAGE_URI

# Wait for container to start
log "Waiting for container to start..."
sleep 10

# Verify container is running
if docker ps | grep -q \$CONTAINER_NAME; then
    log "✅ Container \$CONTAINER_NAME is running successfully"

    # Perform health check
    log "Performing health check..."
    max_attempts=12
    attempt=1

    while [ \$attempt -le \$max_attempts ]; do
        log "Health check attempt \$attempt/\$max_attempts..."

        if curl -f -s http://localhost:\$CONTAINER_PORT/health > /dev/null 2>&1; then
            log "✅ Health check passed"
            break
        else
            if [ \$attempt -eq \$max_attempts ]; then
                log "⚠️ Health check failed after \$max_attempts attempts, but container is running"
                docker logs --tail 20 \$CONTAINER_NAME
            else
                log "Health check failed, retrying in 10 seconds..."
                sleep 10
            fi
        fi

        attempt=\$((attempt + 1))
    done
else
    log "❌ Container failed to start"
    docker logs \$CONTAINER_NAME || true
    exit 1
fi

# Create a status file
echo "deployment_completed_at=\$(date -u +%Y-%m-%dT%H:%M:%SZ)" > /opt/app/deployment_status
echo "image_tag=\$IMAGE_TAG" >> /opt/app/deployment_status
echo "container_name=\$CONTAINER_NAME" >> /opt/app/deployment_status

log "🎉 Deployment completed successfully on \$(hostname)"
log "Image: \$FULL_IMAGE_URI"
log "Container: \$CONTAINER_NAME is running on port \$CONTAINER_PORT"
EOF

  # Return just the path, no echo
  echo "$user_data_path"
}

update_pricing_service_launch_template_user_data() {
  echo "Updating launch template user data with new configuration..."

  # Create the updated user data script
  local user_data_path
  user_data_path=$(create_updated_pricing_service_user_data)

  # Verify the file exists
  if [[ ! -f "$user_data_path" ]]; then
    echo "❌ User data file not found: $user_data_path"
    exit 1
  fi

  echo "✅ User data script created successfully"

  # Base64 encode the user data
  local user_data_b64
  user_data_b64=$(base64 -w0 "$user_data_path")

  # Find the launch template by name prefix
  local launch_template_name="doublezero-${ENV}-swap-oracle-lt"
  echo "Looking for launch templates with prefix: $launch_template_name"

  # Get the launch template ID
  local template_id
  template_id=$(aws ec2 describe-launch-templates \
    --region "$AWS_REGION" \
    --filters "Name=launch-template-name,Values=${launch_template_name}*" \
    --query 'LaunchTemplates[0].LaunchTemplateId' \
    --output text)

  if [[ -z "$template_id" || "$template_id" == "None" ]]; then
    echo "❌ Launch template not found with prefix: $launch_template_name"
    echo "Available launch templates:"
    aws ec2 describe-launch-templates \
      --region "$AWS_REGION" \
      --query 'LaunchTemplates[].{Name:LaunchTemplateName,Id:LaunchTemplateId}' \
      --output table
    rm -f "$user_data_path"
    exit 1
  fi

  echo "✅ Found launch template ID: $template_id"

  # Get current launch template version details and create properly formatted JSON
  echo "Getting current launch template configuration..."
  local launch_template_data
  launch_template_data=$(aws ec2 describe-launch-template-versions \
    --region "$AWS_REGION" \
    --launch-template-id "$template_id" \
    --versions '$Latest' \
    --query 'LaunchTemplateVersions[0].LaunchTemplateData' \
    --output json)

  # Create the new launch template data with updated UserData
  local new_template_data
  new_template_data=$(echo "$launch_template_data" | jq --arg userdata "$user_data_b64" '. + {"UserData": $userdata}')

  # Create new launch template version
  echo "Creating new launch template version with updated user data..."
  local new_version
  new_version=$(aws ec2 create-launch-template-version \
    --region "$AWS_REGION" \
    --launch-template-id "$template_id" \
    --launch-template-data "$new_template_data" \
    --query 'LaunchTemplateVersion.VersionNumber' \
    --output text)

  if [[ -n "$new_version" && "$new_version" != "None" ]]; then
    echo "✅ Created new launch template version: $new_version"

    # Update the default version
    echo "Setting new version as default..."
    aws ec2 modify-launch-template \
      --region "$AWS_REGION" \
      --launch-template-id "$template_id" \
      --default-version "$new_version"

    echo "✅ Launch template updated successfully"
    echo "Template ID: $template_id"
    echo "New Version: $new_version"
    echo "Image Tag: $IMAGE_TAG"
  else
    echo "❌ Failed to create new launch template version"
    rm -f "$user_data_path"
    exit 1
  fi

  rm -f "$user_data_path"
}


trigger_swap-oracle_instance_refresh() {
  echo "Triggering Auto Scaling Group instance refresh for swap_oracle_service..."

  # Get ASG name specifically for swap oracle service
  local asg_name="doublezero-${ENV}-swap-oracle-asg"
  echo "$asg_name"

  local refresh_id
  refresh_id=$(aws autoscaling start-instance-refresh \
    --region "$AWS_REGION" \
    --auto-scaling-group-name "$asg_name" \
    --preferences MinHealthyPercentage=90,InstanceWarmup=300 \
    --query 'InstanceRefreshId' \
    --output text)

  if [[ -n "$refresh_id" && "$refresh_id" != "None" ]]; then
    echo "✅ Instance refresh initiated with ID: $refresh_id"
    echo "New instances will use image tag: $IMAGE_TAG"
    echo "Monitor progress: aws autoscaling describe-instance-refreshes --region $AWS_REGION --auto-scaling-group-name $asg_name"
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
IMAGE_TAG=${IMAGE_TAG@Q}
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
  -e ENVIRONMENT=$ENVIRONMENT -e AWS_REGION=$AWS_REGION -e REDIS_ENDPOINT=$REDIS_ENDPOINT -e REDIS_PORT=$REDIS_PORT\
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
      --comment "Deploy container on $instance_id with tag $IMAGE_TAG" \
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

# Main flow
if [[ "$CONTAINER_NAME" == "swap-oracle-service" ]]; then
  get_redis_url_from_terraform
  update_pricing_service_launch_template_user_data
  trigger_swap-oracle_instance_refresh

else
  find_ec2_instance
  deploy_application
  print_deployment_summary

fi
