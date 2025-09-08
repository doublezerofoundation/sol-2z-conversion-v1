# Outputs for S3 Lambda Deployments Module

output "bucket_name" {
  description = "Name of the S3 bucket for Lambda deployments"
  value       = aws_s3_bucket.lambda_deployments.id
}

output "bucket_arn" {
  description = "ARN of the S3 bucket for Lambda deployments"
  value       = aws_s3_bucket.lambda_deployments.arn
}

output "lambda_s3_access_policy_arn" {
  description = "ARN of the IAM policy for Lambda functions to access the bucket"
  value       = aws_iam_policy.lambda_s3_access.arn
}

output "lambda_s3_upload_policy_arn" {
  description = "ARN of the IAM policy for CI/CD to upload to the bucket"
  value       = aws_iam_policy.lambda_s3_upload.arn
}
