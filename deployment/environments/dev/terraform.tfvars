# Development Environment Configuration

# General
environment = "dev3"
aws_region  = "us-east-1"

# VPC Configuration
vpc_cidr            = "10.0.0.0/16"
# Subnet configuration is now defined at the regional level

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
cors_allow_origins = ["*"]

# Load Balancer Configuration
lb_internal = false

# Health Check Configuration
health_check_interval = 30
health_check_healthy_threshold   = 3
health_check_unhealthy_threshold = 3
