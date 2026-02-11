# ---------- ElastiCache Redis ----------

resource "aws_elasticache_subnet_group" "main" {
  name       = "${var.project_name}-redis-subnet"
  subnet_ids = aws_subnet.private[*].id

  tags = { Name = "${var.project_name}-redis-subnet-group" }
}

resource "aws_elasticache_replication_group" "main" {
  replication_group_id = "${var.project_name}-redis"
  description          = "Redis for ${var.project_name} BullMQ queues"

  engine               = "redis"
  engine_version       = "7.1"
  node_type            = var.redis_node_type
  num_cache_clusters   = 1
  port                 = 6379

  subnet_group_name  = aws_elasticache_subnet_group.main.name
  security_group_ids = [aws_security_group.redis.id]

  at_rest_encryption_enabled = true
  transit_encryption_enabled = false # BullMQ/IORedis simpler without TLS

  automatic_failover_enabled = false # Single node; set true with 2+ nodes

  tags = { Name = "${var.project_name}-redis" }
}

locals {
  redis_url = "redis://${aws_elasticache_replication_group.main.primary_endpoint_address}:6379"
}
