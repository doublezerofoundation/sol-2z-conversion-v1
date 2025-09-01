# Variables for EC2 Module

variable "name_prefix" {
  description = "Prefix to be used in the name of resources"
  type        = string
}

variable "environment" {
  description = "Environment name (e.g., dev, staging, prod)"
  type        = string
}

variable "region" {
  type        = string
  description = "AWS region"
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

variable "instance_profile_name" {
  description = "Name of the IAM instance profile to use (if not provided, one will be created)"
  type        = string
  default     = ""
}

variable "ami_id" {
  description = "AMI ID for EC2 instances (defaults to latest Amazon Linux 2)"
  type        = string
  default     = ""
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


variable "enable_swap_oracle_service" {
  description = "Enable the Swap Oracle Service EC2 module"
  type        = bool
  default     = false
}

variable "enable_indexer_service" {
  description = "Enable the Indexer Service EC2 module"
  type        = bool
  default     = false
}

variable "redis_endpoint" {
  description = "Redis primary endpoint"
  type = string
}

variable "redis_port" {
  description = "Redis port"
  type = string
}

variable "swap_oracle_service_image_tag" {
  description = "Docker image tag to pull from ECR"
  type        = string
  default     = "latest"
}

variable "indexer_service_image_tag" {
  description = "Docker image tag to pull from ECR"
  type        = string
  default     = "latest"
}

variable "skip_image_validation" {
  description = "Specify whether ECR image validation is needed"
  type        = bool
  default     = false
}