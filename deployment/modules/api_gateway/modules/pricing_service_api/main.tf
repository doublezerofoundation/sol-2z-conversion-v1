
# Create 'swap-rate' resource under 'api/v1'
resource "aws_api_gateway_resource" "swap_rate" {
  rest_api_id = var.api_id
  parent_id   = var.parent_id
  path_part   = "swap-rate"
}

# Create GET method for swap-rate endpoint
resource "aws_api_gateway_method" "swap_rate_get" {
  rest_api_id   = var.api_id
  resource_id   = aws_api_gateway_resource.swap_rate.id
  http_method   = "GET"
  authorization = "NONE"
}

# Create integration for swap-rate GET method
resource "aws_api_gateway_integration" "swap_rate_get" {
  rest_api_id = var.api_id
  resource_id = aws_api_gateway_resource.swap_rate.id
  http_method = aws_api_gateway_method.swap_rate_get.http_method

  integration_http_method = "ANY"
  type                    = "HTTP_PROXY"
  uri                     = "http://${var.nlb_dns_name}/api/v1/swap-rate"
  connection_type = var.connection_type
  connection_id   = var.connection_id
}


# Create OPTIONS method for CORS preflight requests
resource "aws_api_gateway_method" "swap_rate_options" {
  rest_api_id   = var.api_id
  resource_id   = aws_api_gateway_resource.swap_rate.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

# Create integration for OPTIONS method (CORS)
resource "aws_api_gateway_integration" "swap_rate_options" {
  rest_api_id = var.api_id
  resource_id = aws_api_gateway_resource.swap_rate.id
  http_method = aws_api_gateway_method.swap_rate_options.http_method

  type = "MOCK"
  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

# Add method response for OPTIONS
resource "aws_api_gateway_method_response" "swap_rate_options_200" {
  rest_api_id = var.api_id
  resource_id = aws_api_gateway_resource.swap_rate.id
  http_method = aws_api_gateway_method.swap_rate_options.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}




# Create 'health' resource under 'api/v1'
resource "aws_api_gateway_resource" "health" {
  rest_api_id = var.api_id
  parent_id   = var.parent_id
  path_part   = "health"
}

# Create GET method for health endpoint
resource "aws_api_gateway_method" "health_get" {
  rest_api_id   = var.api_id
  resource_id   = aws_api_gateway_resource.health.id
  http_method   = "GET"
  authorization = "NONE"
}

# Create integration for health GET method
resource "aws_api_gateway_integration" "health_get" {
  rest_api_id = var.api_id
  resource_id = aws_api_gateway_resource.health.id
  http_method = aws_api_gateway_method.health_get.http_method

  integration_http_method = "ANY"
  type                    = "HTTP_PROXY"
  uri                     = "http://${var.nlb_dns_name}/api/v1/health"

  connection_type = var.connection_type
  connection_id   = var.connection_id
}



# Create OPTIONS method for CORS preflight requests
resource "aws_api_gateway_method" "health_options" {
  rest_api_id   = var.api_id
  resource_id   = aws_api_gateway_resource.health.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

# Create integration for OPTIONS method (CORS)
resource "aws_api_gateway_integration" "health_options" {
  rest_api_id = var.api_id
  resource_id = aws_api_gateway_resource.health.id
  http_method = aws_api_gateway_method.health_options.http_method

  type = "MOCK"
  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

# Add method response for OPTIONS
resource "aws_api_gateway_method_response" "health_options_200" {
  rest_api_id = var.api_id
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
  rest_api_id = var.api_id
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

