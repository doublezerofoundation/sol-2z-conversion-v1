# Regional-level Terraform configuration for DoubleZero infrastructure
# VPC, Internet Gateway, and Subnets are created at the regional level

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
      Region      = var.aws_region
      ManagedBy   = "Terraform"
    }
  }
}


data "aws_availability_zones" "available" {
  state = "available"
}

locals {
  availability_zones = slice(data.aws_availability_zones.available.names, 0, 2)
  public_subnet_cidrs  = [for i, az in local.availability_zones : cidrsubnet(var.vpc_cidr, 8, i + 1)]
  private_subnet_cidrs = [for i, az in local.availability_zones : cidrsubnet(var.vpc_cidr, 8, i + 11)]
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

# VPC Module - VPC and Internet Gateway are created at the regional level
module "vpc" {
  source = "../modules/vpc"

  vpc_cidr = var.vpc_cidr
  name_prefix = var.name_prefix
}

# Create public subnets
resource "aws_subnet" "public" {
  count             = length(local.public_subnet_cidrs)
  vpc_id            = module.vpc.vpc_id
  cidr_block        = local.public_subnet_cidrs[count.index]
  availability_zone = local.availability_zones[count.index % length(local.availability_zones)]
  map_public_ip_on_launch = true

  tags = {
    Name = "${var.name_prefix}-public-subnet-${count.index + 1}"
  }
}

# Create private subnets
resource "aws_subnet" "private" {
  count             = length(local.private_subnet_cidrs)
  vpc_id            = module.vpc.vpc_id
  cidr_block        = local.private_subnet_cidrs[count.index]
  availability_zone = local.availability_zones[count.index % length(local.availability_zones)]

  tags = {
    Name = "${var.name_prefix}-private-subnet-${count.index + 1}"
  }
}

# Create route table for public subnets
resource "aws_route_table" "public" {
  vpc_id = module.vpc.vpc_id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = module.vpc.internet_gateway_id
  }

  tags = {
    Name = "${var.name_prefix}-public-route-table"
  }
}

# Associate public subnets with public route table
resource "aws_route_table_association" "public" {
  count          = length(aws_subnet.public)
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# Create NAT Gateway for private subnets
resource "aws_eip" "nat" {
  domain = "vpc"

  tags = {
    Name = "${var.name_prefix}-nat-eip"
  }
}

resource "aws_nat_gateway" "this" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.public[0].id

  tags = {
    Name = "${var.name_prefix}-nat-gateway"
  }

  # Ensure the Internet Gateway exists before creating the NAT Gateway
  depends_on = [module.vpc]
}

# Create route table for private subnets
resource "aws_route_table" "private" {
  vpc_id = module.vpc.vpc_id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.this.id
  }

  tags = {
    Name = "${var.name_prefix}-private-route-table"
  }
}

# Associate private subnets with private route table
resource "aws_route_table_association" "private" {
  count          = length(aws_subnet.private)
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private.id
}

module "pricing_ecr" {
  source = "../modules/ecr"
  ecr_repository_name       = "double-zero-oracle-pricing-service"
  ecr_image_tag_mutability  = var.ecr_image_tag_mutability
  ecr_scan_on_push          = var.ecr_scan_on_push
  ecr_encryption_type       = var.ecr_encryption_type
  ecr_kms_key_arn          = var.ecr_kms_key_arn
  ecr_tags                 = var.ecr_tags
}

module "indexer_ecr" {
  source = "../modules/ecr"
  ecr_repository_name       = "double-zero-indexer-service"
  ecr_image_tag_mutability  = var.ecr_image_tag_mutability
  ecr_scan_on_push          = var.ecr_scan_on_push
  ecr_encryption_type       = var.ecr_encryption_type
  ecr_kms_key_arn          = var.ecr_kms_key_arn
  ecr_tags                 = var.ecr_tags
}

module "redis" {
  source = "../modules/redis"
  name_prefix         = var.name_prefix
  vpc_id             = module.vpc.vpc_id
  subnet_ids         = aws_subnet.private[*].id
  allowed_cidr_blocks = local.private_subnet_cidrs
  node_type          = "cache.t3.micro"
  num_cache_clusters = 1

  tags = var.redis_tags
}

module "s3" {
  source = "../modules/s3"
  name_prefix = "doublezero-${var.aws_region}-${var.accountId}"
}
