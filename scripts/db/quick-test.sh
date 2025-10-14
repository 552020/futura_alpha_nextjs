#!/bin/bash

# Quick Docker Services Test
# Simple script to check if services are up and show basic info

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🐳 Docker Services Quick Test${NC}"
echo "================================"

# Check containers
echo "📦 Container Status:"
docker compose -f docker-compose.dev.yml ps

echo ""
echo "🔗 Service URLs:"
echo "  PostgreSQL: localhost:5432"
echo "  pgAdmin: http://localhost:5050"

echo ""
echo "📊 Quick Health Check:"

# Test PostgreSQL
if docker exec futura-postgres-dev pg_isready -U futura_user > /dev/null 2>&1; then
    echo -e "  PostgreSQL: ${GREEN}✅ Ready${NC}"
else
    echo -e "  PostgreSQL: ${RED}❌ Not Ready${NC}"
fi

# Test pgAdmin
if curl -s http://localhost:5050 > /dev/null 2>&1; then
    echo -e "  pgAdmin: ${GREEN}✅ Accessible${NC}"
else
    echo -e "  pgAdmin: ${RED}❌ Not Accessible${NC}"
fi

echo ""
echo "💡 To run full tests: ./scripts/db/test-connection.sh"
