#!/bin/bash
# Set Railway environment variables for SolvencyProof deployment
# Usage: ./scripts/set-railway-env.sh

echo "Setting Railway environment variables..."

# Algorand Configuration
railway variables set ALGORAND_NODE_URL="https://testnet-api.algonode.cloud"
railway variables set ALGORAND_ALGOD_URL="https://testnet-api.algonode.cloud"
railway variables set ALGORAND_ALGOD_TOKEN=""
railway variables set ALGORAND_ALGOD_PORT="443"
railway variables set ALGORAND_INDEXER_URL="https://testnet-idx.algonode.cloud"
railway variables set ALGORAND_APP_ID="758634127"
railway variables set SOLVENT_REGISTRY_APP_ID="758634127"
railway variables set ALGO_MNEMONIC="fit able fancy intact twist together wear weather vapor party bunker cliff custom zero apple plate mobile little term figure rent vacant fatal absent skate"
railway variables set ALGORAND_ADAPTER_ENABLED="true"
railway variables set ENTITY_ID="compliledger-entity-01"

# Backend Configuration
railway variables set NODE_ENV="production"
railway variables set PORT="3001"
railway variables set API_PORT="3001"

echo "✅ Environment variables set successfully!"
echo ""
echo "Next steps:"
echo "1. Verify in Railway dashboard: https://railway.app/dashboard"
echo "2. Trigger redeploy if needed"
echo "3. Check deployment logs"
