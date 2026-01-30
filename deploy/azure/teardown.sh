#!/bin/bash
set -e

# ===========================================
# Teardown Azure Resources
# ===========================================

RESOURCE_GROUP="sentinel-rg"

echo "============================================"
echo "WARNING: This will DELETE all resources in:"
echo "  Resource Group: $RESOURCE_GROUP"
echo "============================================"
echo ""
echo "This includes:"
echo "  - PostgreSQL database and all data"
echo "  - Redis cache"
echo "  - App Service and deployment"
echo "  - Container Apps and registry"
echo ""
read -p "Are you sure? Type 'DELETE' to confirm: " -r
echo

if [[ ! $REPLY == "DELETE" ]]; then
    echo "Cancelled"
    exit 1
fi

echo "Deleting resource group..."
az group delete \
    --name $RESOURCE_GROUP \
    --yes \
    --no-wait

echo ""
echo "Deletion initiated. Resources will be removed in a few minutes."
echo "Check status: az group show --name $RESOURCE_GROUP"
