# Metrics Service API Module for DoubleZero
# Creates API Gateway resources for /metrics/buys, /metrics/errors, and /metrics/dequeues endpoints

# Create 'metrics' resource under 'api/v1'
resource "aws_api_gateway_resource" "metrics" {
  rest_api_id = var.api_id
  parent_id   = var.parent_id
  path_part   = "metrics"
}

# ========================================
# /metrics/buys endpoint
# ========================================

# Create 'buys' resource under 'metrics'
resource "aws_api_gateway_resource" "buys" {
  rest_api_id = var.api_id
  parent_id   = aws_api_gateway_resource.metrics.id
  path_part   = "buys"
}

# Create GET method for buys endpoint
resource "aws_api_gateway_method" "buys_get" {
  rest_api_id   = var.api_id
  resource_id   = aws_api_gateway_resource.buys.id
  http_method   = "GET"
  authorization = "NONE"
  api_key_required = true

  request_parameters = {
    "method.request.querystring.from" = true
    "method.request.querystring.to"   = true
  }
}

# Create integration for buys GET method
resource "aws_api_gateway_integration" "buys_get" {
  rest_api_id = var.api_id
  resource_id = aws_api_gateway_resource.buys.id
  http_method = aws_api_gateway_method.buys_get.http_method

  integration_http_method = "POST"  # Lambda always uses POST
  type                    = "AWS_PROXY"
  uri                     = var.lambda_invoke_arn

  # No connection settings needed for Lambda
}

# Create OPTIONS method for CORS preflight requests (buys)
resource "aws_api_gateway_method" "buys_options" {
  rest_api_id   = var.api_id
  resource_id   = aws_api_gateway_resource.buys.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

# Create integration for OPTIONS method (CORS) (buys)
resource "aws_api_gateway_integration" "buys_options" {
  rest_api_id = var.api_id
  resource_id = aws_api_gateway_resource.buys.id
  http_method = aws_api_gateway_method.buys_options.http_method

  type = "MOCK"
  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

# Add method response for OPTIONS (buys)
resource "aws_api_gateway_method_response" "buys_options_200" {
  rest_api_id = var.api_id
  resource_id = aws_api_gateway_resource.buys.id
  http_method = aws_api_gateway_method.buys_options.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

# Add integration response for OPTIONS (buys)
resource "aws_api_gateway_integration_response" "buys_options_200" {
  rest_api_id = var.api_id
  resource_id = aws_api_gateway_resource.buys.id
  http_method = aws_api_gateway_method.buys_options.http_method
  status_code = aws_api_gateway_method_response.buys_options_200.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }

  depends_on = [
    aws_api_gateway_integration.buys_options
  ]
}

# ========================================
# /metrics/errors endpoint
# ========================================

# Create 'errors' resource under 'metrics'
resource "aws_api_gateway_resource" "errors" {
  rest_api_id = var.api_id
  parent_id   = aws_api_gateway_resource.metrics.id
  path_part   = "errors"
}

# Create GET method for errors endpoint
resource "aws_api_gateway_method" "errors_get" {
  rest_api_id   = var.api_id
  resource_id   = aws_api_gateway_resource.errors.id
  http_method   = "GET"
  authorization = "NONE"
  api_key_required = true

  request_parameters = {
    "method.request.querystring.from" = true
    "method.request.querystring.to"   = true
  }
}

# Create integration for errors GET method
resource "aws_api_gateway_integration" "errors_get" {
  rest_api_id = var.api_id
  resource_id = aws_api_gateway_resource.errors.id
  http_method = aws_api_gateway_method.errors_get.http_method

  integration_http_method = "POST"  # Lambda always uses POST
  type                    = "AWS_PROXY"
  uri                     = var.lambda_invoke_arn

  # No connection settings needed for Lambda
}

# Create OPTIONS method for CORS preflight requests (errors)
resource "aws_api_gateway_method" "errors_options" {
  rest_api_id   = var.api_id
  resource_id   = aws_api_gateway_resource.errors.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

# Create integration for OPTIONS method (CORS) (errors)
resource "aws_api_gateway_integration" "errors_options" {
  rest_api_id = var.api_id
  resource_id = aws_api_gateway_resource.errors.id
  http_method = aws_api_gateway_method.errors_options.http_method

  type = "MOCK"
  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

# Add method response for OPTIONS (errors)
resource "aws_api_gateway_method_response" "errors_options_200" {
  rest_api_id = var.api_id
  resource_id = aws_api_gateway_resource.errors.id
  http_method = aws_api_gateway_method.errors_options.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

# Add integration response for OPTIONS (errors)
resource "aws_api_gateway_integration_response" "errors_options_200" {
  rest_api_id = var.api_id
  resource_id = aws_api_gateway_resource.errors.id
  http_method = aws_api_gateway_method.errors_options.http_method
  status_code = aws_api_gateway_method_response.errors_options_200.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }

  depends_on = [
    aws_api_gateway_integration.errors_options
  ]
}

# ========================================
# /metrics/dequeues endpoint
# ========================================

# Create 'dequeues' resource under 'metrics'
resource "aws_api_gateway_resource" "dequeues" {
  rest_api_id = var.api_id
  parent_id   = aws_api_gateway_resource.metrics.id
  path_part   = "dequeues"
}

# Create GET method for dequeues endpoint
resource "aws_api_gateway_method" "dequeues_get" {
  rest_api_id   = var.api_id
  resource_id   = aws_api_gateway_resource.dequeues.id
  http_method   = "GET"
  authorization = "NONE"
  api_key_required = true

  request_parameters = {
    "method.request.querystring.from" = true
    "method.request.querystring.to"   = true
  }
}

# Create integration for dequeues GET method
resource "aws_api_gateway_integration" "dequeues_get" {
  rest_api_id = var.api_id
  resource_id = aws_api_gateway_resource.dequeues.id
  http_method = aws_api_gateway_method.dequeues_get.http_method

  integration_http_method = "POST"  # Lambda always uses POST
  type                    = "AWS_PROXY"
  uri                     = var.lambda_invoke_arn

  # No connection settings needed for Lambda
}

# Create OPTIONS method for CORS preflight requests (dequeues)
resource "aws_api_gateway_method" "dequeues_options" {
  rest_api_id   = var.api_id
  resource_id   = aws_api_gateway_resource.dequeues.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

# Create integration for OPTIONS method (CORS) (dequeues)
resource "aws_api_gateway_integration" "dequeues_options" {
  rest_api_id = var.api_id
  resource_id = aws_api_gateway_resource.dequeues.id
  http_method = aws_api_gateway_method.dequeues_options.http_method

  type = "MOCK"
  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

# Add method response for OPTIONS (dequeues)
resource "aws_api_gateway_method_response" "dequeues_options_200" {
  rest_api_id = var.api_id
  resource_id = aws_api_gateway_resource.dequeues.id
  http_method = aws_api_gateway_method.dequeues_options.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

# Add integration response for OPTIONS (dequeues)
resource "aws_api_gateway_integration_response" "dequeues_options_200" {
  rest_api_id = var.api_id
  resource_id = aws_api_gateway_resource.dequeues.id
  http_method = aws_api_gateway_method.dequeues_options.http_method
  status_code = aws_api_gateway_method_response.dequeues_options_200.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }

  depends_on = [
    aws_api_gateway_integration.dequeues_options
  ]
}
