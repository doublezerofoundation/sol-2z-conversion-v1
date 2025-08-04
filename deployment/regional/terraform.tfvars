# Regional-level Configuration

# General
aws_region = "us-east-1"
name_prefix = "doublezero"

# VPC Configuration
vpc_cidr = "10.0.0.0/16"

# Subnet Configuration
availability_zones  = ["us-east-1a", "us-east-1b", "us-east-1c"]
public_subnet_cidrs = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
private_subnet_cidrs = ["10.0.11.0/24", "10.0.12.0/24", "10.0.13.0/24"]
