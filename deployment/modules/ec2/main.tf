# EC2 Module for DoubleZero infrastructure

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

# Create IAM role for EC2 instances
resource "aws_iam_role" "ec2_role" {
  name = "${var.name_prefix}-ec2-role"

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
    Name        = "${var.name_prefix}-ec2-role"
    Environment = var.environment
  }
}

# Create IAM instance profile
resource "aws_iam_instance_profile" "ec2_profile" {
  name = "${var.name_prefix}-ec2-profile"
  role = aws_iam_role.ec2_role.name
}

# Attach policies to IAM role
resource "aws_iam_role_policy_attachment" "ssm_policy" {
  role       = aws_iam_role.ec2_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_role_policy_attachment" "cloudwatch_policy" {
  role       = aws_iam_role.ec2_role.name
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy"
}

# Create Launch Template
resource "aws_launch_template" "this" {
  name_prefix            = "${var.name_prefix}-lt-"
  image_id               = var.ami_id != "" ? var.ami_id : data.aws_ami.amazon_linux.id
  instance_type          = var.instance_type
  vpc_security_group_ids = var.security_groups

  iam_instance_profile {
    name = aws_iam_instance_profile.ec2_profile.name
  }

  monitoring {
    enabled = true
  }

  # User data script to install and configure the application
  user_data = base64encode(templatefile("${path.module}/templates/user_data.sh.tpl", {
    environment = var.environment
    region      = var.region
  }))

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
        Name        = "${var.name_prefix}-instance"
        Environment = var.environment
      },
      var.additional_tags
    )
  }

  tag_specifications {
    resource_type = "volume"

    tags = merge(
      {
        Name        = "${var.name_prefix}-volume"
        Environment = var.environment
      },
      var.additional_tags
    )
  }

  lifecycle {
    create_before_destroy = true
  }

  tags = merge(
    {
      Name        = "${var.name_prefix}-launch-template"
      Environment = var.environment
    },
    var.additional_tags
  )
}

# Create Auto Scaling Group
resource "aws_autoscaling_group" "this" {
  name                      = "${var.name_prefix}-asg"
  min_size                  = var.min_size
  max_size                  = var.max_size
  desired_capacity          = var.desired_capacity
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
        Name        = "${var.name_prefix}-asg"
        Environment = var.environment
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

# Create Auto Scaling Policies
resource "aws_autoscaling_policy" "scale_up" {
  name                   = "${var.name_prefix}-scale-up-policy"
  autoscaling_group_name = aws_autoscaling_group.this.name
  adjustment_type        = "ChangeInCapacity"
  scaling_adjustment     = 1
  cooldown               = 300
}

resource "aws_autoscaling_policy" "scale_down" {
  name                   = "${var.name_prefix}-scale-down-policy"
  autoscaling_group_name = aws_autoscaling_group.this.name
  adjustment_type        = "ChangeInCapacity"
  scaling_adjustment     = -1
  cooldown               = 300
}

# Create CloudWatch Alarms for Auto Scaling
resource "aws_cloudwatch_metric_alarm" "high_cpu" {
  alarm_name          = "${var.name_prefix}-high-cpu-alarm"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = 120
  statistic           = "Average"
  threshold           = var.cpu_high_threshold
  alarm_description   = "This metric monitors EC2 CPU utilization for scaling up"
  alarm_actions       = [aws_autoscaling_policy.scale_up.arn]

  dimensions = {
    AutoScalingGroupName = aws_autoscaling_group.this.name
  }
}

resource "aws_cloudwatch_metric_alarm" "low_cpu" {
  alarm_name          = "${var.name_prefix}-low-cpu-alarm"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = 120
  statistic           = "Average"
  threshold           = var.cpu_low_threshold
  alarm_description   = "This metric monitors EC2 CPU utilization for scaling down"
  alarm_actions       = [aws_autoscaling_policy.scale_down.arn]

  dimensions = {
    AutoScalingGroupName = aws_autoscaling_group.this.name
  }
}

# Create a directory for templates
# resource "local_file" "user_data_template" {
#   content  = <<-EOT
# #!/bin/bash
# # This script installs and configures the application
#
# # Update system packages
# yum update -y
#
# # Install required packages
# yum install -y amazon-cloudwatch-agent httpd
#
# # Start and enable Apache
# systemctl start httpd
# systemctl enable httpd
#
# # Create a simple index.html
# cat > /var/www/html/index.html << 'EOF'
# <!DOCTYPE html>
# <html>
# <head>
#     <title>DoubleZero - ${environment}</title>
#     <style>
#         body {
#             font-family: Arial, sans-serif;
#             margin: 0;
#             padding: 0;
#             display: flex;
#             justify-content: center;
#             align-items: center;
#             height: 100vh;
#             background-color: #f5f5f5;
#         }
#         .container {
#             text-align: center;
#             padding: 20px;
#             background-color: white;
#             border-radius: 8px;
#             box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
#         }
#         h1 {
#             color: #333;
#         }
#         p {
#             color: #666;
#         }
#     </style>
# </head>
# <body>
#     <div class="container">
#         <h1>Welcome to DoubleZero</h1>
#         <p>Environment: ${environment}</p>
#         <p>Instance ID: $(curl -s http://169.254.169.254/latest/meta-data/instance-id)</p>
#         <p>Availability Zone: $(curl -s http://169.254.169.254/latest/meta-data/placement/availability-zone)</p>
#     </div>
# </body>
# </html>
# EOF
#
#   # Configure CloudWatch agent
# cat > /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json << 'EOF'
# {
#   "agent": {
#     "metrics_collection_interval": 60,
#     "run_as_user": "root"
#   },
#   "metrics": {
#     "metrics_collected": {
#       "disk": {
#         "measurement": [
#           "used_percent"
#         ],
#         "resources": [
#           "/"
#         ]
#       },
#       "mem": {
#         "measurement": [
#           "mem_used_percent"
#         ]
#       }
#     },
#     "append_dimensions": {
#       "InstanceId": "$${aws:InstanceId}"
#     }
#   },
#   "logs": {
#     "logs_collected": {
#       "files": {
#         "collect_list": [
#           {
#             "file_path": "/var/log/httpd/access_log",
#             "log_group_name": "/ec2/httpd/access_log",
#             "log_stream_name": "{instance_id}"
#           },
#           {
#             "file_path": "/var/log/httpd/error_log",
#             "log_group_name": "/ec2/httpd/error_log",
#             "log_stream_name": "{instance_id}"
#           }
#         ]
#       }
#     }
#   }
# }
# EOF
#
# # Start CloudWatch agent
# systemctl start amazon-cloudwatch-agent
# systemctl enable amazon-cloudwatch-agent
#
# # Tag the instance (metadata)
# INSTANCE_ID=$(curl -s http://169.254.169.254/latest/meta-data/instance-id)
# REGION=${region}
#
# aws ec2 create-tags \
#   --resources $INSTANCE_ID \
#   --tags Key=Environment,Value=${environment} \
#   --region $REGION
# EOT
#   filename = "${path.module}/templates/user_data.sh.tpl"
#
#   depends_on = [
#     aws_launch_template.this
#   ]
# }
