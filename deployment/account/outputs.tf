# Outputs for account-level Terraform configuration

output "ec2_role_name" {
  description = "The name of the IAM role for EC2 instances"
  value       = aws_iam_role.ec2_role.name
}

output "ec2_role_arn" {
  description = "The ARN of the IAM role for EC2 instances"
  value       = aws_iam_role.ec2_role.arn
}

output "ec2_instance_profile_name" {
  description = "The name of the IAM instance profile for EC2 instances"
  value       = aws_iam_instance_profile.ec2_profile.name
}

output "ec2_instance_profile_arn" {
  description = "The ARN of the IAM instance profile for EC2 instances"
  value       = aws_iam_instance_profile.ec2_profile.arn
}

output "api_gateway_cloudwatch_logs_role_name" {
  description = "The name of the IAM role for API Gateway CloudWatch logs"
  value       = aws_iam_role.api_gateway_cloudwatch_logs.name
}

output "api_gateway_cloudwatch_logs_role_arn" {
  description = "The ARN of the IAM role for API Gateway CloudWatch logs"
  value       = aws_iam_role.api_gateway_cloudwatch_logs.arn
}