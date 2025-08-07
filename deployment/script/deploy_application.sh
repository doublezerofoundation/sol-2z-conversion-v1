#!/bin/bash
set -e


ENV="dev3"
AWS_REGION="us-east-1"
IMAGE_TAG="dev3-v1.0.0"
CONTAINER_NAME="swap-oracle-service"
ECR_REGISTRY=""
ECR_REPOSITORY="double-zero-oracle-pricing-service"
TERRAFORM_DIR="../regional"
successful_instances=()
failed_instances=()


get_ecr_config(){
  echo "Retrieve ECR config"
  local account_id=$(aws sts get-caller-identity --query Account --output text)
  ECR_REGISTRY="${account_id}.dkr.ecr.${AWS_REGION}.amazonaws.com"

  echo "Ecr registry: ${ECR_REGISTRY}"
}

find_ec2_instance(){
  INSTANCE_IDS=$(aws ec2 describe-instances --region "$AWS_REGION" --filters "Name=tag:Environment,Values=$ENV" "Name=tag:Service,Values=$ECR_REPOSITORY"\
    --query 'Reservations[].Instances[].InstanceId' \
    --output text)
  echo "instance $INSTANCE_IDS"

}

get_redis_url_from_terraform(){
  echo "Retrieving Redis URL from Terraform outputs..."

  if [[ ! -d "$TERRAFORM_DIR" ]]; then
    echo "❌ Terraform directory not found: $TERRAFORM_DIR"
    exit 1
  fi

  # Change to terraform directory and get the output
   cd "$TERRAFORM_DIR" || {
      echo "❌ Failed to change to terraform directory: $TERRAFORM_DIR"
      exit 1
  }
  echo "Current directory: $(pwd)"
  echo "Checking terraform state and configuration..."


  echo "Running terraform output commands..."

  # Get Redis endpoint with error handling
  echo "Getting Redis endpoint..."
#  TODO remove hardcoded value
  REDIS_ENDPOINT="master.doublezero-redis.m3emep.use1.cache.amazonaws.com"
#  $(terraform output -raw redis_endpoint 2>&1)
  REDIS_ENDPOINT_EXIT_CODE=$?

  if [[ $REDIS_ENDPOINT_EXIT_CODE -ne 0 ]]; then
    echo "❌ Failed to get redis_endpoint from terraform output."
    echo "Error output: $REDIS_ENDPOINT"
    echo "Make sure:"
    echo "   - Terraform is initialized (run 'terraform init')"
    echo "   - Infrastructure has been applied (run 'terraform apply')"
    echo "   - The 'redis_endpoint' output exists in your terraform configuration"
    echo "   - You have the necessary permissions to access the state"
    cd - > /dev/null
    exit 1
  fi

  # Get Redis port with error handling
  echo "Getting Redis port..."
  #  TODO remove hardcoded value
  REDIS_PORT="6379"
#  $(terraform output -raw redis_port 2>&1)
  REDIS_PORT_EXIT_CODE=$?

  if [[ $REDIS_PORT_EXIT_CODE -ne 0 ]]; then
    echo "❌ Failed to get redis_port from terraform output."
    echo "Error output: $REDIS_PORT"
    echo "Make sure:"
    echo "   - Terraform is initialized (run 'terraform init')"
    echo "   - Infrastructure has been applied (run 'terraform apply')"
    echo "   - The 'redis_port' output exists in your terraform configuration"
    echo "   - You have the necessary permissions to access the state"
    cd - > /dev/null
    exit 1
  fi



  if [[ -z "$REDIS_ENDPOINT" || "$REDIS_ENDPOINT" == "null" ]]; then
    echo "❌ Redis endpoint output is empty or null. Check your Terraform configuration."
    exit 1
  fi

  if [[ -z "$REDIS_PORT" || "$REDIS_PORT" == "null" ]]; then
    echo "❌ Redis port output is empty or null. Check your Terraform configuration."
    exit 1
  fi

  echo "REDIS_ENDPOINT $REDIS_ENDPOINT"
  echo "REDIS_PORT $REDIS_PORT"
  cd - > /dev/null
}

verify_ecr_image(){
  echo "verify the ecr image $ECR_REPOSITORY  $IMAGE_TAG"
  if aws ecr describe-images --region "$AWS_REGION" --repository-name "$ECR_REPOSITORY" --image-ids imageTag="$IMAGE_TAG" &> /dev/null; then
    echo "ECR image found"
  else
    echo "ECR image not found"
  fi
}

create_deployment_script() {
  local script_path="/tmp/container_deploy.sh"


  cat > "$script_path" << EOF
#!/bin/bash
set -e

# Configuration
ENVIRONMENT="$ENV"
AWS_REGION="$AWS_REGION"
ECR_REGISTRY="$ECR_REGISTRY"
ECR_REPOSITORY="$ECR_REPOSITORY"
IMAGE_TAG="$IMAGE_TAG"
CONTAINER_NAME="$CONTAINER_NAME"
REDIS_PORT="$REDIS_PORT"
REDIS_ENDPOINT="$REDIS_ENDPOINT"
FULL_IMAGE_URI="\${ECR_REGISTRY}/\${ECR_REPOSITORY}:\${IMAGE_TAG}"
INSTANCE_ID=\$(curl -s http://169.254.169.254/latest/meta-data/instance-id)
echo "Starting container redeployment on \$(hostname)"
echo "Image: \$FULL_IMAGE_URI"

# Login to ECR
echo "Logging into ECR..."
aws ecr get-login-password --region \$AWS_REGION | docker login --username AWS --password-stdin \$ECR_REGISTRY

# Pull the new image
echo "Pulling new image..."
docker pull \$FULL_IMAGE_URI

# Stop and remove existing container if it exists
echo "Stopping existing container..."
if docker ps -q -f name=\$CONTAINER_NAME | grep -q .; then
  docker stop \$CONTAINER_NAME || true
fi
if docker ps -aq -f name=\$CONTAINER_NAME | grep -q .; then
  docker rm \$CONTAINER_NAME || true
fi

# Start new container
echo "Starting new container..."
docker run -d \\
  --name \$CONTAINER_NAME \\
  --restart unless-stopped \\
  -p 8080:8080 \\
  --log-driver=awslogs \\
  --log-opt awslogs-group="/ec2/\$ENVIRONMENT/\$CONTAINER_NAME" \\
  --log-opt awslogs-region=\$AWS_REGION  \\
  --log-opt awslogs-stream=\$INSTANCE_ID \\
  --log-opt awslogs-create-group=true \\
  -e ENVIRONMENT=\$ENVIRONMENT -e AWS_REGION=\$AWS_REGION -e REDIS_ENDPOINT=\$REDIS_ENDPOINT -e REDIS_PORT=\$REDIS_PORT\\
  -v /opt/app/logs:/app/logs \\
  \$FULL_IMAGE_URI

# Verify container is running
sleep 5
if docker ps | grep -q \$CONTAINER_NAME; then
  echo "Container \$CONTAINER_NAME is running successfully"

  # Health check (adjust URL as needed)
  echo "Performing health check..."
  if curl -f http://localhost:8080/health &> /dev/null; then
    echo "Health check passed"
  else
    echo " Health check failed, but container is running"
  fi
else
  echo "Container failed to start"
  docker logs \$CONTAINER_NAME || true
  exit 1
fi

echo "Deployment completed successfully on \$(hostname)"
EOF

  echo "$script_path"
}

deploy_application() {
  echo "Creating deployment script..."
  local script_path=$(create_deployment_script)

  echo "Starting deployment to instances..."

  for instance_id in $INSTANCE_IDS; do
    echo "Deploying to instance: $instance_id"

    local command_id=$(aws ssm send-command \
      --region "$AWS_REGION" \
      --document-name "AWS-RunShellScript" \
      --targets "Key=InstanceIds,Values=$instance_id" \
      --parameters 'commands=["cd /tmp && cat > container_deploy.sh << '"'"'EOL'"'"'","'"$(cat $script_path | sed 's/"/\\"/g')"'","EOL","chmod +x container_deploy.sh","./container_deploy.sh"]' \
      --comment "Deploy container on $instance_id with tag $IMAGE_TAG" \
      --query 'Command.CommandId' \
      --output text)

    if [[ -n "$command_id" ]]; then
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
    echo "attempt $attempts"
    attempts=$((attempts + 1))
    echo "attempt $attempts"
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

help() {
    echo "Usage: $0 [OPTIONS]"
    echo "Options:"
    echo "  --env ENV                Environment (default: dev3)"
    echo "  --region REGION          AWS Region (default: us-east-1)"
    echo "  --image-tag TAG          Docker image tag (default: dev3-v1.0.0)"
    echo "  --container-name NAME    Container name (default: swap-oracle-service)"
    echo "  --ecr-repository REPO    ECR repository name (default: double-zero-oracle-pricing-service)"
    echo "  -h, --help              Display this help message"
    echo ""
    echo "Example:"
    echo "  $0 --env prod --region us-west-2 --image-tag prod-v2.0.0"
    exit 1
}

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
            help
            ;;
        *)
            echo "Unknown option: $1"
            help
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



#./deploy.sh --env dev3 --region us-west-2 --image-tag dev3-v1.0.0  --ecr-repository double-zero-oracle-pricing-service  --container-name swap-oracle-service

get_redis_url_from_terraform
get_ecr_config
find_ec2_instance
verify_ecr_image
echo "DEBUG: ENV variable is: '$ENV'"
echo "DEBUG: Environment will be: '$ENV'"
deploy_application