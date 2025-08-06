# Outputs for EC2 Module

# Swap Oracle outputs 
output "swap_oracle_asg_id" {
  value = var.enable_swap_oracle_service ? module.swap_oracle_service_ec2[0].asg_id : null
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

# Indexer outputs 
output "indexer_instance_id" {
  value = var.enable_indexer_service ? module.indexer_service_ec2[0].instance_id : null
}

output "indexer_instance_arn" {
  value = var.enable_indexer_service ? module.indexer_service_ec2[0].instance_arn : null
}

output "indexer_private_ip" {
  value = var.enable_indexer_service ? module.indexer_service_ec2[0].private_ip : null
}

output "indexer_public_ip" {
  value = var.enable_indexer_service ? module.indexer_service_ec2[0].public_ip : null
}

output "indexer_instance_profile_name" {
  value = var.enable_indexer_service ? module.indexer_service_ec2[0].instance_profile_name : null
}