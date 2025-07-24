# Outputs for DoubleZero infrastructure

# VPC Outputs
output "vpc_id" {
  description = "The ID of the VPC"
  value       = module.vpc.vpc_id
}

output "public_subnet_ids" {
  description = "List of public subnet IDs"
  value       = module.vpc.public_subnet_ids
}

output "private_subnet_ids" {
  description = "List of private subnet IDs"
  value       = module.vpc.private_subnet_ids
}

# WAF Outputs
output "web_acl_id" {
  description = "The ID of the WAF Web ACL"
  value       = module.waf.web_acl_id
}

output "web_acl_arn" {
  description = "The ARN of the WAF Web ACL"
  value       = module.waf.web_acl_arn
}

# API Gateway Outputs
output "api_gateway_id" {
  description = "The ID of the API Gateway"
  value       = module.api_gateway.api_id
}

output "api_gateway_endpoint" {
  description = "The endpoint URL of the API Gateway"
  value       = module.api_gateway.api_endpoint
}

# Load Balancer Outputs
output "load_balancer_dns" {
  description = "The DNS name of the load balancer"
  value       = module.load_balancer.load_balancer_dns
}

output "load_balancer_arn" {
  description = "The ARN of the load balancer"
  value       = module.load_balancer.load_balancer_arn
}

# EC2 and Auto Scaling Group Outputs
output "asg_name" {
  description = "The name of the Auto Scaling Group"
  value       = module.ec2.asg_name
}

output "asg_arn" {
  description = "The ARN of the Auto Scaling Group"
  value       = module.ec2.asg_arn
}

output "launch_template_id" {
  description = "The ID of the Launch Template"
  value       = module.ec2.launch_template_id
}