#!/bin/bash

# ===========================================
# Azure Login Script
# ===========================================

echo "============================================"
echo "Azure Login"
echo "============================================"
echo ""

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
    echo "Azure CLI is not installed."
    echo ""
    echo "Install options:"
    echo ""
    echo "  macOS:   brew install azure-cli"
    echo "  Windows: winget install Microsoft.AzureCLI"
    echo "  Linux:   curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash"
    echo ""
    echo "Or visit: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
    exit 1
fi

# Check if already logged in
if az account show &> /dev/null; then
    ACCOUNT=$(az account show --query name -o tsv)
    USER=$(az account show --query user.name -o tsv)
    echo "Already logged in as: $USER"
    echo "Subscription: $ACCOUNT"
    echo ""
    read -p "Switch account? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo ""
        echo "Current subscriptions:"
        az account list --output table
        exit 0
    fi
fi

echo ""
echo "Opening browser for login..."
echo ""

# Login
az login

echo ""
echo "============================================"
echo "Login Successful!"
echo "============================================"
echo ""

# Show account info
echo "Logged in as: $(az account show --query user.name -o tsv)"
echo "Subscription: $(az account show --query name -o tsv)"
echo ""

# List subscriptions if multiple
SUB_COUNT=$(az account list --query "length(@)")
if [ "$SUB_COUNT" -gt 1 ]; then
    echo "Available subscriptions:"
    az account list --output table
    echo ""
    echo "To switch subscription:"
    echo "  az account set --subscription \"<subscription-name-or-id>\""
fi
