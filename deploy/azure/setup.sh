#!/bin/bash
set -e

# ===========================================
# Eternal Sentinel - Azure Deployment Script
# ===========================================

# Configuration - UPDATE THESE VALUES
RESOURCE_GROUP="sentinel-rg"
LOCATION="westus2"
APP_NAME="eternal-sentinel"  # Must be globally unique
DB_NAME="sentinel-db"
REDIS_NAME="sentinel-redis"
DB_ADMIN_USER="sentineladmin"

# Generate secure passwords
DB_PASSWORD=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 24)
AUTH_SECRET=$(openssl rand -base64 32)
ENCRYPTION_KEY=$(openssl rand -hex 32)

echo "============================================"
echo "Eternal Sentinel - Azure Deployment"
echo "============================================"
echo ""
echo "This script will create:"
echo "  - Resource Group: $RESOURCE_GROUP"
echo "  - PostgreSQL Flexible Server: $DB_NAME"
echo "  - Redis Cache: $REDIS_NAME"
echo "  - App Service: $APP_NAME"
echo "  - Container App (Worker): ${APP_NAME}-worker"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
fi

# Check Azure CLI is installed and logged in
if ! command -v az &> /dev/null; then
    echo "Error: Azure CLI is not installed"
    echo "Install from: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
    exit 1
fi

if ! az account show &> /dev/null; then
    echo "Please login to Azure first:"
    az login
fi

echo ""
echo "[1/7] Creating Resource Group..."
az group create \
    --name $RESOURCE_GROUP \
    --location $LOCATION \
    --output none

echo "[2/7] Creating PostgreSQL Flexible Server..."
az postgres flexible-server create \
    --resource-group $RESOURCE_GROUP \
    --name $DB_NAME \
    --location $LOCATION \
    --admin-user $DB_ADMIN_USER \
    --admin-password "$DB_PASSWORD" \
    --sku-name Standard_B1ms \
    --tier Burstable \
    --storage-size 32 \
    --version 16 \
    --public-access 0.0.0.0 \
    --output none

echo "Creating database..."
az postgres flexible-server db create \
    --resource-group $RESOURCE_GROUP \
    --server-name $DB_NAME \
    --database-name eternal_sentinel \
    --output none

echo "[3/7] Creating Redis Cache..."
az redis create \
    --resource-group $RESOURCE_GROUP \
    --name $REDIS_NAME \
    --location $LOCATION \
    --sku Basic \
    --vm-size c0 \
    --output none

echo "[4/7] Creating App Service Plan..."
az appservice plan create \
    --name "${APP_NAME}-plan" \
    --resource-group $RESOURCE_GROUP \
    --sku B1 \
    --is-linux \
    --output none

echo "[5/7] Creating Web App..."
az webapp create \
    --resource-group $RESOURCE_GROUP \
    --plan "${APP_NAME}-plan" \
    --name $APP_NAME \
    --runtime "NODE:20-lts" \
    --output none

# Configure startup command
az webapp config set \
    --resource-group $RESOURCE_GROUP \
    --name $APP_NAME \
    --startup-file "npm run start" \
    --output none

echo "[6/7] Creating Container Apps Environment for Worker..."
az containerapp env create \
    --name "${APP_NAME}-env" \
    --resource-group $RESOURCE_GROUP \
    --location $LOCATION \
    --output none

echo "[7/7] Retrieving connection strings..."

# Get PostgreSQL connection string
DB_HOST="${DB_NAME}.postgres.database.azure.com"
DATABASE_URL="postgresql://${DB_ADMIN_USER}:${DB_PASSWORD}@${DB_HOST}:5432/eternal_sentinel?sslmode=require"

# Get Redis connection string
REDIS_KEY=$(az redis list-keys --resource-group $RESOURCE_GROUP --name $REDIS_NAME --query primaryKey -o tsv)
REDIS_HOST="${REDIS_NAME}.redis.cache.windows.net"
REDIS_URL="rediss://:${REDIS_KEY}@${REDIS_HOST}:6380"

# Get Web App URL
APP_URL="https://${APP_NAME}.azurewebsites.net"

echo ""
echo "============================================"
echo "Resources Created Successfully!"
echo "============================================"
echo ""
echo "Save these credentials securely:"
echo ""
echo "DATABASE_URL=\"$DATABASE_URL\""
echo "REDIS_URL=\"$REDIS_URL\""
echo "AUTH_SECRET=\"$AUTH_SECRET\""
echo "ENCRYPTION_KEY=\"$ENCRYPTION_KEY\""
echo "AUTH_URL=\"$APP_URL\""
echo "NEXT_PUBLIC_APP_URL=\"$APP_URL\""
echo ""
echo "DB Admin Password: $DB_PASSWORD"
echo ""

# Save to env file
ENV_FILE="$(dirname "$0")/azure.env"
cat > "$ENV_FILE" << EOF
# Azure Deployment Environment Variables
# Generated on $(date)
# KEEP THIS FILE SECURE - DO NOT COMMIT TO GIT

# Database
DATABASE_URL="$DATABASE_URL"

# Redis
REDIS_URL="$REDIS_URL"

# Auth
AUTH_SECRET="$AUTH_SECRET"
AUTH_URL="$APP_URL"

# Encryption
ENCRYPTION_KEY="$ENCRYPTION_KEY"

# App URL
NEXT_PUBLIC_APP_URL="$APP_URL"
NODE_ENV=production

# Add your own values for these:
# AUTH_GOOGLE_ID=""
# AUTH_GOOGLE_SECRET=""
# RESEND_API_KEY=""
# EMAIL_FROM=""
# TWILIO_ACCOUNT_SID=""
# TWILIO_AUTH_TOKEN=""
# TWILIO_PHONE_NUMBER=""
# STRIPE_SECRET_KEY=""
# STRIPE_PUBLISHABLE_KEY=""
# STRIPE_WEBHOOK_SECRET=""
# STRIPE_PRICE_ID_MONTHLY=""
# STRIPE_PRICE_ID_YEARLY=""
EOF

echo "Environment variables saved to: $ENV_FILE"
echo ""
echo "Next steps:"
echo "  1. Add your API keys to $ENV_FILE"
echo "  2. Run: ./configure-app.sh"
echo "  3. Run: ./deploy-app.sh"
