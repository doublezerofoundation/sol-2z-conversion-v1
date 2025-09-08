# Outputs for Lambda Metrics API module

output "lambda_function_arn" {
  description = "ARN of the Lambda function"
  value       = aws_lambda_function.metrics_api.arn
}

output "lambda_function_name" {
  description = "Name of the Lambda function"
  value       = aws_lambda_function.metrics_api.function_name
}

output "lambda_invoke_arn" {
  description = "Invoke ARN of the Lambda function for API Gateway integration"
  value       = aws_lambda_function.metrics_api.invoke_arn
}

output "lambda_qualified_arn" {
  description = "Qualified ARN of the Lambda function including version"
  value       = aws_lambda_function.metrics_api.qualified_arn
}

output "lambda_version" {
  description = "Latest published version of the Lambda function"
  value       = aws_lambda_function.metrics_api.version
}

output "lambda_source_code_hash" {
  description = "Base64-encoded SHA256 hash of the package file"
  value       = aws_lambda_function.metrics_api.source_code_hash
}

output "lambda_source_code_size" {
  description = "Size of the function .zip file in bytes"
  value       = aws_lambda_function.metrics_api.source_code_size
}

output "lambda_role_arn" {
  description = "ARN of the IAM role attached to the Lambda function"
  value       = aws_iam_role.metrics_lambda_role.arn
}

output "cloudwatch_log_group_name" {
  description = "Name of the CloudWatch log group"
  value       = aws_cloudwatch_log_group.lambda_logs.name
}

output "cloudwatch_log_group_arn" {
  description = "ARN of the CloudWatch log group"
  value       = aws_cloudwatch_log_group.lambda_logs.arn
}

output "lambda_alias_arn" {
  description = "ARN of the Lambda alias (if created)"
  value       = var.create_alias ? aws_lambda_alias.metrics_api_alias[0].arn : null
}

output "lambda_alias_name" {
  description = "Name of the Lambda alias (if created)"
  value       = var.create_alias ? aws_lambda_alias.metrics_api_alias[0].name : null
}
