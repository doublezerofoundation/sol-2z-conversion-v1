# Outputs for EC2 Module
output "swap_oracle_asg_id" {
  value = var.enable_swap_oracle_service ? module.swap_oracle_service_ec2[0].asg_id : null
}

output "indexer_asg_id" {
  value = var.enable_indexer_service ? module.indexer_service_ec2[0].asg_id : null
}

output "swap_oracle_asg_name" {
  value = var.enable_swap_oracle_service ? module.swap_oracle_service_ec2[0].asg_name : null
}

output "swap_oracle_asg_arn" {
  value = var.enable_swap_oracle_service ? module.swap_oracle_service_ec2[0].asg_arn : null
}

output "swap_oracle_launch_template_id" {
  value = var.enable_swap_oracle_service ? module.swap_oracle_service_ec2[0].launch_template_id : null
}

output "swap_oracle_launch_template_arn" {
  value = var.enable_swap_oracle_service ? module.swap_oracle_service_ec2[0].launch_template_arn : null
}

output "indexer_asg_name" {
  value = var.enable_indexer_service ? module.indexer_service_ec2[0].asg_name : null
}

output "indexer_asg_arn" {
  value = var.enable_indexer_service ? module.indexer_service_ec2[0].asg_arn : null
}

output "indexer_launch_template_id" {
  value = var.enable_indexer_service ? module.indexer_service_ec2[0].launch_template_id : null
}

output "indexer_launch_template_arn" {
  value = var.enable_indexer_service ? module.indexer_service_ec2[0].launch_template_arn : null
}