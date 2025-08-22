# Variables for Metrics Service API Gateway Module
variable "nlb_dns_name" {
  description = "DNS name of the Network Load Balancer (for HTTP integration)"
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

variable "api_id" {
  description = "The ID of Parent api resource"
  type        = string
}

variable "parent_id" {
  description = "Parent resource ID for API Gateway integration (e.g., v1 resource ID)"
  type        = string
  default     = null
}

variable "lambda_invoke_arn" {
  description = "Invoke ARN of the Lambda function for metrics API"
  type        = string
}
