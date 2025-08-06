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
resource "aws_cloudwatch_log_group" "service_logs" {
  name              = "/ec2/${var.environment}/${var.container_name}/service"
  retention_in_days = 7
}

resource "aws_cloudwatch_log_group" "application_logs" {
  name              = "/ec2/${var.environment}/${var.container_name}/application"
  retention_in_days = 7
}

resource "aws_instance" "this" {
  ami                    = var.ami_id != "" ? var.ami_id : data.aws_ami.amazon_linux.id
  instance_type          = var.instance_type
  subnet_id              = element(var.private_subnets, 0)
  vpc_security_group_ids = var.security_groups

  iam_instance_profile   = var.instance_profile_name

  user_data = base64encode(
    templatefile("${path.module}/templates/user_data.sh.tpl", {
      environment                = var.environment
      region                     = var.region
      ecr_registry               = local.ecr_registry
      ecr_repository             = var.ecr_repository
      image_tag                  = var.image_tag
      container_name             = var.container_name
      container_port             = var.container_port
      container_environment_vars = var.container_environment_vars
    })
  )

  root_block_device {
    volume_size = var.root_volume_size
    volume_type = "gp3"
    delete_on_termination = true
    encrypted = true
  }

  tags = merge(
    { 
      Name = "${local.full_prefix}-service", 
      Environment = var.environment,
      Service     = var.container_name
    },
    var.additional_tags
  )
}

