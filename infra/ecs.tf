# ---------- ECS Cluster ----------

resource "aws_ecs_cluster" "main" {
  name = "${var.project_name}-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = { Name = "${var.project_name}-cluster" }
}

# ---------- IAM Roles ----------

# Task execution role (used by ECS to pull images, read secrets, write logs)
resource "aws_iam_role" "ecs_execution" {
  name = "${var.project_name}-ecs-execution"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_execution_base" {
  role       = aws_iam_role.ecs_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role_policy" "ecs_execution_secrets" {
  name = "${var.project_name}-read-secrets"
  role = aws_iam_role.ecs_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["secretsmanager:GetSecretValue"]
      Resource = [aws_secretsmanager_secret.app_secrets.arn]
    }]
  })
}

# Task role (used by the app containers themselves)
resource "aws_iam_role" "ecs_task" {
  name = "${var.project_name}-ecs-task"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
    }]
  })
}

# ---------- CloudWatch Log Groups ----------

resource "aws_cloudwatch_log_group" "app" {
  name              = "/ecs/${var.project_name}/app"
  retention_in_days = 30
  tags              = { Name = "${var.project_name}-app-logs" }
}

resource "aws_cloudwatch_log_group" "worker" {
  name              = "/ecs/${var.project_name}/worker"
  retention_in_days = 30
  tags              = { Name = "${var.project_name}-worker-logs" }
}

resource "aws_cloudwatch_log_group" "migrate" {
  name              = "/ecs/${var.project_name}/migrate"
  retention_in_days = 14
  tags              = { Name = "${var.project_name}-migrate-logs" }
}

# ---------- Shared secret environment variables ----------

locals {
  app_url = var.domain_name != "" ? "https://${var.domain_name}" : "https://${aws_lb.main.dns_name}"

  secret_env_vars = [
    "DATABASE_URL", "REDIS_URL", "AUTH_SECRET", "AUTH_GOOGLE_ID",
    "AUTH_GOOGLE_SECRET", "RESEND_API_KEY", "TWILIO_ACCOUNT_SID",
    "TWILIO_AUTH_TOKEN", "TWILIO_PHONE_NUMBER", "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET", "ENCRYPTION_KEY"
  ]
}

# ---------- App Task Definition ----------

resource "aws_ecs_task_definition" "app" {
  family                   = "${var.project_name}-app"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.app_cpu
  memory                   = var.app_memory
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([{
    name      = "app"
    image     = "${aws_ecr_repository.app.repository_url}:latest"
    essential = true

    portMappings = [{
      containerPort = 3000
      hostPort      = 3000
      protocol      = "tcp"
    }]

    environment = [
      { name = "NODE_ENV", value = "production" },
      { name = "NEXT_PUBLIC_APP_URL", value = local.app_url },
      { name = "AUTH_URL", value = local.app_url },
      { name = "EMAIL_FROM", value = var.email_from },
      { name = "STRIPE_PUBLISHABLE_KEY", value = var.stripe_publishable_key },
      { name = "STRIPE_PRICE_ID_MONTHLY", value = var.stripe_price_id_monthly },
      { name = "STRIPE_PRICE_ID_YEARLY", value = var.stripe_price_id_yearly },
    ]

    secrets = [for key in local.secret_env_vars : {
      name      = key
      valueFrom = "${aws_secretsmanager_secret.app_secrets.arn}:${key}::"
    }]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.app.name
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "app"
      }
    }

  }])

  tags = { Name = "${var.project_name}-app-task" }
}

# ---------- Worker Task Definition ----------

resource "aws_ecs_task_definition" "worker" {
  family                   = "${var.project_name}-worker"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.worker_cpu
  memory                   = var.worker_memory
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([{
    name      = "worker"
    image     = "${aws_ecr_repository.worker.repository_url}:latest"
    essential = true

    environment = [
      { name = "NODE_ENV", value = "production" },
      { name = "NEXT_PUBLIC_APP_URL", value = local.app_url },
      { name = "EMAIL_FROM", value = var.email_from },
      { name = "WORKER_CONCURRENCY", value = "5" },
      { name = "CHECK_IN_POLL_INTERVAL", value = "60000" },
    ]

    secrets = [for key in local.secret_env_vars : {
      name      = key
      valueFrom = "${aws_secretsmanager_secret.app_secrets.arn}:${key}::"
    }]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.worker.name
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "worker"
      }
    }
  }])

  tags = { Name = "${var.project_name}-worker-task" }
}

# ---------- Migration Task Definition (run once per deploy) ----------

resource "aws_ecs_task_definition" "migrate" {
  family                   = "${var.project_name}-migrate"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 256
  memory                   = 512
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([{
    name      = "migrate"
    image     = "${aws_ecr_repository.worker.repository_url}:latest"
    essential = true

    command = ["npx", "prisma", "db", "push", "--skip-generate"]

    environment = [
      { name = "NODE_ENV", value = "production" },
    ]

    secrets = [{
      name      = "DATABASE_URL"
      valueFrom = "${aws_secretsmanager_secret.app_secrets.arn}:DATABASE_URL::"
    }]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.migrate.name
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "migrate"
      }
    }
  }])

  tags = { Name = "${var.project_name}-migrate-task" }
}

# ---------- ECS Services ----------

resource "aws_ecs_service" "app" {
  name            = "${var.project_name}-app"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = var.app_desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = aws_subnet.private[*].id
    security_groups  = [aws_security_group.ecs.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.app.arn
    container_name   = "app"
    container_port   = 3000
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  depends_on = [aws_lb_listener.http]

  tags = { Name = "${var.project_name}-app-service" }
}

resource "aws_ecs_service" "worker" {
  name            = "${var.project_name}-worker"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.worker.arn
  desired_count   = var.worker_desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = aws_subnet.private[*].id
    security_groups  = [aws_security_group.ecs.id]
    assign_public_ip = false
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  tags = { Name = "${var.project_name}-worker-service" }
}
