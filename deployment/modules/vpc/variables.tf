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

variable "environment" {
  description = "Environment name (e.g., dev, staging, prod)"
  type        = string
}

variable "availability_zones" {
  description = "List of availability zones to use"
  type        = list(string)
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for the public subnets"
  type        = list(string)
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for the private subnets"
  type        = list(string)
}

