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
# Pricing Service WAF
output "pricing_web_acl_id" {
  description = "The ID of the Pricing Service WAF Web ACL"
  value       = module.pricing_waf.web_acl_id
}

output "pricing_web_acl_arn" {
  description = "The ARN of the Pricing Service WAF Web ACL"
  value       = module.pricing_waf.web_acl_arn
}

output "pricing_web_acl_name" {
  description = "The name of the Pricing Service WAF Web ACL"
  value       = module.pricing_waf.web_acl_name
}

# Metrics Service WAF
output "metrics_web_acl_id" {
  description = "The ID of the Metrics Service WAF Web ACL"
  value       = module.metrics_waf.web_acl_id
}

output "metrics_web_acl_arn" {
  description = "The ARN of the Metrics Service WAF Web ACL"
  value       = module.metrics_waf.web_acl_arn
}

output "metrics_web_acl_name" {
  description = "The name of the Metrics Service WAF Web ACL"
  value       = module.metrics_waf.web_acl_name
}

# Metrics Lambda Outputs
output "metrics_lambda_function_name" {
  description = "The name of the Metrics Lambda function"
  value       = module.metrics_lambda.function_name
}

output "metrics_lambda_function_arn" {
  description = "The ARN of the Metrics Lambda function"
  value       = module.metrics_lambda.function_arn
}

output "metrics_lambda_invoke_arn" {
  description = "The invoke ARN of the Metrics Lambda function"
  value       = module.metrics_lambda.invoke_arn
}

output "metrics_lambda_role_arn" {
  description = "The ARN of the IAM role for the Metrics Lambda function"
  value       = module.metrics_lambda.role_arn
}

# EC2 Outputs

output "indexer_instance_id" {
  description = "The ID of the Indexer EC2 instance"
  value       = module.ec2.indexer_instance_id
}

output "indexer_instance_arn" {
  description = "The ARN of the Indexer EC2 instance"
  value       = module.ec2.indexer_instance_arn
}

output "indexer_private_ip" {
  description = "The private IP address of the Indexer EC2 instance"
  value       = module.ec2.indexer_private_ip
}

output "indexer_public_ip" {
  description = "The public IP address of the Indexer EC2 instance"
  value       = module.ec2.indexer_public_ip
}

output "indexer_instance_profile_name" {
  description = "The name of the IAM instance profile for the Indexer EC2 instance"
  value       = module.ec2.indexer_instance_profile_name
}

output "swap_oracle_launch_template_arn" {
  description = "The ARN of the Swap Oracle Launch Template"
  value       = module.ec2.swap_oracle_launch_template_arn
}

output "swap_oracle_asg_name" {
  description = "The name of the Swap Oracle Auto Scaling Group"
  value       = module.ec2.swap_oracle_asg_name
}

output "swap_oracle_asg_arn" {
  description = "The ARN of the Swap Oracle Auto Scaling Group"
  value       = module.ec2.swap_oracle_asg_arn
}

output "swap_oracle_launch_template_id" {
  description = "The ID of the Swap Oracle Launch Template"
  value       = module.ec2.swap_oracle_launch_template_id
}

# API Gateway Outputs
# Pricing Service API Gateway
output "pricing_api_id" {
  description = "The ID of the Pricing Service API Gateway"
  value       = module.pricing_api_gateway.api_id
}

output "pricing_api_endpoint" {
  description = "The endpoint URL of the Pricing Service API Gateway"
  value       = module.pricing_api_gateway.api_endpoint
}

# Metrics Service API Gateway
output "metrics_api_id" {
  description = "The ID of the Metrics Service API Gateway"
  value       = module.metrics_api_gateway.api_id
}

output "metrics_api_endpoint" {
  description = "The endpoint URL of the Metrics Service API Gateway"
  value       = module.metrics_api_gateway.api_endpoint
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
# Pricing Service Custom Domain
output "pricing_domain_name" {
  description = "The custom domain name for the Pricing Service API Gateway"
  value       = var.custom_domain_name != "" ? aws_api_gateway_domain_name.pricing_domain[0].domain_name : null
}

output "pricing_domain_api_mapping_id" {
  description = "The ID of the API mapping for the Pricing Service custom domain"
  value       = var.custom_domain_name != "" ? aws_api_gateway_base_path_mapping.pricing_mapping[0].id : null
}

output "pricing_domain_target_domain_name" {
  description = "The target domain name for the Pricing Service custom domain"
  value       = var.custom_domain_name != "" ? aws_api_gateway_domain_name.pricing_domain[0].regional_domain_name : null
}

# Metrics Service Custom Domain
output "metrics_domain_name" {
  description = "The custom domain name for the Metrics Service API Gateway"
  value       = var.custom_domain_name != "" ? aws_api_gateway_domain_name.metrics_domain[0].domain_name : null
}

output "metrics_domain_api_mapping_id" {
  description = "The ID of the API mapping for the Metrics Service custom domain"
  value       = var.custom_domain_name != "" ? aws_api_gateway_base_path_mapping.metrics_mapping[0].id : null
}

output "metrics_domain_target_domain_name" {
  description = "The target domain name for the Metrics Service custom domain"
  value       = var.custom_domain_name != "" ? aws_api_gateway_domain_name.metrics_domain[0].regional_domain_name : null
}
