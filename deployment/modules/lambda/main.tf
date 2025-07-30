# Lambda Module for DoubleZero infrastructure

# Create IAM role for Lambda function
resource "aws_iam_role" "lambda_role" {
  name = "${var.name_prefix}-lambda-role"

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
    Name        = "${var.name_prefix}-lambda-role"
    Environment = var.environment
  }
}

# Attach basic Lambda execution policy to the role
resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Create CloudWatch Log Group for Lambda
resource "aws_cloudwatch_log_group" "lambda_logs" {
  name              = "/aws/lambda/${var.name_prefix}-function"
  retention_in_days = var.log_retention_days

  tags = {
    Name        = "${var.name_prefix}-lambda-logs"
    Environment = var.environment
  }
}

# Create a temporary file with Lambda code if no source code path is provided
resource "local_file" "lambda_code" {
  count    = var.source_code_path == "" ? 1 : 0
  filename = "${path.module}/temp_lambda_${var.name_prefix}.js"
  content  = <<-EOT
exports.handler = async (event) => {
  console.log('Event: ', JSON.stringify(event, null, 2));

  // Simple metrics response
  const response = {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify({
      message: 'Metrics data retrieved successfully',
      metrics: {
        cpu: Math.random() * 100,
        memory: Math.random() * 100,
        disk: Math.random() * 100,
        network: {
          in: Math.random() * 1000,
          out: Math.random() * 1000
        },
        timestamp: new Date().toISOString()
      }
    })
  };

  return response;
};
  EOT
}

# Create a ZIP file from the temporary file
data "archive_file" "lambda_zip" {
  count       = var.source_code_path == "" ? 1 : 0
  type        = "zip"
  source_file = local_file.lambda_code[0].filename
  output_path = "${path.module}/temp_lambda_${var.name_prefix}.zip"
  depends_on  = [local_file.lambda_code]
}

# Create Lambda function
resource "aws_lambda_function" "this" {
  function_name = "${var.name_prefix}-function"
  description   = "Lambda function for ${var.name_prefix}"
  role          = aws_iam_role.lambda_role.arn
  handler       = var.handler
  runtime       = var.runtime
  timeout       = var.timeout
  memory_size   = var.memory_size

  # Use source code path if provided, otherwise use the temporary ZIP file
  filename         = var.source_code_path != "" ? var.source_code_path : data.archive_file.lambda_zip[0].output_path
  source_code_hash = var.source_code_path != "" ? filebase64sha256(var.source_code_path) : data.archive_file.lambda_zip[0].output_base64sha256

  # Environment variables
  dynamic "environment" {
    for_each = length(var.environment_variables) > 0 ? [1] : []
    content {
      variables = var.environment_variables
    }
  }

  tags = {
    Name        = "${var.name_prefix}-function"
    Environment = var.environment
  }

  depends_on = [
    aws_cloudwatch_log_group.lambda_logs
  ]
}

# Grant API Gateway permission to invoke the Lambda function
resource "aws_lambda_permission" "api_gateway" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.this.function_name
  principal     = "apigateway.amazonaws.com"

  # Allow invocation from any stage of the API Gateway
  source_arn = "${var.api_gateway_execution_arn}/*/*"
}
