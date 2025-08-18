# Variables for environment-level Terraform configuration (dev environment)

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "dev"
}

variable "aws_region" {
  description = "The AWS region to deploy resources"
  type        = string
  default     = "us-east-1"
}

# Network Configuration
variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

# Subnet variables are now defined at the regional level

# WAF Configuration
variable "waf_default_action" {
  description = "Default action for WAF (ALLOW or BLOCK)"
  type        = string
  default     = "ALLOW"
}

variable "allowed_ip_addresses" {
  description = "List of IP addresses to allow (whitelist)"
  type        = list(string)
  default     = []
}

variable "denied_ip_addresses" {
  description = "List of IP addresses to deny (blacklist)"
  type        = list(string)
  default     = []
}

variable "waf_enable_logging" {
  description = "Enable WAF logging to S3 bucket"
  type        = bool
  default     = true
}

# EC2 Configuration
variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.micro"
}

variable "ami_id" {
  description = "AMI ID for EC2 instances (defaults to latest Amazon Linux 2)"
  type        = string
  default     = ""  # Will be determined dynamically in the EC2 module if not provided
}

# Auto Scaling Group Configuration
variable "asg_min_size" {
  description = "Minimum size of the auto scaling group"
  type        = number
  default     = 2
}

variable "asg_max_size" {
  description = "Maximum size of the auto scaling group"
  type        = number
  default     = 5
}

variable "asg_desired_capacity" {
  description = "Desired capacity of the auto scaling group"
  type        = number
  default     = 2
}

# Logging Configuration
variable "log_retention_days" {
  description = "Number of days to retain logs"
  type        = number
  default     = 30
}

# Load Balancer Configuration
variable "lb_internal" {
  description = "Whether the load balancer is internal or internet-facing"
  type        = bool
  default     = false
}

# Health Check Configuration
variable "health_check_interval" {
  description = "Interval between health checks (in seconds)"
  type        = number
  default     = 30
}

variable "health_check_healthy_threshold" {
  description = "Number of consecutive successful health checks required to consider a target healthy"
  type        = number
  default     = 3
}

variable "health_check_unhealthy_threshold" {
  description = "Number of consecutive failed health checks required to consider a target unhealthy"
  type        = number
  default     = 3
}

# Access Logs Configuration
variable "access_logs_bucket" {
  description = "S3 bucket name for access logs"
  type        = string
  default     = ""
}

variable "access_logs_prefix" {
  description = "S3 bucket prefix for access logs"
  type        = string
  default     = ""
}

variable "cors_allow_origins" {
  description = "List of allowed origins for CORS"
  type        = list(string)
  default     = ["*"]
}

variable "cors_allow_methods" {
  description = "List of allowed methods for CORS"
  type        = list(string)
  default     = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
}

variable "cors_allow_headers" {
  description = "List of allowed headers for CORS"
  type        = list(string)
  default     = ["Content-Type", "Authorization", "X-Amz-Date", "X-Api-Key", "X-Amz-Security-Token"]
}

variable "cors_max_age" {
  description = "Maximum age for CORS preflight requests (in seconds)"
  type        = number
  default     = 7200
}

# Throttling Configuration
variable "throttling_burst_limit" {
  description = "Throttling burst limit for API Gateway"
  type        = number
  default     = 5000
}

variable "throttling_rate_limit" {
  description = "Throttling rate limit for API Gateway"
  type        = number
  default     = 10000
}

# Custom Domain Configuration
variable "custom_domain_name" {
  description = "Custom domain name for API Gateway"
  type        = string
  default     = ""
}

variable "certificate_arn" {
  description = "ARN of the ACM certificate for the custom domain"
  type        = string
  default     = ""
}

variable "enable_swap_oracle_service" {
  description = "Enable Swap Oracle Service EC2 module"
  type        = bool
  default     = false
}

variable "enable_indexer_service" {
  description = "Enable Indexer Service EC2 module"
  type        = bool
  default     = false
}

variable "release_tag" {
  description = "Docker image tag to pull from ECR"
  type        = string
  default     = "latest"
}

variable "lambda_s3_version" {
  description = "S3 version ID for the Lambda function deployment package"
  type        = string
  default     = ""
}
