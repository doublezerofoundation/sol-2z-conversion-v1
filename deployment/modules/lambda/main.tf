# Lambda Function for Metrics API
# Fetches code from S3 bucket (uploaded by indexer service build process)

# Create IAM role for Lambda execution
resource "aws_iam_role" "metrics_lambda_role" {
  name = "${var.name_prefix}-metrics-lambda-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name        = "${var.name_prefix}-metrics-lambda-role"
    Environment = var.environment
  }
}

# Attach basic Lambda execution policy
resource "aws_iam_role_policy_attachment" "lambda_basic_execution" {
  role       = aws_iam_role.metrics_lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Attach VPC execution policy if VPC is used
resource "aws_iam_role_policy_attachment" "lambda_vpc_execution" {
  count      = var.vpc_config != null ? 1 : 0
  role       = aws_iam_role.metrics_lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

# Attach S3 access policy for Lambda deployments
resource "aws_iam_role_policy_attachment" "lambda_s3_access" {
  role       = aws_iam_role.metrics_lambda_role.name
  policy_arn = var.s3_access_policy_arn
}

# IAM policy for database access
resource "aws_iam_role_policy" "lambda_db_access" {
  name = "${var.name_prefix}-metrics-lambda-db-policy"
  role = aws_iam_role.metrics_lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:Query",
          "dynamodb:Scan",
          "dynamodb:BatchGetItem"
        ]
        Resource = var.database_resources
      }
    ]
  })
}

# Get current region and account
data "aws_region" "current" {}
data "aws_caller_identity" "current" {}

# Create Lambda function
resource "aws_lambda_function" "metrics_api" {
  function_name = "${var.name_prefix}-metrics-api"
  role         = aws_iam_role.metrics_lambda_role.arn
  handler      = var.lambda_handler
  runtime      = var.lambda_runtime
  timeout      = var.lambda_timeout
  memory_size  = var.lambda_memory_size

  # Reference S3 bucket and object
  s3_bucket         = var.s3_bucket_name
  s3_key           = var.s3_object_key
  s3_object_version = var.s3_object_version != "" ? var.s3_object_version : null

  environment {
    variables = merge(
      {
        ENVIRONMENT = var.environment
        LOG_LEVEL   = var.log_level
      },
      var.environment_variables
    )
  }

  dynamic "vpc_config" {
    for_each = var.vpc_config != null ? [var.vpc_config] : []
    content {
      subnet_ids         = vpc_config.value.subnet_ids
      security_group_ids = vpc_config.value.security_group_ids
    }
  }

  depends_on = [
    aws_iam_role_policy_attachment.lambda_basic_execution,
    aws_cloudwatch_log_group.lambda_logs
  ]

  tags = {
    Name        = "${var.name_prefix}-metrics-api"
    Environment = var.environment
    Version     = var.s3_object_version != "" ? var.s3_object_version : "latest"
  }

  lifecycle {
    ignore_changes = [
      # Ignore changes to s3_object_version if not explicitly set
      # This allows for automatic updates when new versions are uploaded
      s3_object_version
    ]
  }
}

# Create CloudWatch Log Group for Lambda
resource "aws_cloudwatch_log_group" "lambda_logs" {
  name              = "/aws/lambda/${var.name_prefix}-metrics-api"
  retention_in_days = var.log_retention_days

  tags = {
    Name        = "${var.name_prefix}-metrics-lambda-logs"
    Environment = var.environment
  }
}

# Lambda permission for API Gateway
resource "aws_lambda_permission" "api_gateway_invoke" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.metrics_api.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${var.api_gateway_arn}/*/*"
}

# Lambda alias for versioning (optional)
resource "aws_lambda_alias" "metrics_api_alias" {
  count = var.create_alias ? 1 : 0
  
  name             = var.environment
  description      = "Alias for ${var.environment} environment"
  function_name    = aws_lambda_function.metrics_api.function_name
  function_version = "$LATEST"

  lifecycle {
    ignore_changes = [function_version]
  }
}
