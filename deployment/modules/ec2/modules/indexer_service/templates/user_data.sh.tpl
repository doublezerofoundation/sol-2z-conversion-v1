#!/bin/bash
# User data script for EC2 instances with Session Manager support

# Set up logging
exec > >(tee /var/log/user-data.log|logger -t user-data -s 2>/dev/console) 2>&1
echo "Starting user data script execution at $(date)"

# Update system packages
yum update -y

# Install required packages including SSM Agent
yum install -y \
    amazon-ssm-agent \
    amazon-cloudwatch-agent \
    docker \
    awscli \
    curl \
    wget \
    unzip

# Start and enable SSM Agent (Session Manager)
systemctl start amazon-ssm-agent
systemctl enable amazon-ssm-agent
echo "SSM Agent installed and started"

# Start and enable Docker
systemctl start docker
systemctl enable docker

# Add ec2-user to docker group
usermod -a -G docker ec2-user

# Get instance metadata
INSTANCE_ID=$(curl -s http://169.254.169.254/latest/meta-data/instance-id)
REGION=${region}
AZ=$(curl -s http://169.254.169.254/latest/meta-data/placement/availability-zone)

# ECR Configuration
ECR_REGISTRY="${ecr_registry}"
ECR_REPOSITORY="${ecr_repository}"
IMAGE_TAG="${image_tag}"
CONTAINER_NAME="${container_name}"

echo "Configuring ECR authentication..."

# Get ECR login token and authenticate Docker
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $ECR_REGISTRY

if [ $? -eq 0 ]; then
    echo "✅ Successfully authenticated with ECR"
else
    echo "❌ Failed to authenticate with ECR"
    exit 1
fi

# Pull the image from ECR
echo "Pulling image from ECR: $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG"
docker pull $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG

if [ $? -eq 0 ]; then
    echo "✅ Successfully pulled image from ECR"
else
    echo "❌ Failed to pull image from ECR"
    exit 1
fi

# Stop and remove existing container if it exists
if docker ps -a --format 'table {{.Names}}' | grep -q "^$CONTAINER_NAME$"; then
    echo "Stopping and removing existing container: $CONTAINER_NAME"
    docker stop $CONTAINER_NAME
    docker rm $CONTAINER_NAME
fi

# Run the container
echo "Starting container: $CONTAINER_NAME"
docker run -d --name $CONTAINER_NAME --restart unless-stopped \
  -p ${container_port}:${container_port} \
  --log-driver=awslogs \
  --log-opt awslogs-group="/ec2/${environment}/${container_name}" \
  --log-opt awslogs-region=$REGION \
  --log-opt awslogs-stream=$INSTANCE_ID \
  --log-opt awslogs-create-group=true \
  -v /opt/app/logs:/app/logs \
  -e ENVIRONMENT=${environment} -e AWS_REGION=$REGION -e INSTANCE_ID=$INSTANCE_ID \
  %{ for key, value in container_environment_vars ~}-e ${key}=${value} %{ endfor ~}\
  $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG

if [ $? -eq 0 ]; then
    echo "✅ Container started successfully"
    docker ps --filter name=$CONTAINER_NAME
else
    echo "❌ Failed to start container"
    exit 1
fi

# Configure CloudWatch agent
cat > /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json << 'EOF'
{
  "agent": {
    "metrics_collection_interval": 60,
    "run_as_user": "root"
  },
  "metrics": {
    "metrics_collected": {
      "cpu": {
        "measurement": [
          "cpu_usage_idle",
          "cpu_usage_iowait",
          "cpu_usage_user",
          "cpu_usage_system"
        ],
        "metrics_collection_interval": 60
      },
      "disk": {
        "measurement": [
          "used_percent"
        ],
        "resources": [
          "/"
        ]
      },
      "mem": {
        "measurement": [
          "mem_used_percent"
        ]
      }
    },
    "append_dimensions": {
      "InstanceId": "$${aws:InstanceId}",
      "Environment": "${environment}"
    }
  },
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/var/log/user-data.log",
            "log_group_name": "/ec2/${environment}/${container_name}/user_data",
            "log_stream_name": "{instance_id}"
          },
          {
            "file_path": "/opt/app/logs/*.log",
            "log_group_name": "/ec2/${environment}/${container_name}/application",
            "log_stream_name": "{instance_id}"
          }
        ]
      }
    }
  }
}
EOF

# Start CloudWatch agent
systemctl start amazon-cloudwatch-agent
systemctl enable amazon-cloudwatch-agent
echo "CloudWatch agent configured and started"

# Create application directories
mkdir -p /opt/app/{logs,config}
chown -R ec2-user:ec2-user /opt/app

# Create log rotation for application logs
cat > /etc/logrotate.d/app-logs << 'EOF'
/opt/app/logs/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 644 ec2-user ec2-user
}
EOF

# Create a health check script
cat > /opt/app/health-check.sh << 'EOF'
#!/bin/bash
CONTAINER_NAME="${container_name}"

if docker ps --filter name=$CONTAINER_NAME --filter status=running | grep -q $CONTAINER_NAME; then
    echo "✅ Container $CONTAINER_NAME is running"
    exit 0
else
    echo "❌ Container $CONTAINER_NAME is not running"
    exit 1
fi
EOF

chmod +x /opt/app/health-check.sh

# Set up a cron job for health checks
echo "*/5 * * * * /opt/app/health-check.sh >> /opt/app/logs/health-check.log 2>&1" | crontab -

# Tag the instance for Ansible discovery
aws ec2 create-tags \
  --resources $INSTANCE_ID \
  --tags \
    Key=Environment,Value=${environment} \
    Key=Service,Value=indexer-service \
    Key=ManagedBy,Value=Ansible \
    Key=SSMEnabled,Value=true \
    Key=ContainerRunning,Value=true \
  --region $REGION

echo "Instance tagged successfully"

# Verify SSM Agent is working
if systemctl is-active --quiet amazon-ssm-agent; then
    echo "✅ SSM Agent is running - Session Manager ready"
else
    echo "❌ SSM Agent failed to start"
fi

# Verify Docker is working
if systemctl is-active --quiet docker; then
    echo "✅ Docker is running"
    docker --version
else
    echo "❌ Docker failed to start"
fi

# Verify container is running
sleep 10  # Give container time to start
if docker ps --filter name=$CONTAINER_NAME --filter status=running | grep -q $CONTAINER_NAME; then
    echo "✅ Application container is running successfully"
    docker logs --tail 20 $CONTAINER_NAME
else
    echo "❌ Application container failed to start or is not running"
    docker logs $CONTAINER_NAME
fi

# Log completion
echo "User data script completed successfully at $(date)"
echo "Instance is ready with application container running"