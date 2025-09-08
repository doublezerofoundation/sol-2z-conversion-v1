# Variables for WAF Module

variable "environment" {
  description = "Environment name (e.g., dev, staging, prod)"
  type        = string
}

variable "name_prefix" {
  description = "Prefix to be used in the name of resources"
  type        = string
}


variable "enable_logging" {
  description = "Enable WAF logging to S3 bucket"
  type        = bool
  default     = true
}

variable "log_retention_days" {
  description = "Number of days to retain WAF logs"
  type        = number
  default     = 30
}

variable "waf_default_action" {
  description = "Default action for WAF (ALLOW or BLOCK)"
  type        = string
  default     = "ALLOW"
}

variable "rate_limit" {
  description = "Rate limit for requests from a single IP"
  type        = number
  default     = 1000
}
