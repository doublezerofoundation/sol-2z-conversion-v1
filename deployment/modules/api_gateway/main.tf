# API Gateway Module for DoubleZero infrastructure

# Create REST API Gateway
resource "aws_api_gateway_rest_api" "this" {
  name        = "${var.name_prefix}-api"
  description = "REST API Gateway for DoubleZero ${var.environment} environment"

  endpoint_configuration {
    types = ["REGIONAL"]
  }

  tags = {
    Name        = "${var.name_prefix}-api"
    Environment = var.environment
  }
}

# Create a resource for the root path
resource "aws_api_gateway_resource" "proxy" {
  rest_api_id = aws_api_gateway_rest_api.this.id
  parent_id   = aws_api_gateway_rest_api.this.root_resource_id
  path_part   = "{proxy+}"
}

# Create a method for the proxy resource
resource "aws_api_gateway_method" "proxy" {
  rest_api_id   = aws_api_gateway_rest_api.this.id
  resource_id   = aws_api_gateway_resource.proxy.id
  http_method   = "ANY"
  authorization = "NONE"

  request_parameters = {
    "method.request.path.proxy" = true
  }
}

# Create default integration for API Gateway
resource "aws_api_gateway_integration" "default" {
  rest_api_id = aws_api_gateway_rest_api.this.id
  resource_id = aws_api_gateway_resource.proxy.id
  http_method = aws_api_gateway_method.proxy.http_method

  # Conditional configuration based on integration type
  integration_http_method = var.integration_type == "LAMBDA" ? "POST" : "ANY"
  type                    = var.integration_type == "LAMBDA" ? "AWS_PROXY" : "HTTP"
  uri                     = var.integration_type == "LAMBDA" ? var.lambda_invoke_arn : "http://${var.nlb_dns_name}/{method.request.path.proxy}"

  # Connection settings only apply to HTTP integration
  connection_type = var.integration_type == "LAMBDA" ? null : var.connection_type
  connection_id   = var.integration_type == "LAMBDA" ? null : var.connection_id

  # Request parameters only apply to HTTP integration
  request_parameters = var.integration_type == "LAMBDA" ? null : {
    "integration.request.path.proxy" = "method.request.path.proxy"
  }
}

# Create a method for the root resource
resource "aws_api_gateway_method" "root" {
  rest_api_id   = aws_api_gateway_rest_api.this.id
  resource_id   = aws_api_gateway_rest_api.this.root_resource_id
  http_method   = "ANY"
  authorization = "NONE"
}

# Create integration for the root resource
resource "aws_api_gateway_integration" "root" {
  rest_api_id = aws_api_gateway_rest_api.this.id
  resource_id = aws_api_gateway_rest_api.this.root_resource_id
  http_method = aws_api_gateway_method.root.http_method

  # Conditional configuration based on integration type
  integration_http_method = var.integration_type == "LAMBDA" ? "POST" : "ANY"
  type                    = var.integration_type == "LAMBDA" ? "AWS_PROXY" : "HTTP"
  uri                     = var.integration_type == "LAMBDA" ? var.lambda_invoke_arn : "http://${var.nlb_dns_name}/"

  # Connection settings only apply to HTTP integration
  connection_type = var.integration_type == "LAMBDA" ? null : var.connection_type
  connection_id   = var.integration_type == "LAMBDA" ? null : var.connection_id
}

# Enable CORS for the proxy resource
resource "aws_api_gateway_method_response" "proxy_options" {
  rest_api_id = aws_api_gateway_rest_api.this.id
  resource_id = aws_api_gateway_resource.proxy.id
  http_method = aws_api_gateway_method.proxy.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

# Create 'api' resource
resource "aws_api_gateway_resource" "api" {
  rest_api_id = aws_api_gateway_rest_api.this.id
  parent_id   = aws_api_gateway_rest_api.this.root_resource_id
  path_part   = "api"
}

# Create 'v1' resource under 'api'
resource "aws_api_gateway_resource" "v1" {
  rest_api_id = aws_api_gateway_rest_api.this.id
  parent_id   = aws_api_gateway_resource.api.id
  path_part   = "v1"
}

# Create 'swap-rate' resource under 'api/v1'
resource "aws_api_gateway_resource" "swap_rate" {
  rest_api_id = aws_api_gateway_rest_api.this.id
  parent_id   = aws_api_gateway_resource.v1.id
  path_part   = "swap-rate"
}

# Create GET method for swap-rate endpoint
resource "aws_api_gateway_method" "swap_rate_get" {
  rest_api_id   = aws_api_gateway_rest_api.this.id
  resource_id   = aws_api_gateway_resource.swap_rate.id
  http_method   = "GET"
  authorization = "NONE"
}

# Create integration for swap-rate GET method
resource "aws_api_gateway_integration" "swap_rate_get" {
  rest_api_id = aws_api_gateway_rest_api.this.id
  resource_id = aws_api_gateway_resource.swap_rate.id
  http_method = aws_api_gateway_method.swap_rate_get.http_method

  integration_http_method = "GET"
  type                    = "HTTP"
  uri                     = "http://${var.nlb_dns_name}/api/v1/swap-rate"

  connection_type = var.connection_type
  connection_id   = var.connection_id
}

# Add method response for swap-rate GET
resource "aws_api_gateway_method_response" "swap_rate_get_200" {
  rest_api_id = aws_api_gateway_rest_api.this.id
  resource_id = aws_api_gateway_resource.swap_rate.id
  http_method = aws_api_gateway_method.swap_rate_get.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

# Add integration response for swap-rate GET
resource "aws_api_gateway_integration_response" "swap_rate_get_200" {
  rest_api_id = aws_api_gateway_rest_api.this.id
  resource_id = aws_api_gateway_resource.swap_rate.id
  http_method = aws_api_gateway_method.swap_rate_get.http_method
  status_code = aws_api_gateway_method_response.swap_rate_get_200.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }

  depends_on = [
    aws_api_gateway_integration.swap_rate_get
  ]
}

# Create OPTIONS method for CORS preflight requests
resource "aws_api_gateway_method" "swap_rate_options" {
  rest_api_id   = aws_api_gateway_rest_api.this.id
  resource_id   = aws_api_gateway_resource.swap_rate.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

# Create integration for OPTIONS method (CORS)
resource "aws_api_gateway_integration" "swap_rate_options" {
  rest_api_id = aws_api_gateway_rest_api.this.id
  resource_id = aws_api_gateway_resource.swap_rate.id
  http_method = aws_api_gateway_method.swap_rate_options.http_method

  type = "MOCK"
  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

# Add method response for OPTIONS
resource "aws_api_gateway_method_response" "swap_rate_options_200" {
  rest_api_id = aws_api_gateway_rest_api.this.id
  resource_id = aws_api_gateway_resource.swap_rate.id
  http_method = aws_api_gateway_method.swap_rate_options.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

# Add integration response for OPTIONS
resource "aws_api_gateway_integration_response" "swap_rate_options_200" {
  rest_api_id = aws_api_gateway_rest_api.this.id
  resource_id = aws_api_gateway_resource.swap_rate.id
  http_method = aws_api_gateway_method.swap_rate_options.http_method
  status_code = aws_api_gateway_method_response.swap_rate_options_200.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }

  depends_on = [
    aws_api_gateway_integration.swap_rate_options
  ]
}




# Create 'health' resource under 'api/v1'
resource "aws_api_gateway_resource" "health" {
  rest_api_id = aws_api_gateway_rest_api.this.id
  parent_id   = aws_api_gateway_resource.v1.id
  path_part   = "health"
}

# Create GET method for health endpoint
resource "aws_api_gateway_method" "health_get" {
  rest_api_id   = aws_api_gateway_rest_api.this.id
  resource_id   = aws_api_gateway_resource.health.id
  http_method   = "GET"
  authorization = "NONE"
}

# Create integration for health GET method
resource "aws_api_gateway_integration" "health_get" {
  rest_api_id = aws_api_gateway_rest_api.this.id
  resource_id = aws_api_gateway_resource.health.id
  http_method = aws_api_gateway_method.health_get.http_method

  integration_http_method = "GET"
  type                    = "HTTP"
  uri                     = "http://${var.nlb_dns_name}/api/v1/health"

  connection_type = var.connection_type
  connection_id   = var.connection_id
}

# Add method response for health GET
resource "aws_api_gateway_method_response" "health_get_200" {
  rest_api_id = aws_api_gateway_rest_api.this.id
  resource_id = aws_api_gateway_resource.health.id
  http_method = aws_api_gateway_method.health_get.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

# Add integration response for health GET
resource "aws_api_gateway_integration_response" "health_get_200" {
  rest_api_id = aws_api_gateway_rest_api.this.id
  resource_id = aws_api_gateway_resource.health.id
  http_method = aws_api_gateway_method.health_get.http_method
  status_code = aws_api_gateway_method_response.health_get_200.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }

  depends_on = [
    aws_api_gateway_integration.health_get
  ]
}

# Create OPTIONS method for CORS preflight requests
resource "aws_api_gateway_method" "health_options" {
  rest_api_id   = aws_api_gateway_rest_api.this.id
  resource_id   = aws_api_gateway_resource.health.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

# Create integration for OPTIONS method (CORS)
resource "aws_api_gateway_integration" "health_options" {
  rest_api_id = aws_api_gateway_rest_api.this.id
  resource_id = aws_api_gateway_resource.health.id
  http_method = aws_api_gateway_method.health_options.http_method

  type = "MOCK"
  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

# Add method response for OPTIONS
resource "aws_api_gateway_method_response" "health_options_200" {
  rest_api_id = aws_api_gateway_rest_api.this.id
  resource_id = aws_api_gateway_resource.health.id
  http_method = aws_api_gateway_method.health_options.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

# Add integration response for OPTIONS
resource "aws_api_gateway_integration_response" "health_options_200" {
  rest_api_id = aws_api_gateway_rest_api.this.id
  resource_id = aws_api_gateway_resource.health.id
  http_method = aws_api_gateway_method.health_options.http_method
  status_code = aws_api_gateway_method_response.health_options_200.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }

  depends_on = [
    aws_api_gateway_integration.swap_rate_options
  ]
}
# Create CloudWatch Log Group for API Gateway
resource "aws_cloudwatch_log_group" "api_gateway" {
  name              = "/aws/apigateway/${var.name_prefix}-api-${var.environment}"
  retention_in_days = var.log_retention_days

  tags = {
    Name        = "${var.name_prefix}-api-logs"
    Environment = var.environment
  }
}

# Create API Gateway Deployment
resource "aws_api_gateway_deployment" "this" {
  rest_api_id = aws_api_gateway_rest_api.this.id

  triggers = {
    # NOTE: The configuration below will satisfy ordering considerations,
    # but not pick up all future REST API changes. More advanced patterns
    # are possible, such as using the filesha1() function against the
    # Terraform configuration files.
    redeployment = sha1(jsonencode([
      aws_api_gateway_resource.proxy.id,
      aws_api_gateway_method.proxy.id,
      aws_api_gateway_integration.default.id,
      aws_api_gateway_method.root.id,
      aws_api_gateway_integration.root.id,
    ]))
  }

  lifecycle {
    create_before_destroy = true
  }

  depends_on = [
    aws_api_gateway_method.proxy,
    aws_api_gateway_integration.default,
    aws_api_gateway_method.root,
    aws_api_gateway_integration.root,
  ]
}

# Create IAM role for API Gateway CloudWatch Logs
resource "aws_iam_role" "api_gateway_cloudwatch_logs" {
  name = "${var.name_prefix}-api-gateway-logs-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "apigateway.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name        = "${var.name_prefix}-api-gateway-logs-role"
    Environment = var.environment
  }
}

# Attach CloudWatch Logs policy to the IAM role
resource "aws_iam_role_policy_attachment" "api_gateway_cloudwatch_logs" {
  role       = aws_iam_role.api_gateway_cloudwatch_logs.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonAPIGatewayPushToCloudWatchLogs"
}

# Set up API Gateway account settings with CloudWatch Logs role
resource "aws_api_gateway_account" "this" {
  cloudwatch_role_arn = aws_iam_role.api_gateway_cloudwatch_logs.arn

  depends_on = [
    aws_iam_role_policy_attachment.api_gateway_cloudwatch_logs
  ]
}

# Create API Gateway Stage
resource "aws_api_gateway_stage" "this" {
  deployment_id = aws_api_gateway_deployment.this.id
  rest_api_id   = aws_api_gateway_rest_api.this.id
  stage_name    = var.environment

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api_gateway.arn
    format = jsonencode({
      requestId      = "$context.requestId"
      ip             = "$context.identity.sourceIp"
      requestTime    = "$context.requestTime"
      httpMethod     = "$context.httpMethod"
      resourcePath   = "$context.resourcePath"
      status         = "$context.status"
      protocol       = "$context.protocol"
      responseLength = "$context.responseLength"
      integrationLatency = "$context.integrationLatency"
      responseLatency = "$context.responseLatency"
    })
  }

  tags = {
    Name        = "${var.name_prefix}-stage-${var.environment}"
    Environment = var.environment
  }

  depends_on = [aws_cloudwatch_log_group.api_gateway, aws_cloudwatch_log_group.api_gateway]
}

# Create method settings for throttling
resource "aws_api_gateway_method_settings" "all" {
  rest_api_id = aws_api_gateway_rest_api.this.id
  stage_name  = aws_api_gateway_stage.this.stage_name
  method_path = "*/*"

  settings {
    metrics_enabled = true
    logging_level   = "INFO"
    throttling_burst_limit = var.throttling_burst_limit
    throttling_rate_limit  = var.throttling_rate_limit
  }
}

# Associate WAF with API Gateway
resource "aws_wafv2_web_acl_association" "this" {
  resource_arn = "arn:aws:apigateway:${data.aws_region.current.name}::/restapis/${aws_api_gateway_rest_api.this.id}/stages/${aws_api_gateway_stage.this.stage_name}"
  web_acl_arn  = var.waf_acl_arn
}

# Get current region
data "aws_region" "current" {}

# Create API Gateway Domain Name (if custom domain is provided)
resource "aws_api_gateway_domain_name" "this" {
  count = var.custom_domain_name != "" ? 1 : 0

  domain_name     = var.custom_domain_name
  certificate_arn = var.certificate_arn
  endpoint_configuration {
    types = ["REGIONAL"]
  }

  tags = {
    Name        = "${var.name_prefix}-domain"
    Environment = var.environment
  }
}

# Create API Gateway Base Path Mapping (if custom domain is provided)
resource "aws_api_gateway_base_path_mapping" "this" {
  count = var.custom_domain_name != "" ? 1 : 0

  api_id      = aws_api_gateway_rest_api.this.id
  stage_name  = aws_api_gateway_stage.this.stage_name
  domain_name = aws_api_gateway_domain_name.this[0].domain_name
}
