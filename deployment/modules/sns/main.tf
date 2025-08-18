locals {
  common_tags = merge({ Environment = var.environment }, var.additional_tags)
}

resource "aws_sns_topic" "app_errors" {
  name              = "${var.name_prefix}-app-errors"
  kms_master_key_id = var.kms_key_arn != "" ? var.kms_key_arn : null
  tags              = local.common_tags
}

resource "aws_sns_topic_subscription" "emails" {
  for_each  = toset(var.email_subscribers)
  topic_arn = aws_sns_topic.app_errors.arn
  protocol  = "email"
  endpoint  = each.value
}

