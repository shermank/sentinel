#!/bin/bash
set -e

# ===========================================
# Deploy Worker to Azure Container Apps
# ===========================================

RESOURCE_GROUP="sentinel-rg"
APP_NAME="eternal-sentinel"
WORKER_NAME="${APP_NAME}-worker"
REGISTRY_NAME="${APP_NAME//-/}registry"  # Remove hyphens for registry name
SCRIPT_DIR="$(dirname "$0")"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
ENV_FILE="$SCRIPT_DIR/azure.env"

echo "============================================"
echo "Deploying Worker to Azure Container Apps"
echo "============================================"
echo ""

cd "$PROJECT_DIR"

# Check if env file exists
if [ ! -f "$ENV_FILE" ]; then
    echo "Error: azure.env not found"
    echo "Run setup.sh first"
    exit 1
fi

echo "[1/5] Creating Azure Container Registry..."
az acr create \
    --resource-group $RESOURCE_GROUP \
    --name $REGISTRY_NAME \
    --sku Basic \
    --admin-enabled true \
    --output none 2>/dev/null || echo "Registry already exists"

# Get registry credentials
REGISTRY_SERVER="${REGISTRY_NAME}.azurecr.io"
REGISTRY_USERNAME=$(az acr credential show --name $REGISTRY_NAME --query username -o tsv)
REGISTRY_PASSWORD=$(az acr credential show --name $REGISTRY_NAME --query "passwords[0].value" -o tsv)

echo "[2/5] Building Docker image..."
docker build -t "${REGISTRY_SERVER}/${WORKER_NAME}:latest" -f Dockerfile.worker .

echo "[3/5] Pushing to Azure Container Registry..."
docker login $REGISTRY_SERVER -u $REGISTRY_USERNAME -p $REGISTRY_PASSWORD
docker push "${REGISTRY_SERVER}/${WORKER_NAME}:latest"

echo "[4/5] Reading environment variables..."
# Build env vars for container app
declare -a ENV_VARS

while IFS= read -r line || [ -n "$line" ]; do
    [[ "$line" =~ ^#.*$ ]] && continue
    [[ -z "$line" ]] && continue

    if [[ "$line" =~ ^([A-Z_]+)=(.*)$ ]]; then
        key="${BASH_REMATCH[1]}"
        value="${BASH_REMATCH[2]}"
        value="${value%\"}"
        value="${value#\"}"

        if [ -n "$value" ]; then
            ENV_VARS+=("$key=$value")
        fi
    fi
done < "$ENV_FILE"

echo "[5/5] Deploying Container App..."
az containerapp create \
    --name $WORKER_NAME \
    --resource-group $RESOURCE_GROUP \
    --environment "${APP_NAME}-env" \
    --image "${REGISTRY_SERVER}/${WORKER_NAME}:latest" \
    --registry-server $REGISTRY_SERVER \
    --registry-username $REGISTRY_USERNAME \
    --registry-password $REGISTRY_PASSWORD \
    --min-replicas 1 \
    --max-replicas 1 \
    --cpu 0.5 \
    --memory 1.0Gi \
    --env-vars "${ENV_VARS[@]}" \
    --output none

echo ""
echo "============================================"
echo "Worker Deployed Successfully!"
echo "============================================"
echo ""
echo "View logs:"
echo "  az containerapp logs show --name $WORKER_NAME --resource-group $RESOURCE_GROUP --follow"
