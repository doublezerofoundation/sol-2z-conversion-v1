# S3 Bucket for Lambda Deployments
# Stores Lambda function ZIP files with versioning enabled

resource "aws_s3_bucket" "lambda_deployments" {
  bucket = "${var.name_prefix}-lambda-deployments"
  force_destroy = true


  tags = {
    Name        = "${var.name_prefix}-lambda-deployments"
    Purpose     = "Lambda function deployments"
  }
}

# Enable versioning for release management
resource "aws_s3_bucket_versioning" "lambda_deployments" {
  bucket = aws_s3_bucket.lambda_deployments.id
  versioning_configuration {
    status = "Enabled"
  }
}

# Server-side encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "lambda_deployments" {
  bucket = aws_s3_bucket.lambda_deployments.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Block public access
resource "aws_s3_bucket_public_access_block" "lambda_deployments" {
  bucket = aws_s3_bucket.lambda_deployments.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Lifecycle configuration to manage old versions
resource "aws_s3_bucket_lifecycle_configuration" "lambda_deployments" {
  depends_on = [aws_s3_bucket_versioning.lambda_deployments]
  bucket     = aws_s3_bucket.lambda_deployments.id

  rule {
    id     = "cleanup_old_versions"
    status = "Enabled"

    noncurrent_version_expiration {
      noncurrent_days = var.old_version_retention_days
    }

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}

# IAM policy for Lambda service to access the bucket
resource "aws_iam_policy" "lambda_s3_access" {
  name        = "${var.name_prefix}-lambda-s3-access"
  description = "Policy for Lambda functions to access deployment bucket"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:GetObjectVersion"
        ]
        Resource = "${aws_s3_bucket.lambda_deployments.arn}/*"
      }
    ]
  })

  tags = {
    Name        = "${var.name_prefix}-lambda-s3-access"
  }
}

# IAM policy for CI/CD to upload to the bucket
resource "aws_iam_policy" "lambda_s3_upload" {
  name        = "${var.name_prefix}-lambda-s3-upload"
  description = "Policy for CI/CD to upload Lambda deployments"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:PutObjectAcl",
          "s3:GetObject",
          "s3:GetObjectVersion",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.lambda_deployments.arn,
          "${aws_s3_bucket.lambda_deployments.arn}/*"
        ]
      }
    ]
  })

  tags = {
    Name        = "${var.name_prefix}-lambda-s3-upload"
  }
}
