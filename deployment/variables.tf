# Variables for DoubleZero infrastructure

variable "aws_region" {
  description = "The AWS region to deploy resources"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name (e.g., dev, staging, prod)"
  type        = string
  default     = "dev"
}

# VPC Configuration
variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "List of availability zones to use"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for the public subnets"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for the private subnets"
  type        = list(string)
  default     = ["10.0.11.0/24", "10.0.12.0/24", "10.0.13.0/24"]
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
  default     = 10
}

variable "asg_desired_capacity" {
  description = "Desired capacity of the auto scaling group"
  type        = number
  default     = 2
}

# WAF Configuration
variable "waf_default_action" {
  description = "Default action for WAF (ALLOW or BLOCK)"
  type        = string
  default     = "ALLOW"
}

# API Gateway Configuration
variable "api_gateway_name" {
  description = "Name of the API Gateway"
  type        = string
  default     = "doublezero-api"
}

# Load Balancer Configuration
variable "lb_internal" {
  description = "Whether the load balancer is internal or internet-facing"
  type        = bool
  default     = false
}
