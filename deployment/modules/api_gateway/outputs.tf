# Outputs for API Gateway Module

output "api_id" {
  description = "The ID of the API Gateway"
  value       = aws_api_gateway_rest_api.this.id
}

output "api_endpoint" {
  description = "The endpoint URL of the API Gateway"
  value       = "${aws_api_gateway_deployment.this.invoke_url}${aws_api_gateway_stage.this.stage_name}"
}

output "api_arn" {
  description = "The ARN of the API Gateway"
  value       = aws_api_gateway_rest_api.this.arn
}

output "stage_id" {
  description = "The ID of the API Gateway Stage"
  value       = aws_api_gateway_stage.this.id
}

output "stage_arn" {
  description = "The ARN of the API Gateway Stage"
  value       = aws_api_gateway_stage.this.arn
}

output "stage_invoke_url" {
  description = "The invoke URL of the API Gateway Stage"
  value       = aws_api_gateway_stage.this.invoke_url
}

output "log_group_name" {
  description = "The name of the CloudWatch Log Group for API Gateway logs"
  value       = aws_cloudwatch_log_group.api_gateway.name
}

output "log_group_arn" {
  description = "The ARN of the CloudWatch Log Group for API Gateway logs"
  value       = aws_cloudwatch_log_group.api_gateway.arn
}

output "custom_domain_name" {
  description = "The custom domain name for the API Gateway"
  value       = var.custom_domain_name != "" ? aws_api_gateway_domain_name.this[0].domain_name : null
}

output "custom_domain_api_mapping_id" {
  description = "The ID of the API mapping for the custom domain"
  value       = var.custom_domain_name != "" ? aws_api_gateway_base_path_mapping.this[0].id : null
}

output "custom_domain_target_domain_name" {
  description = "The target domain name for the custom domain"
  value       = var.custom_domain_name != "" ? aws_api_gateway_domain_name.this[0].regional_domain_name : null
}

# Metrics Service Outputs
output "metrics_resource_id" {
  description = "The ID of the metrics resource"
  value       = var.enable_metrics_api ? module.metrics_service[0].metrics_resource_id : null
}

output "buys_resource_id" {
  description = "The ID of the buys resource"
  value       = var.enable_metrics_api ? module.metrics_service[0].buys_resource_id : null
}

output "dequeues_resource_id" {
  description = "The ID of the dequeues resource"
  value       = var.enable_metrics_api ? module.metrics_service[0].dequeues_resource_id : null
}
