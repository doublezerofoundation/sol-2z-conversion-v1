# Get the latest Amazon Linux 2 AMI
data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["amzn2-ami-hvm-*-x86_64-gp2"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# Caller identity for ECR registry
data "aws_caller_identity" "current" {}

locals {
  full_prefix = "${var.name_prefix}-swap-oracle"
  ecr_registry = "${data.aws_caller_identity.current.account_id}.dkr.ecr.${var.region}.amazonaws.com"
}

resource "aws_cloudwatch_log_group" "container_logs" {
  name              = "/ec2/${var.environment}/${var.container_name}"
  retention_in_days = 7
  skip_destroy      = false

}

resource "aws_cloudwatch_log_group" "user_data_logs" {
  name              = "/ec2/${var.environment}/${var.container_name}/user_data"
  retention_in_days = 7
  skip_destroy      = false

}

resource "aws_cloudwatch_log_group" "application_logs" {
  name              = "/ec2/${var.environment}/${var.container_name}/application"
  retention_in_days = 7
  skip_destroy      = false

}

data "aws_ecr_image" "app_image" {
  repository_name = var.ecr_repository
  image_tag       = var.swap_oracle_service_image_tag
}

# Local value to ensure image validation
locals {
  validated_image_uri = "${local.ecr_registry}/${var.ecr_repository}:${var.swap_oracle_service_image_tag}"
  image_exists        = data.aws_ecr_image.app_image.id != null
}

# Launch Template
resource "aws_launch_template" "this" {
  name_prefix            = "${local.full_prefix}-lt-"
  image_id               = var.ami_id != "" ? var.ami_id : data.aws_ami.amazon_linux.id
  instance_type          = var.instance_type
  vpc_security_group_ids = var.security_groups

  iam_instance_profile {
    name = var.instance_profile_name
  }

  monitoring { enabled = true }

  user_data = base64encode(
    templatefile("${path.module}/templates/user_data.sh.tpl", {
      environment                = var.environment
      region                     = var.region
      ecr_registry               = local.ecr_registry
      ecr_repository             = var.ecr_repository
      image_tag                  = var.swap_oracle_service_image_tag
      container_name             = var.container_name
      container_port             = var.container_port
      container_environment_vars = var.container_environment_vars
      redis_endpoint             = var.redis_endpoint
      redis_port                 = var.redis_port
    })
  )

  depends_on = [data.aws_ecr_image.app_image]

  block_device_mappings {
    device_name = "/dev/xvda"
    ebs {
      volume_size           = var.root_volume_size
      volume_type           = "gp3"
      delete_on_termination = true
      encrypted             = true
    }
  }

  tag_specifications {
    resource_type = "instance"
    tags = merge(
      { Name = "${local.full_prefix}-instance", Environment = var.environment },
      var.additional_tags
    )
  }

  lifecycle { create_before_destroy = true }

  tags = merge(
    { Name = "${local.full_prefix}-launch-template", Environment = var.environment },
    var.additional_tags
  )
}

# Auto Scaling Group
resource "aws_autoscaling_group" "this" {
  name                      = "${local.full_prefix}-asg"
  min_size                  = var.asg_min_size
  max_size                  = var.asg_max_size
  desired_capacity          = var.asg_desired_capacity
  vpc_zone_identifier       = var.private_subnets
  health_check_type         = "ELB"
  health_check_grace_period = var.health_check_grace_period
  target_group_arns         = var.target_group_arns
  termination_policies      = ["OldestInstance", "Default"]

  launch_template {
    id      = aws_launch_template.this.id
    version = "$Latest"
  }

  instance_refresh {
    strategy = "Rolling"
    preferences {
      min_healthy_percentage = 90
      instance_warmup        = 300
    }
  }

  dynamic "tag" {
    for_each = merge(
      {
        Name        = "${var.name_prefix}-swap-oracle"
        Environment = var.environment
        Service     = "double-zero-${var.container_name}"
      },
      var.additional_tags
    )

    content {
      key                 = tag.key
      value               = tag.value
      propagate_at_launch = true
    }
  }

  lifecycle {
    create_before_destroy = true
    ignore_changes        = [desired_capacity]
  }
}

# Scaling Policies
resource "aws_autoscaling_policy" "scale_up" {
  name                   = "${local.full_prefix}-scale-up-policy"
  autoscaling_group_name = aws_autoscaling_group.this.name
  adjustment_type        = "ChangeInCapacity"
  scaling_adjustment     = 1
  cooldown               = 300
}

resource "aws_autoscaling_policy" "scale_down" {
  name                   = "${local.full_prefix}-scale-down-policy"
  autoscaling_group_name = aws_autoscaling_group.this.name
  adjustment_type        = "ChangeInCapacity"
  scaling_adjustment     = -1
  cooldown               = 300
}

# CloudWatch Alarms
resource "aws_cloudwatch_metric_alarm" "high_cpu" {
  alarm_name          = "${local.full_prefix}-high-cpu-alarm"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = 120
  statistic           = "Average"
  threshold           = var.cpu_high_threshold
  alarm_actions       = [aws_autoscaling_policy.scale_up.arn]

  dimensions = {
    AutoScalingGroupName = aws_autoscaling_group.this.name
  }
}

resource "aws_cloudwatch_metric_alarm" "low_cpu" {
  alarm_name          = "${local.full_prefix}-low-cpu-alarm"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = 120
  statistic           = "Average"
  threshold           = var.cpu_low_threshold
  alarm_actions       = [aws_autoscaling_policy.scale_down.arn]

  dimensions = {
    AutoScalingGroupName = aws_autoscaling_group.this.name
  }
}

