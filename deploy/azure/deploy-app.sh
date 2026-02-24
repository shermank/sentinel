#!/bin/bash
set -e

# ===========================================
# Deploy App to Azure App Service
# ===========================================

RESOURCE_GROUP="sentinel-rg"
APP_NAME="eternal-sentinel"
SCRIPT_DIR="$(dirname "$0")"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "============================================"
echo "Deploying Eternal Sentinel to Azure"
echo "============================================"
echo ""

cd "$PROJECT_DIR"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "Error: package.json not found"
    echo "Run this script from the project root or deploy/azure directory"
    exit 1
fi

echo "[1/4] Building application..."
npm run build

echo ""
echo "[2/4] Generating Prisma client..."
npx prisma generate

echo ""
echo "[3/4] Creating deployment package..."
# Create a zip file for deployment
DEPLOY_ZIP="/tmp/sentinel-deploy.zip"
rm -f "$DEPLOY_ZIP"

zip -r "$DEPLOY_ZIP" \
    .next \
    node_modules \
    package.json \
    package-lock.json \
    prisma \
    next.config.ts \
    public \
    -x "node_modules/.cache/*" \
    -x ".next/cache/*"

echo ""
echo "[4/4] Deploying to Azure..."
az webapp deploy \
    --resource-group $RESOURCE_GROUP \
    --name $APP_NAME \
    --src-path "$DEPLOY_ZIP" \
    --type zip \
    --async true

rm -f "$DEPLOY_ZIP"

echo ""
echo "============================================"
echo "Deployment initiated!"
echo "============================================"
echo ""
echo "App URL: https://${APP_NAME}.azurewebsites.net"
echo ""
echo "Monitor deployment:"
echo "  az webapp log tail --resource-group $RESOURCE_GROUP --name $APP_NAME"
echo ""
echo "Don't forget to run database migrations:"
echo "  DATABASE_URL=<your-url> npx prisma migrate deploy"
