# Variables for API Gateway Module

variable "environment" {
  description = "Environment name (e.g., dev, staging, prod)"
  type        = string
}

variable "name_prefix" {
  description = "Prefix to be used in the name of resources"
  type        = string
}

variable "waf_acl_arn" {
  description = "ARN of the WAF Web ACL to associate with the API Gateway"
  type        = string
}

# CORS Configuration
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

# Logging Configuration
variable "log_retention_days" {
  description = "Number of days to retain API Gateway logs"
  type        = number
  default     = 30
}

# Integration Configuration
variable "integration_type" {
  description = "Type of integration for API Gateway (HTTP or LAMBDA)"
  type        = string
  default     = "HTTP"
}

variable "nlb_dns_name" {
  description = "DNS name of the Network Load Balancer (for HTTP integration)"
  type        = string
  default     = ""
}

variable "lambda_invoke_arn" {
  description = "Invoke ARN of the Lambda function (for LAMBDA integration)"
  type        = string
  default     = ""
}

variable "connection_type" {
  description = "Connection type for API Gateway integration (e.g., INTERNET, VPC_LINK)"
  type        = string
  default     = "INTERNET"
}

variable "connection_id" {
  description = "Connection ID for API Gateway integration (e.g., VPC Link ID)"
  type        = string
  default     = null
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

variable "enable_pricing_service" {
  description = "Enable pricing service API resources"
  type        = bool
  default     = false
}

variable "enable_metrics_api" {
  description = "Enable metrics API resources (/metrics/buys, /metrics/dequeues)"
  type        = bool
  default     = false
}

variable "metrics_lambda_invoke_arn" {
  description = "Invoke ARN of the Lambda function for metrics API"
  type        = string
  default     = ""
}
