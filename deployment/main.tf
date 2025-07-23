# Main Terraform configuration file for DoubleZero infrastructure

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Uncomment to use a remote backend for state management
  backend "s3" {
    bucket         = "doublezero-terraform-state-bucket"
    key            = "terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "doublezero-terraform-locks"
    encrypt        = true
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "DoubleZero"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# VPC and Networking
module "vpc" {
  source = "./modules/vpc"

  environment         = var.environment
  vpc_cidr            = var.vpc_cidr
  availability_zones  = var.availability_zones
  public_subnet_cidrs = var.public_subnet_cidrs
  private_subnet_cidrs = var.private_subnet_cidrs
}

# Web Application Firewall (WAF)
module "waf" {
  source = "./modules/waf"

  environment = var.environment
  name_prefix = "doublezero-${var.environment}"
}

# Network Load Balancer
module "load_balancer" {
  source = "./modules/load_balancer"

  environment     = var.environment
  name_prefix     = "doublezero-${var.environment}"
  vpc_id          = module.vpc.vpc_id
  public_subnets  = module.vpc.public_subnet_ids
  security_groups = [module.vpc.alb_security_group_id] # Not used by NLB, but kept for module compatibility
}

# EC2 Instances with Auto Scaling
module "ec2" {
  source = "./modules/ec2"

  environment       = var.environment
  name_prefix       = "doublezero-${var.environment}"
  vpc_id            = module.vpc.vpc_id
  private_subnets   = module.vpc.private_subnet_ids
  security_groups   = [module.vpc.ec2_security_group_id]
  target_group_arns = [module.load_balancer.target_group_arn]
  instance_type     = var.instance_type
  min_size          = var.asg_min_size
  max_size          = var.asg_max_size
  desired_capacity  = var.asg_desired_capacity
  region            = var.aws_region
}

# API Gateway VPC Link to Load Balancer
resource "aws_api_gateway_vpc_link" "this" {
  name        = "doublezero-${var.environment}-vpc-link"
  target_arns = [module.load_balancer.load_balancer_arn]

  tags = {
    Name = "doublezero-${var.environment}-vpc-link"
  }
}

# API Gateway
module "api_gateway" {
  source = "./modules/api_gateway"

  environment = var.environment
  name_prefix = "doublezero-${var.environment}"
  waf_acl_arn = module.waf.web_acl_arn
  nlb_dns_name    = module.load_balancer.load_balancer_dns
  connection_type         = "VPC_LINK"
  connection_id           = aws_api_gateway_vpc_link.this.id
}
