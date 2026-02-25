variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
  default     = "eternal-sentinel"
}

variable "aws_region" {
  description = "AWS region to deploy to"
  type        = string
  default     = "us-east-2"
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "production"
}

# Networking
variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "Availability zones to use"
  type        = list(string)
  default     = ["us-east-2a", "us-east-2b"]
}

# Database
variable "db_instance_class" {
  description = "RDS instance type"
  type        = string
  default     = "db.t3.micro"
}

variable "db_allocated_storage" {
  description = "RDS storage in GB"
  type        = number
  default     = 20
}

variable "db_name" {
  description = "Database name"
  type        = string
  default     = "eternal_sentinel"
}

variable "db_username" {
  description = "Database master username"
  type        = string
  default     = "sentinel_admin"
}

# Redis
variable "redis_node_type" {
  description = "ElastiCache node type"
  type        = string
  default     = "cache.t3.micro"
}

# ECS
variable "app_cpu" {
  description = "CPU units for app task (1024 = 1 vCPU)"
  type        = number
  default     = 512
}

variable "app_memory" {
  description = "Memory for app task in MB"
  type        = number
  default     = 1024
}

variable "app_desired_count" {
  description = "Number of app tasks to run"
  type        = number
  default     = 2
}

variable "worker_cpu" {
  description = "CPU units for worker task"
  type        = number
  default     = 256
}

variable "worker_memory" {
  description = "Memory for worker task in MB"
  type        = number
  default     = 512
}

variable "worker_desired_count" {
  description = "Number of worker tasks to run"
  type        = number
  default     = 1
}

# Domain
variable "domain_name" {
  description = "Domain name for the application (e.g., sentinel.example.com). Leave empty to use ALB DNS."
  type        = string
  default     = ""
}

variable "certificate_arn" {
  description = "ACM certificate ARN for HTTPS. Required if domain_name is set."
  type        = string
  default     = ""
}

# Application secrets (set via terraform.tfvars or environment variables)
variable "auth_secret" {
  description = "NextAuth.js secret key"
  type        = string
  sensitive   = true
}

variable "auth_google_id" {
  description = "Google OAuth client ID"
  type        = string
  default     = ""
}

variable "auth_google_secret" {
  description = "Google OAuth client secret"
  type        = string
  sensitive   = true
  default     = ""
}

variable "resend_api_key" {
  description = "Resend email API key"
  type        = string
  sensitive   = true
  default     = ""
}

variable "email_from" {
  description = "From address for emails"
  type        = string
  default     = "noreply@example.com"
}

variable "twilio_account_sid" {
  description = "Twilio account SID"
  type        = string
  default     = ""
}

variable "twilio_auth_token" {
  description = "Twilio auth token"
  type        = string
  sensitive   = true
  default     = ""
}

variable "twilio_phone_number" {
  description = "Twilio phone number"
  type        = string
  default     = ""
}

variable "stripe_secret_key" {
  description = "Stripe secret key"
  type        = string
  sensitive   = true
  default     = ""
}

variable "stripe_publishable_key" {
  description = "Stripe publishable key"
  type        = string
  default     = ""
}

variable "stripe_webhook_secret" {
  description = "Stripe webhook secret"
  type        = string
  sensitive   = true
  default     = ""
}

variable "stripe_price_id_monthly" {
  description = "Stripe monthly price ID"
  type        = string
  default     = ""
}

variable "stripe_price_id_yearly" {
  description = "Stripe yearly price ID"
  type        = string
  default     = ""
}

variable "encryption_key" {
  description = "Server-side encryption key (32-byte hex)"
  type        = string
  sensitive   = true
}
