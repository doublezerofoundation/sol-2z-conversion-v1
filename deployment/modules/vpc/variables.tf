# Variables for VPC Module

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
}

variable "name_prefix" {
  description = "Prefix to be used in the name of resources"
  type        = string
  default     = "doublezero"
}
