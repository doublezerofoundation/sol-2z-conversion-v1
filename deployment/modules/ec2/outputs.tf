# Outputs for EC2 Module
output "swap_oracle_asg_id" {
  value = var.enable_swap_oracle_service ? module.swap_oracle_service[0].asg_id : null
}

output "indexer_asg_id" {
  value = var.enable_indexer_service ? module.indexer_service[0].asg_id : null
}