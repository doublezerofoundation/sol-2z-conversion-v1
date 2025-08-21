# Variables for S3 Lambda Deployments Module

variable "name_prefix" {
  description = "Prefix to be used in the name of resources"
  type        = string
}

variable "environment" {
  description = "Environment name (e.g., dev, staging, prod)"
  type        = string
}

variable "old_version_retention_days" {
  description = "Number of days to retain old versions of Lambda deployments"
  type        = number
  default     = 30
}
