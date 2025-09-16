# Environment-level Terraform configuration for DoubleZero infrastructure (dev environment)

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
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
    bucket         = "doublezero-terraform-state-${var.accountId}"
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
    bucket         = "doublezero-terraform-state-${var.accountId}"
    key            = "regional/${var.aws_region}/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "doublezero-terraform-locks"
    encrypt        = true
  }
}

# Get current AWS account ID
data "aws_caller_identity" "current" {}

# Network Module - Creates network components at the environment level (NAT Gateway and Security Groups)
# Subnets are now created at the regional level
module "network" {
  source = "../modules/network"

  vpc_id             = data.terraform_remote_state.regional.outputs.vpc_id
  internet_gateway_id = data.terraform_remote_state.regional.outputs.internet_gateway_id
  public_subnet_ids  = data.terraform_remote_state.regional.outputs.public_subnet_ids
  private_subnet_ids = data.terraform_remote_state.regional.outputs.private_subnet_ids
  public_route_table_id = data.terraform_remote_state.regional.outputs.public_route_table_id
  private_route_table_id = data.terraform_remote_state.regional.outputs.private_route_table_id
  environment        = var.environment
  vpc_cidr           = var.vpc_cidr
}

module "ssm_param" {
  source     = "../modules/ssm"
  name       = "/${var.environment}/double-zero/oracle-pricing-key"
  value      = var.oracle_pricing_key
  type       = "SecureString"
  aws_region = var.aws_region
  tags = {
    Environment = "Dev"
  }
}

# Web Application Firewall (WAF) for Pricing Service
module "pricing_waf" {
  source = "../modules/waf"

  name_prefix = "pricing-service-${var.environment}"
  environment = var.environment

  # WAF configuration
  waf_default_action = var.waf_default_action
  enable_logging = var.waf_enable_logging
  log_retention_days = var.log_retention_days
}

# Web Application Firewall (WAF) for Metrics Service
module "metrics_waf" {
  source = "../modules/waf"

  name_prefix = "metrics-service-${var.environment}"
  environment = var.environment

  # WAF configuration
  waf_default_action = var.waf_default_action
  enable_logging = var.waf_enable_logging
  log_retention_days = var.log_retention_days
}

# S3 bucket for Lambda deployment artifacts


# Lambda function for Metrics Service
module "metrics_lambda" {
  source = "../modules/lambda"

  name_prefix = "doublezero-${var.environment}"
  environment = var.environment

  # S3 configuration for Lambda deployment
  s3_bucket_name = data.terraform_remote_state.regional.outputs.bucket_name
  s3_object_key = "metrics-api.zip"
  release_tag = var.release_tag
  s3_access_policy_arn = data.terraform_remote_state.regional.outputs.lambda_s3_access_policy_arn

  # Lambda configuration
  lambda_runtime = "nodejs18.x"
  lambda_handler = "metrics-api/handler.handler"
  lambda_memory_size = 256
  lambda_timeout = 30

  # Environment variables
  environment_variables = {
    ENVIRONMENT = var.environment
    LOG_LEVEL = "INFO"
  }

  # Database resources (DynamoDB tables)
  database_resources = flatten([
    module.dynamodb.all_table_arns,
    [for arn in module.dynamodb.all_table_arns : "${arn}/*"]
  ])

  # VPC configuration for Lambda
  vpc_config = {
    subnet_ids         = module.network.private_subnet_ids
    security_group_ids = [module.network.ec2_security_group_id]
  }

  # API Gateway ARN for permissions
  api_gateway_arn = "arn:aws:execute-api:${var.aws_region}:${data.aws_caller_identity.current.account_id}:*"

  # Logging configuration
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
  source = "../modules/load_balancer"

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

# API Gateway for Pricing Service
module "pricing_api_gateway" {
  source = "../modules/api_gateway"

  name_prefix = "pricing-service-${var.environment}"
  enable_pricing_service = true
  enable_metrics_api = false
  environment = var.environment
  waf_acl_arn = module.pricing_waf.web_acl_arn

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

# API Gateway for Metrics Service
module "metrics_api_gateway" {
  source = "../modules/api_gateway"

  name_prefix = "metrics-service-${var.environment}"
  enable_pricing_service = false
  enable_metrics_api = true
  environment = var.environment
  waf_acl_arn = module.metrics_waf.web_acl_arn

  # API Gateway configuration for Lambda integration
  integration_type = "LAMBDA"
  metrics_lambda_invoke_arn = module.metrics_lambda.lambda_invoke_arn

  # These are not used for Lambda integration but are required by the module
  nlb_dns_name    = ""
  connection_type = null
  connection_id   = null

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
  source = "../modules/ec2"

  environment       = var.environment
  name_prefix       = "doublezero-${var.environment}"
  private_subnets   = module.network.private_subnet_ids
  security_groups   = [module.network.ec2_security_group_id]
  target_group_arns = [module.load_balancer.target_group_arn]
  instance_type     = var.instance_type
  asg_min_size        = var.asg_min_size
  asg_max_size          = var.asg_max_size
  asg_desired_capacity  = var.asg_desired_capacity
  region            = var.aws_region
  redis_endpoint = data.terraform_remote_state.regional.outputs.redis_endpoint
  redis_port = data.terraform_remote_state.regional.outputs.redis_port
  enable_swap_oracle_service = var.enable_swap_oracle_service
  enable_indexer_service     = var.enable_indexer_service
  swap_oracle_service_image_tag = var.release_tag
  indexer_service_image_tag = var.release_tag
  skip_image_validation = var.skip_image_validation

  # Use the IAM instance profile from the account level
  instance_profile_name = data.terraform_remote_state.account.outputs.ec2_instance_profile_name
}

# Environment-specific domain names (if needed)
resource "aws_api_gateway_domain_name" "pricing_domain" {
  count = var.custom_domain_name != "" ? 1 : 0

  domain_name     = "pricing-api-${var.environment}.${var.custom_domain_name}"
  certificate_arn = var.certificate_arn

  endpoint_configuration {
    types = ["REGIONAL"]
  }

  tags = {
    Name        = "pricing-service-${var.environment}-domain"
    Environment = var.environment
  }
}

resource "aws_api_gateway_domain_name" "metrics_domain" {
  count = var.custom_domain_name != "" ? 1 : 0

  domain_name     = "metrics-api-${var.environment}.${var.custom_domain_name}"
  certificate_arn = var.certificate_arn

  endpoint_configuration {
    types = ["REGIONAL"]
  }

  tags = {
    Name        = "metrics-service-${var.environment}-domain"
    Environment = var.environment
  }
}

# Environment-specific base path mappings (if needed)
resource "aws_api_gateway_base_path_mapping" "pricing_mapping" {
  count = var.custom_domain_name != "" ? 1 : 0

  api_id      = module.pricing_api_gateway.api_id
  stage_name  = var.environment
  domain_name = aws_api_gateway_domain_name.pricing_domain[0].domain_name
}

resource "aws_api_gateway_base_path_mapping" "metrics_mapping" {
  count = var.custom_domain_name != "" ? 1 : 0

  api_id      = module.metrics_api_gateway.api_id
  stage_name  = var.environment
  domain_name = aws_api_gateway_domain_name.metrics_domain[0].domain_name
}

module "dynamodb" {
  source       = "../modules/dynamodb"
  name_prefix  = "doublezero-${var.environment}"
  environment  = var.environment
}

