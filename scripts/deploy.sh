#!/usr/bin/env bash
set -euo pipefail

# --------------------------------------------------
# Eternal Sentinel - AWS Deployment Script
# Usage: ./scripts/deploy.sh [--skip-build] [--migrate-only]
# --------------------------------------------------

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
INFRA_DIR="$PROJECT_ROOT/infra"

# Parse flags
SKIP_BUILD=false
MIGRATE_ONLY=false
for arg in "$@"; do
  case $arg in
    --skip-build) SKIP_BUILD=true ;;
    --migrate-only) MIGRATE_ONLY=true ;;
  esac
done

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[deploy]${NC} $1"; }
warn() { echo -e "${YELLOW}[deploy]${NC} $1"; }
err()  { echo -e "${RED}[deploy]${NC} $1" >&2; }

# ---------- Prerequisites ----------

command -v aws >/dev/null 2>&1 || { err "AWS CLI not found. Install: https://aws.amazon.com/cli/"; exit 1; }
command -v docker >/dev/null 2>&1 || { err "Docker not found."; exit 1; }
command -v terraform >/dev/null 2>&1 || { err "Terraform not found. Install: https://www.terraform.io/downloads"; exit 1; }

# ---------- Read Terraform Outputs ----------

log "Reading Terraform outputs..."
cd "$INFRA_DIR"

AWS_REGION=$(terraform output -raw aws_region 2>/dev/null || echo "us-east-1")
ECR_APP_URL=$(terraform output -raw ecr_app_repository_url)
ECR_WORKER_URL=$(terraform output -raw ecr_worker_repository_url)
ECS_CLUSTER=$(terraform output -raw ecs_cluster_name)
MIGRATE_TASK_ARN=$(terraform output -raw migrate_task_definition)
PRIVATE_SUBNETS=$(terraform output -json private_subnet_ids | jq -r 'join(",")')
ECS_SG=$(terraform output -raw ecs_security_group_id)

AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

cd "$PROJECT_ROOT"

# ---------- Build & Push Docker Images ----------

if [ "$SKIP_BUILD" = false ]; then
  log "Authenticating Docker with ECR..."
  aws ecr get-login-password --region "$AWS_REGION" | \
    docker login --username AWS --password-stdin "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"

  COMMIT_SHA=$(git rev-parse --short HEAD 2>/dev/null || echo "latest")

  log "Building app image..."
  docker build -t "$ECR_APP_URL:$COMMIT_SHA" -t "$ECR_APP_URL:latest" -f Dockerfile .

  log "Building worker image..."
  docker build -t "$ECR_WORKER_URL:$COMMIT_SHA" -t "$ECR_WORKER_URL:latest" -f Dockerfile.worker .

  log "Pushing app image..."
  docker push "$ECR_APP_URL:$COMMIT_SHA"
  docker push "$ECR_APP_URL:latest"

  log "Pushing worker image..."
  docker push "$ECR_WORKER_URL:$COMMIT_SHA"
  docker push "$ECR_WORKER_URL:latest"

  log "Images pushed successfully."
fi

if [ "$MIGRATE_ONLY" = true ]; then
  log "Running migration only..."
fi

# ---------- Run Database Migrations ----------

log "Running database migrations..."
MIGRATION_TASK=$(aws ecs run-task \
  --cluster "$ECS_CLUSTER" \
  --task-definition "$MIGRATE_TASK_ARN" \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[$PRIVATE_SUBNETS],securityGroups=[$ECS_SG],assignPublicIp=DISABLED}" \
  --query 'tasks[0].taskArn' \
  --output text)

log "Migration task started: $MIGRATION_TASK"
log "Waiting for migration to complete..."

aws ecs wait tasks-stopped --cluster "$ECS_CLUSTER" --tasks "$MIGRATION_TASK"

EXIT_CODE=$(aws ecs describe-tasks \
  --cluster "$ECS_CLUSTER" \
  --tasks "$MIGRATION_TASK" \
  --query 'tasks[0].containers[0].exitCode' \
  --output text)

if [ "$EXIT_CODE" != "0" ]; then
  err "Migration failed with exit code $EXIT_CODE"
  err "Check logs: aws logs tail /ecs/eternal-sentinel/migrate --follow"
  exit 1
fi

log "Migration completed successfully."

if [ "$MIGRATE_ONLY" = true ]; then
  log "Done (migrate-only mode)."
  exit 0
fi

# ---------- Deploy ECS Services ----------

log "Updating app service..."
aws ecs update-service \
  --cluster "$ECS_CLUSTER" \
  --service "${ECS_CLUSTER%-cluster}-app" \
  --force-new-deployment \
  --query 'service.serviceName' \
  --output text

log "Updating worker service..."
aws ecs update-service \
  --cluster "$ECS_CLUSTER" \
  --service "${ECS_CLUSTER%-cluster}-worker" \
  --force-new-deployment \
  --query 'service.serviceName' \
  --output text

log "Deployment initiated. Services will rolling-update over the next few minutes."
log "Monitor with: aws ecs describe-services --cluster $ECS_CLUSTER --services ${ECS_CLUSTER%-cluster}-app ${ECS_CLUSTER%-cluster}-worker --query 'services[].{name:serviceName,running:runningCount,desired:desiredCount,status:status}'"

ALB_DNS=$(terraform -chdir="$INFRA_DIR" output -raw alb_dns_name 2>/dev/null || echo "")
if [ -n "$ALB_DNS" ]; then
  log "App will be available at: http://$ALB_DNS"
fi

log "Deploy complete!"
