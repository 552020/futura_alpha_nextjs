#!/bin/bash

# Test script for bulk deletion endpoint
# Usage: ./scripts/test-bulk-delete.sh

BASE_URL="http://localhost:3000"

echo "🧪 Testing Bulk Delete Endpoint"
echo ""

echo "📋 Available test cases:"
echo "1. Delete all memories"
echo "2. Delete all images"
echo "3. Delete all documents"
echo "4. Delete all notes"
echo "5. Delete all videos"
echo "6. Delete all audio"
echo "7. Delete folder contents"
echo ""

echo "🚀 Example curl commands:"
echo ""

echo "# Delete all memories"
echo "curl -X DELETE \"$BASE_URL/api/memories?all=true\" \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -b \"your-session-cookie\""
echo ""

echo "# Delete all images"
echo "curl -X DELETE \"$BASE_URL/api/memories?type=image\" \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -b \"your-session-cookie\""
echo ""

echo "# Delete all documents"
echo "curl -X DELETE \"$BASE_URL/api/memories?type=document\" \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -b \"your-session-cookie\""
echo ""

echo "# Delete all notes"
echo "curl -X DELETE \"$BASE_URL/api/memories?type=note\" \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -b \"your-session-cookie\""
echo ""

echo "# Delete all videos"
echo "curl -X DELETE \"$BASE_URL/api/memories?type=video\" \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -b \"your-session-cookie\""
echo ""

echo "# Delete all audio"
echo "curl -X DELETE \"$BASE_URL/api/memories?type=audio\" \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -b \"your-session-cookie\""
echo ""

echo "# Delete folder contents"
echo "curl -X DELETE \"$BASE_URL/api/memories?folder=wedding\" \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -b \"your-session-cookie\""
echo ""

echo "📝 Note: You need to be authenticated to use these endpoints."
echo "   The endpoints will only delete memories owned by the authenticated user."
echo ""
echo "💡 To get your session cookie, check your browser's developer tools."
