# Azure Deployment Guide

## Prerequisites

1. [Azure CLI](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli) installed
2. [Docker](https://www.docker.com/products/docker-desktop) installed (for worker deployment)
3. An Azure subscription

## Quick Start

```bash
# 1. Login to Azure
az login

# 2. Make scripts executable
chmod +x *.sh

# 3. Create Azure resources
./setup.sh

# 4. Add your API keys to azure.env
# Edit: RESEND_API_KEY, TWILIO_*, STRIPE_*, etc.

# 5. Configure app settings
./configure-app.sh

# 6. Deploy the app
./deploy-app.sh

# 7. Run database migrations
DATABASE_URL="<from azure.env>" npx prisma migrate deploy

# 8. Deploy the worker (optional, for background jobs)
./deploy-worker.sh
```

## Scripts

| Script | Description |
|--------|-------------|
| `setup.sh` | Creates all Azure resources (PostgreSQL, Redis, App Service, Container Apps) |
| `configure-app.sh` | Sets environment variables on App Service |
| `deploy-app.sh` | Builds and deploys the Next.js app |
| `deploy-worker.sh` | Builds and deploys the worker to Container Apps |
| `teardown.sh` | Deletes all Azure resources |

## Files Created

After running `setup.sh`:
- `azure.env` - Environment variables with connection strings (DO NOT COMMIT)

## GitHub Actions CI/CD

For automated deployments:

1. Create an Azure Service Principal:
   ```bash
   az ad sp create-for-rbac --name "sentinel-github" --role contributor \
     --scopes /subscriptions/<subscription-id>/resourceGroups/sentinel-rg \
     --sdk-auth
   ```

2. Add GitHub Secrets:
   - `AZURE_CREDENTIALS` - The JSON output from above
   - `DATABASE_URL` - PostgreSQL connection string

3. Push to `main` branch to trigger deployment

## Resource Configuration

Default resources (can be modified in setup.sh):

| Resource | SKU | Estimated Cost |
|----------|-----|----------------|
| PostgreSQL | Standard_B1ms | ~$15/month |
| Redis | Basic C0 | ~$16/month |
| App Service | B1 | ~$13/month |
| Container Apps | Consumption | ~$5/month |

**Total: ~$50/month** (basic tier)

## Scaling

To scale for production:

```bash
# Upgrade PostgreSQL
az postgres flexible-server update \
  --resource-group sentinel-rg \
  --name sentinel-db \
  --sku-name Standard_D2s_v3

# Upgrade App Service
az appservice plan update \
  --name eternal-sentinel-plan \
  --resource-group sentinel-rg \
  --sku P1V2

# Scale Redis
az redis update \
  --name sentinel-redis \
  --resource-group sentinel-rg \
  --sku Standard \
  --vm-size c1
```

## Troubleshooting

### View App Logs
```bash
az webapp log tail --resource-group sentinel-rg --name eternal-sentinel
```

### View Worker Logs
```bash
az containerapp logs show --name eternal-sentinel-worker --resource-group sentinel-rg --follow
```

### SSH into App Service
```bash
az webapp ssh --resource-group sentinel-rg --name eternal-sentinel
```

### Check Database Connection
```bash
az postgres flexible-server connect \
  --name sentinel-db \
  --admin-user sentineladmin \
  --admin-password <password> \
  --database-name eternal_sentinel
```
