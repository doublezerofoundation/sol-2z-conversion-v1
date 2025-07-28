# Outputs for environment-level Terraform configuration (dev environment)

# Network Outputs
output "public_subnet_ids" {
  description = "List of public subnet IDs"
  value       = module.network.public_subnet_ids
}

output "private_subnet_ids" {
  description = "List of private subnet IDs"
  value       = module.network.private_subnet_ids
}

output "alb_security_group_id" {
  description = "ID of the security group for the Application Load Balancer"
  value       = module.network.alb_security_group_id
}

output "ec2_security_group_id" {
  description = "ID of the security group for EC2 instances"
  value       = module.network.ec2_security_group_id
}

output "api_gateway_security_group_id" {
  description = "ID of the security group for API Gateway VPC Link"
  value       = module.network.api_gateway_security_group_id
}

output "internet_gateway_id" {
  description = "ID of the Internet Gateway"
  value       = module.network.internet_gateway_id
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

output "web_acl_name" {
  description = "The name of the WAF Web ACL"
  value       = module.waf.web_acl_name
}

# EC2 Outputs
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

output "launch_template_arn" {
  description = "The ARN of the Launch Template"
  value       = module.ec2.launch_template_arn
}

# API Gateway Outputs
output "api_id" {
  description = "The ID of the API Gateway"
  value       = module.api_gateway.api_id
}

output "api_endpoint" {
  description = "The endpoint URL of the API Gateway"
  value       = module.api_gateway.api_endpoint
}

output "vpc_link_id" {
  description = "The ID of the API Gateway VPC Link"
  value       = aws_api_gateway_vpc_link.this.id
}

# Load Balancer Outputs
output "load_balancer_id" {
  description = "The ID of the Network Load Balancer"
  value       = module.load_balancer.load_balancer_id
}

output "load_balancer_arn" {
  description = "The ARN of the Network Load Balancer"
  value       = module.load_balancer.load_balancer_arn
}

output "load_balancer_dns" {
  description = "The DNS name of the Network Load Balancer"
  value       = module.load_balancer.load_balancer_dns
}

output "target_group_arn" {
  description = "The ARN of the target group"
  value       = module.load_balancer.target_group_arn
}

# Custom Domain Outputs (if configured)
output "custom_domain_name" {
  description = "The custom domain name for the API Gateway"
  value       = var.custom_domain_name != "" ? aws_api_gateway_domain_name.env_domain[0].domain_name : null
}

output "custom_domain_api_mapping_id" {
  description = "The ID of the API mapping for the custom domain"
  value       = var.custom_domain_name != "" ? aws_api_gateway_base_path_mapping.env_mapping[0].id : null
}

output "custom_domain_target_domain_name" {
  description = "The target domain name for the custom domain"
  value       = var.custom_domain_name != "" ? aws_api_gateway_domain_name.env_domain[0].regional_domain_name : null
}
