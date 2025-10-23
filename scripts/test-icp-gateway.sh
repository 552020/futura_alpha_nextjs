#!/bin/bash
# ICP Gateway Test Script
# Tests both ic0.app and icp0.io gateways for canister accessibility

set -e

# Configuration
CANISTER_ID="izhgj-eiaaa-aaaaj-a2f7q-cai"
TEST_ASSET_ID="test-memory-id"
TEST_TOKEN="test-token"

echo "🧪 Testing ICP Gateway Accessibility"
echo "=================================="

# Test icp0.io gateway (should work)
echo "Testing icp0.io gateway..."
ICP0_URL="https://${CANISTER_ID}.icp0.io/asset/${TEST_ASSET_ID}/display?token=${TEST_TOKEN}"
echo "URL: $ICP0_URL"

if curl -sI "$ICP0_URL" | grep -q " 200\| 206\| 404"; then
    echo "✅ icp0.io gateway: ACCESSIBLE"
else
    echo "❌ icp0.io gateway: NOT ACCESSIBLE"
    exit 1
fi

# Test ic0.app gateway (should fail with 400)
echo ""
echo "Testing ic0.app gateway..."
IC0_URL="https://${CANISTER_ID}.ic0.app/asset/${TEST_ASSET_ID}/display?token=${TEST_TOKEN}"
echo "URL: $IC0_URL"

if curl -sI "$IC0_URL" | grep -q " 400"; then
    echo "✅ ic0.app gateway: Expected 400 error (not available through this gateway)"
else
    echo "⚠️  ic0.app gateway: Unexpected response"
fi

echo ""
echo "🎯 Recommendation: Use icp0.io gateway for production"
echo "✅ Test completed successfully"
