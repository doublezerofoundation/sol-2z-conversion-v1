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
  full_prefix = "${var.name_prefix}-indexer"
  ecr_registry = "${data.aws_caller_identity.current.account_id}.dkr.ecr.${var.region}.amazonaws.com"
}

# CloudWatch Log Groups
resource "aws_cloudwatch_log_group" "user_data_logs" {
  name              = "/ec2/${var.environment}/${var.container_name}/user_data"
  retention_in_days = 7
  skip_destroy      = false
}

resource "aws_cloudwatch_log_group" "container_logs" {
  name              = "/ec2/${var.environment}/${var.container_name}"
  retention_in_days = 7
  skip_destroy      = false
}

# ECR Image data source
data "aws_ecr_image" "app_image" {
  count           = var.skip_image_validation ? 0 : 1
  repository_name = var.ecr_repository
  image_tag       = var.indexer_service_image_tag
}

# Launch Template
resource "aws_launch_template" "indexer" {
  name_prefix            = "${local.full_prefix}-lt-"
  image_id               = var.ami_id != "" ? var.ami_id : data.aws_ami.amazon_linux.id
  instance_type          = var.instance_type
  vpc_security_group_ids = var.security_groups

  iam_instance_profile {
    name = var.instance_profile_name
  }

  monitoring {
    enabled = true
  }

  user_data = base64encode(
    templatefile("${path.module}/templates/user_data.sh.tpl", {
      environment                = var.environment
      region                     = var.region
      ecr_registry               = local.ecr_registry
      ecr_repository             = var.ecr_repository
      image_tag                  = var.indexer_service_image_tag
      container_name             = var.container_name
      container_port             = var.container_port
      container_environment_vars = var.container_environment_vars
    })
  )

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
      {
        Name        = "${local.full_prefix}-service"
        Environment = var.environment
        Service     = "double-zero-${var.container_name}"
        Version     = var.indexer_service_image_tag
        ManagedBy   = "ASG"
      },
      var.additional_tags
    )
  }

  lifecycle {
    create_before_destroy = true
  }

  tags = merge(
    {
      Name        = "${local.full_prefix}-launch-template"
      Environment = var.environment
      Version     = var.indexer_service_image_tag
    },
    var.additional_tags
  )
}

# Auto Scaling Group - Single Instance Configuration
resource "aws_autoscaling_group" "indexer" {
  name                = "${local.full_prefix}-asg"
  vpc_zone_identifier = var.private_subnets
  target_group_arns   = [] # Add ALB target groups if using load balancer
  health_check_type   = "EC2"
  health_check_grace_period = 300

  # Single instance configuration
  min_size         = 1
  max_size         = 1
  desired_capacity = 1

  # Launch template configuration
  launch_template {
    id      = aws_launch_template.indexer.id
    version = aws_launch_template.indexer.latest_version
  }

  # Instance refresh configuration for single instance
  instance_refresh {
    strategy = "Rolling"
    preferences {
      min_healthy_percentage = 0    # Allow 0 healthy instances (downtime acceptable)
      instance_warmup       = 300   # Wait 5 minutes for instance to be ready
      max_healthy_percentage = 100  # Never exceed desired capacity
      auto_rollback         = true  # Rollback on failure
    }
    triggers = ["tag", "launch_template"] # Trigger on changes
  }

  # Wait for capacity timeout
  wait_for_capacity_timeout = "10m"

  # Tags for ASG
  tag {
    key                 = "Name"
    value               = "${local.full_prefix}-asg"
    propagate_at_launch = false
  }

  tag {
    key                 = "Environment"
    value               = var.environment
    propagate_at_launch = true
  }

  tag {
    key                 = "Service"
    value               = "double-zero-${var.container_name}"
    propagate_at_launch = true
  }

  tag {
    key                 = "Version"
    value               = var.indexer_service_image_tag
    propagate_at_launch = true
  }

  tag {
    key                 = "ManagedBy"
    value               = "ASG"
    propagate_at_launch = true
  }

  # Dynamic tags from additional_tags variable
  dynamic "tag" {
    for_each = var.additional_tags
    content {
      key                 = tag.key
      value               = tag.value
      propagate_at_launch = true
    }
  }

  lifecycle {
    create_before_destroy = true
    ignore_changes       = [desired_capacity] # Prevent drift from manual scaling
  }


}

# Auto Scaling Policies (Optional - for manual scaling if needed)
resource "aws_autoscaling_policy" "scale_up" {
  name                   = "${local.full_prefix}-scale-up"
  scaling_adjustment     = 1
  adjustment_type        = "ChangeInCapacity"
  cooldown              = 300
  autoscaling_group_name = aws_autoscaling_group.indexer.name
}

resource "aws_autoscaling_policy" "scale_down" {
  name                   = "${local.full_prefix}-scale-down"
  scaling_adjustment     = -1
  adjustment_type        = "ChangeInCapacity"
  cooldown              = 300
  autoscaling_group_name = aws_autoscaling_group.indexer.name
}

# CloudWatch Alarms for monitoring
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
    AutoScalingGroupName = aws_autoscaling_group.indexer.name
  }

  tags = merge(
    {
      Name        = "${local.full_prefix}-high-cpu-alarm"
      Environment = var.environment
    },
    var.additional_tags
  )
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
    AutoScalingGroupName = aws_autoscaling_group.indexer.name
  }

  tags = merge(
    {
      Name        = "${local.full_prefix}-instance-health-alarm"
      Environment = var.environment
    },
    var.additional_tags
  )
}


# Null resource to trigger instance refresh on image tag changes
resource "null_resource" "trigger_instance_refresh" {
  triggers = {
    image_tag           = var.indexer_service_image_tag
    launch_template_id  = aws_launch_template.indexer.id
    user_data_hash     = sha256(aws_launch_template.indexer.user_data)
  }

  provisioner "local-exec" {
    command = <<-EOT
      echo "Triggering instance refresh for ASG: ${aws_autoscaling_group.indexer.name}"
      aws autoscaling start-instance-refresh \
        --auto-scaling-group-name "${aws_autoscaling_group.indexer.name}" \
        --preferences '{
          "MinHealthyPercentage": 0,
          "InstanceWarmup": 300,
          "CheckpointPercentages": [50, 100],
          "CheckpointDelay": 300,
          "SkipMatching": false,
          "ScaleInProtectedInstances": "Ignore",
          "StandbyInstances": "Ignore"
        }' \
        --region "${var.region}" || echo "Instance refresh already in progress or failed"
    EOT

  }

  depends_on = [aws_autoscaling_group.indexer]
}