# Variables for Network Module

variable "vpc_id" {
  description = "The ID of the VPC"
  type        = string
}

variable "internet_gateway_id" {
  description = "The ID of the Internet Gateway"
  type        = string
}

variable "public_subnet_ids" {
  description = "List of public subnet IDs"
  type        = list(string)
}

variable "private_subnet_ids" {
  description = "List of private subnet IDs"
  type        = list(string)
}

variable "public_route_table_id" {
  description = "ID of the public route table"
  type        = string
}

variable "private_route_table_id" {
  description = "ID of the private route table"
  type        = string
}

variable "environment" {
  description = "Environment name (e.g., dev, staging, prod)"
  type        = string
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
}
