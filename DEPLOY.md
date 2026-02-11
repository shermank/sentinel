# Deploying Eternal Sentinel to AWS

This guide walks you through deploying the full application to AWS using Terraform and ECS Fargate.

## Architecture Overview

```
Internet
    │
    ▼
┌─────────┐     ┌──────────────────────────────┐
│   ALB   │────▶│  ECS Fargate (Private Subnet) │
│ (HTTPS) │     │                                │
└─────────┘     │  ┌─────────┐  ┌────────────┐  │
                │  │ Next.js │  │   Worker    │  │
                │  │  App x2 │  │  (BullMQ)  │  │
                │  └────┬────┘  └─────┬──────┘  │
                └───────┼─────────────┼─────────┘
                        │             │
                ┌───────▼─────────────▼─────────┐
                │  RDS Aurora PostgreSQL         │
                │  ElastiCache Redis             │
                │  (Private Subnet)              │
                └───────────────────────────────┘
```

## Prerequisites

Install these tools on your local machine:

1. **AWS CLI v2** - https://aws.amazon.com/cli/
2. **Terraform >= 1.5** - https://www.terraform.io/downloads
3. **Docker** - https://docs.docker.com/get-docker/
4. **jq** - `brew install jq` (macOS) or `apt install jq` (Linux)

## Step 1: Configure AWS Credentials

```bash
# Option A: Configure a profile
aws configure --profile eternal-sentinel
# Enter your Access Key ID, Secret Access Key, region (us-east-1), output (json)

# Then export it for this session
export AWS_PROFILE=eternal-sentinel

# Option B: Use environment variables
export AWS_ACCESS_KEY_ID="your-access-key"
export AWS_SECRET_ACCESS_KEY="your-secret-key"
export AWS_DEFAULT_REGION="us-east-1"
```

Verify access:
```bash
aws sts get-caller-identity
```

Your IAM user/role needs these permissions (or use `AdministratorAccess` for initial setup):
- VPC, EC2 (networking, security groups)
- ECS, ECR (container services)
- RDS (database)
- ElastiCache (Redis)
- Secrets Manager
- CloudWatch Logs
- IAM (create roles)
- Elastic Load Balancing

## Step 2: Generate Secrets

Generate the application secrets you'll need:

```bash
# NextAuth secret
openssl rand -base64 32

# Server-side encryption key
openssl rand -hex 32
```

## Step 3: Configure Terraform Variables

```bash
cd infra

# Copy the example variables file
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars` and fill in your values:

```bash
# Required values to set:
# - auth_secret        (from Step 2)
# - encryption_key     (from Step 2)
# - email_from         (your sending email address)
#
# Optional but recommended:
# - domain_name + certificate_arn  (for custom domain with HTTPS)
# - auth_google_id/secret          (for Google login)
# - resend_api_key                 (for email notifications)
# - twilio_*                       (for SMS notifications)
# - stripe_*                       (for premium subscriptions)
```

> **IMPORTANT**: Never commit `terraform.tfvars` to git. It contains secrets. The `.gitignore` should exclude `*.tfvars`.

## Step 4: Provision Infrastructure

```bash
cd infra

# Initialize Terraform (downloads providers)
terraform init

# Preview what will be created
terraform plan

# Create all AWS resources (takes 10-15 min for RDS + ElastiCache)
terraform apply
```

Type `yes` when prompted. Terraform will create:
- VPC with public/private subnets across 2 AZs
- NAT Gateway for outbound internet from private subnets
- Application Load Balancer (public)
- RDS Aurora PostgreSQL Serverless v2
- ElastiCache Redis
- ECR repositories for app and worker images
- ECS Fargate cluster with app + worker services
- Secrets Manager with all application secrets
- CloudWatch log groups
- All required IAM roles and security groups

Save the outputs:
```bash
terraform output
# Note the alb_dns_name - this is your app's URL
```

## Step 5: Build and Deploy

From the project root:

```bash
# First deployment (builds images, runs migrations, deploys services)
./scripts/deploy.sh
```

This script:
1. Authenticates Docker with ECR
2. Builds the app and worker Docker images
3. Pushes images to ECR
4. Runs database migrations via a one-off ECS task
5. Forces a new deployment of both ECS services

The deployment takes 3-5 minutes for the rolling update to complete.

## Step 6: Verify

```bash
# Get your app URL
cd infra && terraform output alb_dns_name

# Test the health endpoint
curl http://<alb-dns-name>/api/health
# Should return: {"status":"ok"}

# Check ECS service status
aws ecs describe-services \
  --cluster eternal-sentinel-cluster \
  --services eternal-sentinel-app eternal-sentinel-worker \
  --query 'services[].{name:serviceName,running:runningCount,desired:desiredCount}'

# View app logs
aws logs tail /ecs/eternal-sentinel/app --follow

# View worker logs
aws logs tail /ecs/eternal-sentinel/worker --follow
```

## Custom Domain Setup (Optional)

### Option A: Using Route 53

1. **Request an ACM certificate:**
   ```bash
   aws acm request-certificate \
     --domain-name sentinel.yourdomain.com \
     --validation-method DNS \
     --region us-east-1
   ```

2. **Complete DNS validation** - add the CNAME record ACM gives you to your DNS

3. **Update terraform.tfvars:**
   ```hcl
   domain_name     = "sentinel.yourdomain.com"
   certificate_arn = "arn:aws:acm:us-east-1:123456789:certificate/abc-123..."
   ```

4. **Apply and add DNS:**
   ```bash
   cd infra && terraform apply
   ```
   Then create a CNAME or Alias record pointing `sentinel.yourdomain.com` → the ALB DNS name.

### Option B: Using External DNS (Cloudflare, etc.)

1. Request ACM certificate (same as above, use DNS validation)
2. Add the validation CNAME in your DNS provider
3. Once validated, update `terraform.tfvars` and `terraform apply`
4. Add a CNAME record in your DNS provider pointing to the ALB DNS name

## Updating the Application

After making code changes:

```bash
# Full deploy (rebuild + migrate + restart)
./scripts/deploy.sh

# Skip Docker build (just migrate + restart, if only env vars changed)
./scripts/deploy.sh --skip-build

# Run migrations only (no service restart)
./scripts/deploy.sh --migrate-only
```

## Scaling

Edit `terraform.tfvars` to adjust capacity:

```hcl
# Run more app instances behind the load balancer
app_desired_count = 4
app_cpu           = 1024  # 1 vCPU
app_memory        = 2048  # 2 GB

# Scale the worker
worker_desired_count = 2

# Upgrade database
# Aurora Serverless v2 auto-scales between min/max capacity (set in rds.tf)

# Upgrade Redis
redis_node_type = "cache.t3.small"
```

Then apply:
```bash
cd infra && terraform apply
```

## Monitoring

### CloudWatch Logs

```bash
# App logs (Next.js)
aws logs tail /ecs/eternal-sentinel/app --follow

# Worker logs (BullMQ jobs)
aws logs tail /ecs/eternal-sentinel/worker --follow

# Migration logs
aws logs tail /ecs/eternal-sentinel/migrate --follow
```

### ECS Service Health

```bash
# Service status
aws ecs describe-services \
  --cluster eternal-sentinel-cluster \
  --services eternal-sentinel-app eternal-sentinel-worker \
  --query 'services[].{name:serviceName,status:status,running:runningCount,desired:desiredCount,deployments:deployments[].{status:status,running:runningCount,desired:desiredCount}}'

# List running tasks
aws ecs list-tasks --cluster eternal-sentinel-cluster
```

### Database

```bash
# Connect to RDS via a bastion or SSM Session Manager:
# (RDS is in a private subnet and not directly accessible)
psql "$(cd infra && terraform output -raw rds_endpoint)"
```

## Cost Estimate (Minimal Setup)

| Resource | Monthly Cost |
|---|---|
| ECS Fargate (app 0.5 vCPU x2) | ~$30 |
| ECS Fargate (worker 0.25 vCPU x1) | ~$8 |
| Aurora Serverless v2 (0.5 ACU min) | ~$22 |
| ElastiCache (cache.t3.micro) | ~$12 |
| NAT Gateway | ~$32 |
| ALB | ~$16 |
| **Total** | **~$120/mo** |

To reduce costs:
- Use a single AZ (modify `availability_zones` in tfvars) - less resilient but cheaper
- Use `app_desired_count = 1` during early stages
- Consider NAT instance instead of NAT Gateway ($4/mo vs $32/mo)

## Teardown

To destroy all AWS resources:

```bash
cd infra

# First, disable deletion protection on RDS
# (Edit rds.tf: set deletion_protection = false, then terraform apply)

terraform destroy
```

> **WARNING**: This permanently deletes all data including the database. Make sure you have backups.

## Troubleshooting

### ECS tasks keep restarting
```bash
# Check task stopped reason
aws ecs describe-tasks \
  --cluster eternal-sentinel-cluster \
  --tasks $(aws ecs list-tasks --cluster eternal-sentinel-cluster --query 'taskArns[0]' --output text) \
  --query 'tasks[0].{status:lastStatus,reason:stoppedReason,containers:containers[].{name:name,exit:exitCode,reason:reason}}'
```

### Can't connect to database
- Verify ECS tasks are in the same VPC/private subnets as RDS
- Check security group allows port 5432 from ECS SG
- Check DATABASE_URL in Secrets Manager is correct

### Health check failing
- Ensure `/api/health` route exists and returns 200
- Check app logs for startup errors
- Verify the container port is 3000

### Migration failed
```bash
# Check migration logs
aws logs tail /ecs/eternal-sentinel/migrate --since 1h
```

### Docker push auth errors
```bash
# Re-authenticate
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com
```
