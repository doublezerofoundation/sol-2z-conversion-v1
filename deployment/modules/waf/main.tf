# WAF Module for DoubleZero infrastructure


# Create AWS WAF Web ACL
resource "aws_wafv2_web_acl" "this" {
  name        = "${var.name_prefix}-web-acl"
  description = "Web ACL for DoubleZero ${var.environment} environment"
  scope       = "REGIONAL"

  default_action {
    allow {}
  }

  # AWS Managed Rules - Common Rule Set
  rule {
    name     = "AWS-AWSManagedRulesCommonRuleSet"
    priority = 1

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${var.name_prefix}-aws-common-rule-metric"
      sampled_requests_enabled   = true
    }
  }

  # AWS Managed Rules - SQL Injection Rule Set
  rule {
    name     = "AWS-AWSManagedRulesSQLiRuleSet"
    priority = 2

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesSQLiRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${var.name_prefix}-aws-sqli-rule-metric"
      sampled_requests_enabled   = true
    }
  }

  # AWS Managed Rules - Known Bad Inputs Rule Set
  rule {
    name     = "AWS-AWSManagedRulesKnownBadInputsRuleSet"
    priority = 3

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesKnownBadInputsRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${var.name_prefix}-aws-bad-inputs-rule-metric"
      sampled_requests_enabled   = true
    }
  }

  # Rate-based rule to prevent DDoS attacks
  rule {
    name     = "RateBasedRule"
    priority = 4

    statement {
      rate_based_statement {
        limit              = 100
        aggregate_key_type = "IP"
        evaluation_window_sec = 120
      }

    }
    action {
      block {
        custom_response {
          response_code = 429
        }
      }

    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${var.name_prefix}-rate-limit-rule-metric"
      sampled_requests_enabled   = true
    }
  }

  # Geo-match rule to block specific countries if needed
  # Uncomment and customize as needed
  # rule {
  #   name     = "GeoMatchRule"
  #   priority = 5
  #
  #   action {
  #     block {}
  #   }
  #
  #   statement {
  #     geo_match_statement {
  #       country_codes = ["Country1", "Country2"]
  #     }
  #   }
  #
  #   visibility_config {
  #     cloudwatch_metrics_enabled = true
  #     metric_name                = "${var.name_prefix}-geo-match-rule-metric"
  #     sampled_requests_enabled   = true
  #   }
  # }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "${var.name_prefix}-web-acl-metric"
    sampled_requests_enabled   = true
  }

  tags = {
    Name        = "${var.name_prefix}-web-acl"
    Environment = var.environment
  }
}

# Create AWS WAF IP Set for allow list (whitelist)
resource "aws_wafv2_ip_set" "allow_list" {
  name               = "${var.name_prefix}-allow-ip-set"
  description        = "IP set for allowed IPs"
  scope              = "REGIONAL"
  ip_address_version = "IPV4"
  addresses          = var.allowed_ip_addresses

  tags = {
    Name        = "${var.name_prefix}-allow-ip-set"
    Environment = var.environment
  }
}

# Create AWS WAF IP Set for deny list (blacklist)
resource "aws_wafv2_ip_set" "deny_list" {
  name               = "${var.name_prefix}-deny-ip-set"
  description        = "IP set for denied IPs"
  scope              = "REGIONAL"
  ip_address_version = "IPV4"
  addresses          = var.denied_ip_addresses

  tags = {
    Name        = "${var.name_prefix}-deny-ip-set"
    Environment = var.environment
  }
}

# Create S3 bucket for WAF logs
resource "aws_s3_bucket" "waf_logs" {
  count = var.enable_logging ? 1 : 0

  bucket = "aws-waf-logs-${var.name_prefix}-${var.environment}"

  tags = {
    Name        = "${var.name_prefix}-waf-logs"
    Environment = var.environment
  }
}

# Configure S3 bucket ownership controls
resource "aws_s3_bucket_ownership_controls" "waf_logs" {
  count = var.enable_logging ? 1 : 0

  bucket = aws_s3_bucket.waf_logs[0].id

  rule {
    object_ownership = "BucketOwnerPreferred"
  }
}

# Configure S3 bucket server-side encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "waf_logs" {
  count = var.enable_logging ? 1 : 0

  bucket = aws_s3_bucket.waf_logs[0].id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Block public access to the S3 bucket
resource "aws_s3_bucket_public_access_block" "waf_logs" {
  count = var.enable_logging ? 1 : 0

  bucket = aws_s3_bucket.waf_logs[0].id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Configure S3 bucket policy to allow WAF to write logs
resource "aws_s3_bucket_policy" "waf_logs" {
  count = var.enable_logging ? 1 : 0

  bucket = aws_s3_bucket.waf_logs[0].id

  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Sid = "AWSLogDeliveryWrite",
        Effect = "Allow",
        Principal = {
          Service = "waf.amazonaws.com"
        },
        Action = "s3:PutObject",
        Resource = "${aws_s3_bucket.waf_logs[0].arn}/*",
        Condition = {
          StringEquals = {
            "s3:x-amz-acl" = "bucket-owner-full-control"
          }
        }
      },
      {
        Sid = "AWSLogDeliveryAclCheck",
        Effect = "Allow",
        Principal = {
          Service = ["waf.amazonaws.com", "delivery.logs.amazonaws.com"]
        },
        Action = "s3:GetBucketAcl",
        Resource = aws_s3_bucket.waf_logs[0].arn
      }
    ]
  })

  # Ensure public access block and ownership controls are created before the bucket policy
  depends_on = [
    aws_s3_bucket_public_access_block.waf_logs,
    aws_s3_bucket_ownership_controls.waf_logs
  ]
}

# Configure S3 bucket lifecycle for log retention
resource "aws_s3_bucket_lifecycle_configuration" "waf_logs" {
  count = var.enable_logging ? 1 : 0

  bucket = aws_s3_bucket.waf_logs[0].id

  rule {
    id     = "log-expiration"
    status = "Enabled"

    expiration {
      days = var.log_retention_days
    }
  }
}


# Configure WAF logging directly to S3
resource "aws_wafv2_web_acl_logging_configuration" "this" {
  count = var.enable_logging ? 1 : 0

  log_destination_configs = [aws_s3_bucket.waf_logs[0].arn]
  resource_arn            = aws_wafv2_web_acl.this.arn

  # Ensure all S3 bucket configurations are created before the WAF logging configuration
  depends_on = [
    aws_s3_bucket.waf_logs,
    aws_s3_bucket_policy.waf_logs,
    aws_s3_bucket_lifecycle_configuration.waf_logs,
    aws_s3_bucket_server_side_encryption_configuration.waf_logs,
    aws_s3_bucket_public_access_block.waf_logs,
    aws_s3_bucket_ownership_controls.waf_logs
  ]
}
