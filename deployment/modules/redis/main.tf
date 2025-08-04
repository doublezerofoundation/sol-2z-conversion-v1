# Security Group for Redis
resource "aws_security_group" "redis" {
  name        = "${var.name_prefix}-redis-sg"
  description = "Security group for Redis cluster"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = 6379
    to_port     = 6379
    protocol    = "tcp"
    cidr_blocks = var.allowed_cidr_blocks
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-redis-sg"
  })
}

# ElastiCache Subnet Group
resource "aws_elasticache_subnet_group" "redis" {
  name       = "${var.name_prefix}-redis-subnet-group"
  subnet_ids = var.subnet_ids

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-redis-subnet-group"
  })
}


resource "aws_elasticache_replication_group" "redis" {
  replication_group_id         = "${var.name_prefix}-redis"
  description                  = var.description

  node_type                    = var.node_type
  port                         = 6379
  parameter_group_name         = var.parameter_group_name

  num_cache_clusters           = var.num_cache_clusters

  subnet_group_name            = aws_elasticache_subnet_group.redis.name
  security_group_ids           = [aws_security_group.redis.id]

  at_rest_encryption_enabled   = var.at_rest_encryption_enabled
  transit_encryption_enabled   = var.transit_encryption_enabled

  automatic_failover_enabled   = var.automatic_failover_enabled
  multi_az_enabled            = var.multi_az_enabled

  snapshot_retention_limit     = var.snapshot_retention_limit
  snapshot_window             = var.snapshot_window
  maintenance_window          = var.maintenance_window

  apply_immediately           = var.apply_immediately

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-redis"
  })
}