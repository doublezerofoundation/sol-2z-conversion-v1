variable "environment" {
  description = "Environment name (e.g., dev, staging, prod)"
  type        = string
}

variable "name_prefix" {
  description = "Prefix to be used in the name of resources"
  type        = string
}

variable "additional_tags" {
  type        = map(string)
  default     = {}
}
