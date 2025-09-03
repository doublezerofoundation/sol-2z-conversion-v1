# Outputs for WAF Module

output "web_acl_id" {
  description = "The ID of the WAF Web ACL"
  value       = aws_wafv2_web_acl.this.id
}

output "web_acl_arn" {
  description = "The ARN of the WAF Web ACL"
  value       = aws_wafv2_web_acl.this.arn
}

output "web_acl_name" {
  description = "The name of the WAF Web ACL"
  value       = aws_wafv2_web_acl.this.name
}


output "s3_bucket_name" {
  description = "The name of the S3 bucket for WAF logs"
  value       = var.enable_logging ? aws_s3_bucket.waf_logs[0].bucket : null
}

output "s3_bucket_arn" {
  description = "The ARN of the S3 bucket for WAF logs"
  value       = var.enable_logging ? aws_s3_bucket.waf_logs[0].arn : null
}


# Keeping these for backward compatibility, but they will be null
output "log_group_name" {
  description = "The name of the CloudWatch Log Group for WAF logs (deprecated)"
  value       = null
}

output "log_group_arn" {
  description = "The ARN of the CloudWatch Log Group for WAF logs (deprecated)"
  value       = null
}
