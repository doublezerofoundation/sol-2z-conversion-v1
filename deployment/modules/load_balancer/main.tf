# Load Balancer Module for DoubleZero infrastructure

# Create Network Load Balancer
resource "aws_lb" "this" {
  name               = "${var.name_prefix}-nlb"
  internal           = var.internal
  load_balancer_type = "network"
  subnets            = var.public_subnets
  enable_deletion_protection = var.enable_deletion_protection

  dynamic "access_logs" {
    for_each = var.access_logs_bucket != "" ? [1] : []
    content {
      bucket  = var.access_logs_bucket
      prefix  = var.access_logs_prefix != "" ? var.access_logs_prefix : null
      enabled = true
    }
  }

  tags = {
    Name        = "${var.name_prefix}-nlb"
    Environment = var.environment
  }
}

# Create Target Group for TCP traffic
resource "aws_lb_target_group" "http" {
  name     = "${var.name_prefix}-tg-tcp"
  port     = 80
  protocol = "TCP"
  vpc_id   = var.vpc_id

  target_type = "instance"

  # TCP health check for NLB
  health_check {
    enabled             = true
    interval            = var.health_check_interval
    port                = "traffic-port"
    healthy_threshold   = var.health_check_healthy_threshold
    unhealthy_threshold = var.health_check_unhealthy_threshold
    protocol            = "TCP"
  }

  tags = {
    Name        = "${var.name_prefix}-tg-tcp"
    Environment = var.environment
  }

  lifecycle {
    create_before_destroy = true
  }
}


# Create TCP Listener
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.this.arn
  port              = 80
  protocol          = "TCP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.http.arn
  }

  tags = {
    Name        = "${var.name_prefix}-listener-tcp"
    Environment = var.environment
  }
}


# NLB CloudWatch alarms could be added here if needed
# NLB metrics are different from ALB metrics
