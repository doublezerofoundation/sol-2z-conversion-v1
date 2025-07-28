# Environment-level Terraform configuration for DoubleZero infrastructure (dev environment)

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Backend configuration for environment-level state
  backend "s3" {
    bucket         = "doublezero-terraform-state-bucket"
    key            = "environments/dev2/terraform.tfstate"
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
      Region      = var.aws_region
      ManagedBy   = "Terraform"
    }
  }
}

# Data source to get account-level outputs
data "terraform_remote_state" "account" {
  backend = "s3"
  config = {
    bucket         = "doublezero-terraform-state-bucket"
    key            = "account/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "doublezero-terraform-locks"
    encrypt        = true
  }
}

# Data source to get regional-level outputs
data "terraform_remote_state" "regional" {
  backend = "s3"
  config = {
    bucket         = "doublezero-terraform-state-bucket"
    key            = "regional/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "doublezero-terraform-locks"
    encrypt        = true
  }
}

# Network Module - Creates network components at the environment level (NAT Gateway and Security Groups)
# Subnets are now created at the regional level
module "network" {
  source = "../../modules/network"

  vpc_id             = data.terraform_remote_state.regional.outputs.vpc_id
  internet_gateway_id = data.terraform_remote_state.regional.outputs.internet_gateway_id
  public_subnet_ids  = data.terraform_remote_state.regional.outputs.public_subnet_ids
  private_subnet_ids = data.terraform_remote_state.regional.outputs.private_subnet_ids
  public_route_table_id = data.terraform_remote_state.regional.outputs.public_route_table_id
  private_route_table_id = data.terraform_remote_state.regional.outputs.private_route_table_id
  environment        = var.environment
  vpc_cidr           = var.vpc_cidr
}

# Web Application Firewall (WAF)
module "waf" {
  source = "../../modules/waf"

  name_prefix = "doublezero-${var.environment}"
  environment = var.environment

  # WAF configuration
  waf_default_action = var.waf_default_action
  allowed_ip_addresses = var.allowed_ip_addresses
  denied_ip_addresses = var.denied_ip_addresses
  enable_logging = var.waf_enable_logging
  log_retention_days = var.log_retention_days
}

# API Gateway VPC Link
resource "aws_api_gateway_vpc_link" "this" {
  name        = "doublezero-${var.environment}-vpc-link"
  target_arns = [module.load_balancer.load_balancer_arn]

  tags = {
    Name        = "doublezero-${var.environment}-vpc-link"
    Environment = var.environment
  }
}

# Network Load Balancer
module "load_balancer" {
  source = "../../modules/load_balancer"

  name_prefix     = "doublezero-${var.environment}"
  environment     = var.environment
  vpc_id          = data.terraform_remote_state.regional.outputs.vpc_id
  public_subnets  = module.network.public_subnet_ids
  internal        = var.lb_internal

  # Health check configuration
  health_check_interval = var.health_check_interval
  health_check_healthy_threshold = var.health_check_healthy_threshold
  health_check_unhealthy_threshold = var.health_check_unhealthy_threshold

  # Access logs configuration
  access_logs_bucket = var.access_logs_bucket
  access_logs_prefix = var.access_logs_prefix
}

# API Gateway
module "api_gateway" {
  source = "../../modules/api_gateway"

  name_prefix = "doublezero-${var.environment}"
  environment = var.environment
  waf_acl_arn = module.waf.web_acl_arn

  # API Gateway configuration
  nlb_dns_name    = module.load_balancer.load_balancer_dns
  connection_type = "VPC_LINK"
  connection_id   = aws_api_gateway_vpc_link.this.id

  # CORS configuration
  cors_allow_origins = var.cors_allow_origins
  cors_allow_methods = var.cors_allow_methods
  cors_allow_headers = var.cors_allow_headers
  cors_max_age = var.cors_max_age

  # Throttling configuration
  throttling_burst_limit = var.throttling_burst_limit
  throttling_rate_limit = var.throttling_rate_limit

  # Logging configuration
  log_retention_days = var.log_retention_days
}

# EC2 Instances with Auto Scaling
module "ec2" {
  source = "../../modules/ec2"

  environment       = var.environment
  name_prefix       = "doublezero-${var.environment}"
  private_subnets   = module.network.private_subnet_ids
  security_groups   = [module.network.ec2_security_group_id]
  target_group_arns = [module.load_balancer.target_group_arn]
  instance_type     = var.instance_type
  min_size          = var.asg_min_size
  max_size          = var.asg_max_size
  desired_capacity  = var.asg_desired_capacity
  region            = var.aws_region

  # Use the IAM instance profile from the account level
  # This requires modifying the EC2 module to accept an instance profile name
  # instead of creating one internally
  instance_profile_name = data.terraform_remote_state.account.outputs.ec2_instance_profile_name
}

# Environment-specific domain name (if needed)
resource "aws_api_gateway_domain_name" "env_domain" {
  count = var.custom_domain_name != "" ? 1 : 0

  domain_name     = "api-${var.environment}.${var.custom_domain_name}"
  certificate_arn = var.certificate_arn

  endpoint_configuration {
    types = ["REGIONAL"]
  }

  tags = {
    Name        = "doublezero-${var.environment}-domain"
    Environment = var.environment
  }
}

# Environment-specific base path mapping (if needed)
resource "aws_api_gateway_base_path_mapping" "env_mapping" {
  count = var.custom_domain_name != "" ? 1 : 0

  api_id      = module.api_gateway.api_id
  stage_name  = var.environment
  domain_name = aws_api_gateway_domain_name.env_domain[0].domain_name
}
