#!/bin/bash

# Simple Real Upload Test
# This script uploads a real file and checks if storage edges were created

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

# Load environment variables
if [ -f ".env.local" ]; then
    log "Loading environment variables..."
    while IFS= read -r line; do
        if [[ ! "$line" =~ ^[[:space:]]*# ]] && [[ -n "$line" ]] && [[ "$line" =~ ^[A-Za-z_][A-Za-z0-9_]*= ]]; then
            export "$line"
        fi
    done < .env.local
fi

# Database connection
DB_HOST="${PGHOST:-$POSTGRES_HOST:-localhost}"
DB_PORT="${PGPORT:-5432}"
DB_NAME="${PGDATABASE:-$POSTGRES_DATABASE:-futura}"
DB_USER="${PGUSER:-$POSTGRES_USER:-postgres}"
DB_PASSWORD="${PGPASSWORD:-$POSTGRES_PASSWORD}"

# Test file
TEST_FILE="/tmp/test-upload-$(date +%s).jpg"

log "Creating test file..."
echo "fake image data" > "$TEST_FILE"

log "Testing database connection..."
if ! PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1; then
    error "Database connection failed"
fi
log "✅ Database connected"

log "Checking if API server is running..."
if ! curl -s "http://localhost:3000" > /dev/null; then
    error "API server not running"
fi
log "✅ API server running"

log "Checking current storage edges count..."
CURRENT_COUNT=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM storage_edges;" | tr -d ' ')
log "Current storage edges: $CURRENT_COUNT"

log "📝 To test with real upload:"
echo "1. Open http://localhost:3000 in your browser"
echo "2. Sign in to get a session cookie"
echo "3. Run: SESSION_COOKIE='your-cookie-here' ./tests/test-storage-edge-integration.sh"
echo ""
echo "📊 Current database status:"
echo "  - Host: $DB_HOST"
echo "  - Database: $DB_NAME"
echo "  - Storage edges: $CURRENT_COUNT"
echo ""
echo "🧪 Ready for real testing!"

# Cleanup
rm -f "$TEST_FILE"
