# ECR Outputs
output "ecr_repository_url" {
  description = "URL of the ECR repository"
  value       = module.ecr.ecr_repository_url
}

output "ecr_repository_arn" {
  description = "ARN of the ECR repository"
  value       = module.ecr.ecr_repository_arn
}

output "ecr_repository_name" {
  description = "Name of the ECR repository"
  value       = module.ecr.ecr_repository_name
}

output "ecr_registry_id" {
  description = "Registry ID of the ECR repository"
  value       = module.ecr.ecr_registry_id
}
