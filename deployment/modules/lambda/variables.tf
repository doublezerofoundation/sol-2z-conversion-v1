# Variables for Lambda Metrics API module

variable "name_prefix" {
  description = "Prefix for resource names"
  type        = string
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

variable "s3_bucket_name" {
  description = "Name of the S3 bucket containing Lambda deployment artifacts"
  type        = string
}

variable "s3_object_key" {
  description = "S3 object key for the Lambda deployment ZIP file"
  type        = string
  default     = "metrics-api.zip"
}

variable "release_tag" {
  description = "Release tag for versioned deployments (e.g., v1.0.0)"
  type        = string
  default     = "latest"
}

variable "s3_access_policy_arn" {
  description = "ARN of the IAM policy that grants access to the S3 bucket"
  type        = string
}

variable "lambda_handler" {
  description = "Lambda function handler"
  type        = string
  default     = "metrics-api/handler.handler"
}

variable "lambda_runtime" {
  description = "Lambda runtime"
  type        = string
  default     = "nodejs18.x"
}

variable "lambda_timeout" {
  description = "Lambda function timeout in seconds"
  type        = number
  default     = 30
}

variable "lambda_memory_size" {
  description = "Lambda function memory size in MB"
  type        = number
  default     = 256
}

variable "log_level" {
  description = "Log level for the Lambda function"
  type        = string
  default     = "INFO"
}

variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 14
}

variable "environment_variables" {
  description = "Additional environment variables for the Lambda function"
  type        = map(string)
  default     = {}
}

variable "vpc_config" {
  description = "VPC configuration for Lambda function"
  type = object({
    subnet_ids         = list(string)
    security_group_ids = list(string)
  })
  default = null
}

variable "database_resources" {
  description = "List of database resource ARNs that Lambda needs access to"
  type        = list(string)
  default     = []
}

variable "api_gateway_arn" {
  description = "ARN of the API Gateway that will invoke this Lambda"
  type        = string
}

variable "create_alias" {
  description = "Whether to create a Lambda alias"
  type        = bool
  default     = false
}
