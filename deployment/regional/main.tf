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
    key            = "regional/test/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "doublezero-terraform-locks"
    encrypt        = true
  }
}

module "ssm_param" {
  source = "./modules/ssm"
  name   = "/ml/oracle-pricing-key"
  value  = var.oracle_pricing_key
  type   = "SecureString"
  tags = {
    Environment = "Dev"
  }
}

module "ecr" {
  source = "./modules/ecr"
  ecr_repository_name       = var.ecr_repository_name
  ecr_image_tag_mutability  = var.ecr_image_tag_mutability
  ecr_scan_on_push          = var.ecr_scan_on_push
  ecr_encryption_type       = var.ecr_encryption_type
  ecr_kms_key_arn          = var.ecr_kms_key_arn
  ecr_tags                 = var.ecr_tags
}
