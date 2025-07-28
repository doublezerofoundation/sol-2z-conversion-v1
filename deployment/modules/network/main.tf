# Network Module for DoubleZero infrastructure
# This module creates environment-specific network components:
# - Security Groups
# Note: VPC, Internet Gateway, Subnets, NAT Gateway, and Route Tables are created at the regional level and passed as inputs

# Security Group for NLB
resource "aws_security_group" "alb" {
  name        = "doublezero-${var.environment}-alb-sg"
  description = "Security group for application load balancer"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow HTTP traffic from anywhere"
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow HTTPS traffic from anywhere"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
  }

  tags = {
    Name = "doublezero-${var.environment}-alb-sg"
  }
}

# Security Group for EC2 instances
resource "aws_security_group" "ec2" {
  name        = "doublezero-${var.environment}-ec2-sg"
  description = "Security group for EC2 instances"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = 80
    to_port         = 80
    protocol        = "tcp"
    cidr_blocks     = [var.vpc_cidr]
    description     = "Allow HTTP traffic from NLB"
  }

  ingress {
    from_port       = 443
    to_port         = 443
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
    description     = "Allow HTTPS traffic from ALB"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
  }

  tags = {
    Name = "doublezero-${var.environment}-ec2-sg"
  }
}

# Security Group for API Gateway VPC Link
resource "aws_security_group" "api_gateway" {
  name        = "doublezero-${var.environment}-api-gateway-sg"
  description = "Security group for API Gateway VPC Link"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = [var.vpc_cidr]
    description = "Allow all traffic from within VPC"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
  }

  tags = {
    Name = "doublezero-${var.environment}-api-gateway-sg"
  }
}
