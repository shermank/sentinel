output "aws_region" {
  description = "AWS region"
  value       = var.aws_region
}

output "alb_dns_name" {
  description = "ALB DNS name - use this to access the app (or point your domain here)"
  value       = aws_lb.main.dns_name
}

output "app_url" {
  description = "Application URL"
  value       = local.app_url
}

output "ecr_app_repository_url" {
  description = "ECR repository URL for app image"
  value       = aws_ecr_repository.app.repository_url
}

output "ecr_worker_repository_url" {
  description = "ECR repository URL for worker image"
  value       = aws_ecr_repository.worker.repository_url
}

output "ecs_cluster_name" {
  description = "ECS cluster name"
  value       = aws_ecs_cluster.main.name
}

output "rds_endpoint" {
  description = "RDS instance endpoint"
  value       = aws_db_instance.main.endpoint
  sensitive   = true
}

output "redis_endpoint" {
  description = "ElastiCache Redis endpoint"
  value       = aws_elasticache_replication_group.main.primary_endpoint_address
  sensitive   = true
}

output "migrate_task_definition" {
  description = "Migration task definition ARN (use with deploy script)"
  value       = aws_ecs_task_definition.migrate.arn
}

output "private_subnet_ids" {
  description = "Private subnet IDs (needed for running migration tasks)"
  value       = aws_subnet.private[*].id
}

output "ecs_security_group_id" {
  description = "ECS security group ID (needed for running migration tasks)"
  value       = aws_security_group.ecs.id
}
