#!/bin/bash

# Test script for Storage Edges API
# This script tests the PUT and GET endpoints for /api/storage/edges

echo "🧪 Testing Storage Edges API Endpoints"
echo "======================================"

# Test data
MEMORY_ID="550e8400-e29b-41d4-a716-446655440000"
BASE_URL="http://localhost:3000/api/storage/edges"

echo ""
echo "1️⃣ Testing PUT /api/storage/edges (Create storage edge)"
echo "--------------------------------------------------------"
curl -X PUT "$BASE_URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"memoryId\": \"$MEMORY_ID\",
    \"memoryType\": \"image\",
    \"artifact\": \"metadata\",
    \"backend\": \"neon-db\",
    \"present\": true,
    \"location\": \"neon://test/metadata\"
  }" | jq '.'

echo ""
echo ""
echo "2️⃣ Testing GET /api/storage/edges (Retrieve storage edge)"
echo "----------------------------------------------------------"
curl "$BASE_URL?memoryId=$MEMORY_ID" | jq '.'

echo ""
echo ""
echo "3️⃣ Testing PUT /api/storage/edges (Error handling - invalid UUID)"
echo "------------------------------------------------------------------"
curl -X PUT "$BASE_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "memoryId": "invalid-uuid",
    "memoryType": "image",
    "artifact": "metadata",
    "backend": "neon-db",
    "present": true
  }' | jq '.'

echo ""
echo ""
echo "4️⃣ Testing PUT /api/storage/edges (Error handling - missing fields)"
echo "-------------------------------------------------------------------"
curl -X PUT "$BASE_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "present": true
  }' | jq '.'

echo ""
echo ""
echo "5️⃣ Testing GET /api/storage/edges (All storage edges)"
echo "-----------------------------------------------------"
curl "$BASE_URL" | jq '.'

echo ""
echo ""
echo "✅ API Testing Complete!"
echo "======================="
