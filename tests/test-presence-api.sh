#!/bin/bash

# Test script for Presence and Sync Status API Endpoints
# This script tests the gallery presence, memory presence, and sync status endpoints

echo "🧪 Testing Presence and Sync Status API Endpoints"
echo "================================================="

# Test data
GALLERY_ID="550e8400-e29b-41d4-a716-446655440001"
MEMORY_ID="550e8400-e29b-41d4-a716-446655440000"
MEMORY_TYPE="image"

echo ""
echo "1️⃣ Testing GET /api/galleries/:id/presence"
echo "-------------------------------------------"
curl "http://localhost:3000/api/galleries/$GALLERY_ID/presence" | jq '.'

echo ""
echo ""
echo "2️⃣ Testing GET /api/memories/presence"
echo "--------------------------------------"
curl "http://localhost:3000/api/memories/presence?type=$MEMORY_TYPE&id=$MEMORY_ID" | jq '.'

echo ""
echo ""
echo "3️⃣ Testing GET /api/storage/sync-status (All active syncs)"
echo "-----------------------------------------------------------"
curl "http://localhost:3000/api/storage/sync-status" | jq '.'

echo ""
echo ""
echo "4️⃣ Testing GET /api/storage/sync-status (Stuck syncs only)"
echo "-----------------------------------------------------------"
curl "http://localhost:3000/api/storage/sync-status?stuck=true" | jq '.'

echo ""
echo ""
echo "5️⃣ Testing GET /api/storage/sync-status (By backend)"
echo "----------------------------------------------------"
curl "http://localhost:3000/api/storage/sync-status?backend=icp-canister" | jq '.'

echo ""
echo ""
echo "6️⃣ Testing GET /api/storage/sync-status (By memory type)"
echo "--------------------------------------------------------"
curl "http://localhost:3000/api/storage/sync-status?memoryType=image" | jq '.'

echo ""
echo ""
echo "7️⃣ Testing Error Handling - Invalid Gallery ID"
echo "-----------------------------------------------"
curl "http://localhost:3000/api/galleries/invalid-uuid/presence" | jq '.'

echo ""
echo ""
echo "8️⃣ Testing Error Handling - Invalid Memory Type"
echo "------------------------------------------------"
curl "http://localhost:3000/api/memories/presence?type=invalid-type&id=$MEMORY_ID" | jq '.'

echo ""
echo ""
echo "✅ API Testing Complete!"
echo "======================="
