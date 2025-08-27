# Outputs for Metrics Service API Gateway Module

output "metrics_resource_id" {
  description = "ID of the metrics resource"
  value       = aws_api_gateway_resource.metrics.id
}

output "buys_resource_id" {
  description = "ID of the buys resource"
  value       = aws_api_gateway_resource.buys.id
}

output "dequeues_resource_id" {
  description = "ID of the dequeues resource"
  value       = aws_api_gateway_resource.dequeues.id
}
