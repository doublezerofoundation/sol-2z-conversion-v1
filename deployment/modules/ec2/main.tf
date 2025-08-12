# EC2 Module for DoubleZero infrastructure

module "swap_oracle_service_ec2" {
  source            = "./modules/swap_oracle_service"
  count             = var.enable_swap_oracle_service ? 1 : 0

  name_prefix       = var.name_prefix
  environment       = var.environment
  region            = var.region
  private_subnets   = var.private_subnets
  security_groups   = var.security_groups
  target_group_arns = var.target_group_arns
  redis_endpoint    = var.redis_endpoint
  instance_profile_name = var.instance_profile_name
  swap_oracle_service_image_tag = var.swap_oracle_service_image_tag
}

module "indexer_service_ec2" {
  source            = "./modules/indexer_service"
  count             = var.enable_indexer_service ? 1 : 0

  name_prefix       = var.name_prefix
  environment       = var.environment
  region            = var.region
  private_subnets   = var.private_subnets
  security_groups   = var.security_groups
  target_group_arns = var.target_group_arns
  instance_profile_name = var.instance_profile_name
}
