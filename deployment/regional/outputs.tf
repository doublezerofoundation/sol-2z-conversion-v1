# Outputs for regional-level Terraform configuration
# VPC, Internet Gateway, and Subnets are created at the regional level

# VPC Output
output "vpc_id" {
  description = "The ID of the VPC"
  value       = module.vpc.vpc_id
}

# Internet Gateway Output
output "internet_gateway_id" {
  description = "The ID of the Internet Gateway"
  value       = module.vpc.internet_gateway_id
}

# Subnet Outputs
output "public_subnet_ids" {
  description = "List of public subnet IDs"
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "List of private subnet IDs"
  value       = aws_subnet.private[*].id
}

# Route Table Outputs
output "public_route_table_id" {
  description = "ID of the public route table"
  value       = aws_route_table.public.id
}

output "private_route_table_id" {
  description = "ID of the private route table"
  value       = aws_route_table.private.id
}

# NAT Gateway Output
output "nat_gateway_id" {
  description = "ID of the NAT Gateway"
  value       = aws_nat_gateway.this.id
}

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


output "redis_endpoint" {
  description = "URL of the redis cluster"
  value       = module.redis.redis_endpoint
}

output "redis_port" {
  description = "port of the redis cluster"
  value       = module.redis.redis_port
}