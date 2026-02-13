#!/bin/bash
set -e

# ===========================================
# Configure Azure App Service Environment
# ===========================================

RESOURCE_GROUP="sentinel-rg"
APP_NAME="eternal-sentinel"
ENV_FILE="$(dirname "$0")/azure.env"

if [ ! -f "$ENV_FILE" ]; then
    echo "Error: azure.env not found"
    echo "Run setup.sh first or create azure.env manually"
    exit 1
fi

echo "Loading environment from $ENV_FILE..."

# Read env file and set app settings
declare -a SETTINGS

while IFS= read -r line || [ -n "$line" ]; do
    # Skip comments and empty lines
    [[ "$line" =~ ^#.*$ ]] && continue
    [[ -z "$line" ]] && continue

    # Extract key=value
    if [[ "$line" =~ ^([A-Z_]+)=(.*)$ ]]; then
        key="${BASH_REMATCH[1]}"
        value="${BASH_REMATCH[2]}"
        # Remove surrounding quotes
        value="${value%\"}"
        value="${value#\"}"

        if [ -n "$value" ]; then
            SETTINGS+=("$key=$value")
            echo "  Setting: $key"
        fi
    fi
done < "$ENV_FILE"

if [ ${#SETTINGS[@]} -eq 0 ]; then
    echo "No settings found in env file"
    exit 1
fi

echo ""
echo "Configuring App Service with ${#SETTINGS[@]} settings..."

az webapp config appsettings set \
    --resource-group $RESOURCE_GROUP \
    --name $APP_NAME \
    --settings "${SETTINGS[@]}" \
    --output none

echo ""
echo "Configuration complete!"
echo ""
echo "View settings at:"
echo "  https://portal.azure.com/#@/resource/subscriptions/*/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.Web/sites/$APP_NAME/configuration"
