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

variable "enable_swap_oracle_service" {
  type        = bool
  default     = false
}

variable "enable_indexer_service" {
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
