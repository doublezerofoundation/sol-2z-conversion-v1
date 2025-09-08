# Outputs for Network Module

output "public_subnet_ids" {
  description = "List of public subnet IDs"
  value       = var.public_subnet_ids
}

output "private_subnet_ids" {
  description = "List of private subnet IDs"
  value       = var.private_subnet_ids
}

output "alb_security_group_id" {
  description = "ID of the security group for the Application Load Balancer"
  value       = aws_security_group.alb.id
}

output "ec2_security_group_id" {
  description = "ID of the security group for EC2 instances"
  value       = aws_security_group.ec2.id
}

output "api_gateway_security_group_id" {
  description = "ID of the security group for API Gateway VPC Link"
  value       = aws_security_group.api_gateway.id
}

output "internet_gateway_id" {
  description = "ID of the Internet Gateway"
  value       = var.internet_gateway_id
}

output "public_route_table_id" {
  description = "ID of the public route table"
  value       = var.public_route_table_id
}

output "private_route_table_id" {
  description = "ID of the private route table"
  value       = var.private_route_table_id
}
