# Variables for EC2 Module

variable "environment" {
  description = "Environment name (e.g., dev, staging, prod)"
  type        = string
}

variable "name_prefix" {
  description = "Prefix to be used in the name of resources"
  type        = string
}

variable "private_subnets" {
  description = "List of private subnet IDs for the EC2 instances"
  type        = list(string)
}

variable "security_groups" {
  description = "List of security group IDs for the EC2 instances"
  type        = list(string)
}

variable "target_group_arns" {
  description = "List of target group ARNs to attach to the Auto Scaling Group"
  type        = list(string)
}

# EC2 Instance Configuration
variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.micro"
}

variable "ami_id" {
  description = "AMI ID for EC2 instances (defaults to latest Amazon Linux 2)"
  type        = string
  default     = ""
}

variable "root_volume_size" {
  description = "Size of the root volume in GB"
  type        = number
  default     = 20
}

variable "region" {
  description = "AWS region where resources will be created"
  type        = string
  default     = "us-east-1"
}

# Auto Scaling Group Configuration
variable "min_size" {
  description = "Minimum size of the auto scaling group"
  type        = number
  default     = 2
}

variable "max_size" {
  description = "Maximum size of the auto scaling group"
  type        = number
  default     = 10
}

variable "desired_capacity" {
  description = "Desired capacity of the auto scaling group"
  type        = number
  default     = 2
}

variable "health_check_grace_period" {
  description = "Time (in seconds) after instance comes into service before checking health"
  type        = number
  default     = 300
}

# Auto Scaling Policies Configuration
variable "cpu_high_threshold" {
  description = "CPU utilization threshold for scaling up"
  type        = number
  default     = 70
}

variable "cpu_low_threshold" {
  description = "CPU utilization threshold for scaling down"
  type        = number
  default     = 30
}

# IAM Configuration
variable "instance_profile_name" {
  description = "Name of the IAM instance profile to use (if not provided, one will be created)"
  type        = string
  default     = ""
}

# Additional Tags
variable "additional_tags" {
  description = "Additional tags to add to resources"
  type        = map(string)
  default     = {}
}

variable "ecr_repository" {
  description = "ECR repository name"
  type        = string
  default = "double-zero-repository"
}

variable "image_tag" {
  description = "Docker image tag to pull from ECR"
  type        = string
  default     = "v1.2.0"
}

variable "container_name" {
  description = "Name for the Docker container"
  type        = string
  default     = "swap-oracle-service"
}

variable "container_port" {
  description = "Port that the container exposes"
  type        = number
  default     = 8080
}

variable "container_environment_vars" {
  description = "Additional environment variables for the container"
  type        = map(string)
  default     = {}
}
