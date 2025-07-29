# Account-level Terraform configuration for DoubleZero infrastructure

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Backend configuration for account-level state
  backend "s3" {
    bucket         = "doublezero-terraform-state-bucket"
    key            = "account/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "doublezero-terraform-locks"
    encrypt        = true
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "DoubleZero"
      ManagedBy   = "Terraform"
    }
  }
}

# EC2 IAM Role and Policies
resource "aws_iam_role" "ec2_role" {
  name = "doublezero-ec2-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name = "doublezero-ec2-role"
  }
}

# Create IAM instance profile
resource "aws_iam_instance_profile" "ec2_profile" {
  name = "doublezero-ec2-profile"
  role = aws_iam_role.ec2_role.name
}

# Attach policies to EC2 IAM role
resource "aws_iam_role_policy_attachment" "ssm_policy" {
  role       = aws_iam_role.ec2_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_role_policy_attachment" "cloudwatch_policy" {
  role       = aws_iam_role.ec2_role.name
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy"
}

# API Gateway CloudWatch Logs IAM Role
resource "aws_iam_role" "api_gateway_cloudwatch_logs" {
  name = "doublezero-api-gateway-logs-role"

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
    Name = "doublezero-api-gateway-logs-role"
  }
}

# Attach CloudWatch Logs policy to the API Gateway IAM role
resource "aws_iam_role_policy_attachment" "api_gateway_cloudwatch_logs" {
  role       = aws_iam_role.api_gateway_cloudwatch_logs.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonAPIGatewayPushToCloudWatchLogs"
}

# Set up API Gateway account settings with CloudWatch Logs role
resource "aws_api_gateway_account" "this" {
  cloudwatch_role_arn = aws_iam_role.api_gateway_cloudwatch_logs.arn
}

# Create ECR policy for pulling images
resource "aws_iam_policy" "ecr_policy" {
  name        = "doublezero-ecr-policy"
  description = "Policy for ECR access"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ecr:GetAuthorizationToken",
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage"
        ]
        Resource = "*"
      }
    ]
  })
}

# Attach ECR policy to EC2 role
resource "aws_iam_role_policy_attachment" "ecr_policy" {
  role       = aws_iam_role.ec2_role.name
  policy_arn = aws_iam_policy.ecr_policy.arn
}