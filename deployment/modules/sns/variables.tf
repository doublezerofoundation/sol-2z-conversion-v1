variable "environment" {
  description = "Environment name (e.g., dev, staging, prod)"
  type        = string
}

variable "name_prefix" {
  description = "Prefix to be used in the name of resources"
  type        = string
}

variable "email_subscribers" {
  description = "List of emails to subscribe to the topic"
  type        = list(string)
  default     = []
}

variable "kms_key_arn" {
  description = "Optional CMK ARN for SNS SSE"
  type        = string
  default     = ""
}

variable "additional_tags" {
  type    = map(string)
  default = {}
}
