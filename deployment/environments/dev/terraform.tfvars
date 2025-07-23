# Development Environment Configuration

# General
environment = "dev"
aws_region  = "us-east-1"

# VPC Configuration
vpc_cidr            = "10.0.0.0/16"
availability_zones  = ["us-east-1a", "us-east-1b", "us-east-1c"]
public_subnet_cidrs = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
private_subnet_cidrs = ["10.0.11.0/24", "10.0.12.0/24", "10.0.13.0/24"]

# EC2 Configuration
instance_type = "t3.micro"
ami_id        = "" # Leave empty to use the latest Amazon Linux 2 AMI

# Auto Scaling Group Configuration
asg_min_size         = 2
asg_max_size         = 5
asg_desired_capacity = 2

# WAF Configuration
waf_default_action = "ALLOW"
allowed_ip_addresses = []
denied_ip_addresses  = []

# API Gateway Configuration
api_gateway_name = "doublezero-dev-api"
cors_allow_origins = ["*"]

# Load Balancer Configuration
lb_internal = false

# Health Check Configuration
health_check_interval = 30
health_check_healthy_threshold   = 3
health_check_unhealthy_threshold = 3
