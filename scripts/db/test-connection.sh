#!/bin/bash

# Test Docker Compose Services Connection
# This script tests if the PostgreSQL and pgAdmin services are running and accessible

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker first."
    exit 1
fi

print_status "Testing Docker Compose services..."

# Check if containers are running
print_status "Checking container status..."

if docker compose -f docker-compose.dev.yml ps | grep -q "futura-postgres-dev.*Up"; then
    print_success "PostgreSQL container is running"
else
    print_error "PostgreSQL container is not running"
    exit 1
fi

if docker compose -f docker-compose.dev.yml ps | grep -q "futura-pgadmin-dev.*Up"; then
    print_success "pgAdmin container is running"
else
    print_error "pgAdmin container is not running"
    exit 1
fi

# Test PostgreSQL connection
print_status "Testing PostgreSQL connection..."

if docker exec futura-postgres-dev pg_isready -U futura_user -d futura_dev > /dev/null 2>&1; then
    print_success "PostgreSQL is ready and accepting connections"
else
    print_error "PostgreSQL is not ready"
    exit 1
fi

# Test database connection with psql
print_status "Testing database query..."

if docker exec futura-postgres-dev psql -U futura_user -d futura_dev -c "SELECT 1;" > /dev/null 2>&1; then
    print_success "Database query successful"
else
    print_error "Database query failed"
    exit 1
fi

# Test pgAdmin web interface
print_status "Testing pgAdmin web interface..."

if curl -s -o /dev/null -w "%{http_code}" http://localhost:5050 | grep -q "200\|302"; then
    print_success "pgAdmin web interface is accessible at http://localhost:5050"
else
    print_warning "pgAdmin web interface might not be ready yet (this is normal on first startup)"
fi

# Show connection details
echo ""
print_status "Connection Details:"
echo "  PostgreSQL: postgresql://futura_user:futura_password@localhost:5432/futura_dev"
echo "  pgAdmin: http://localhost:5050 (admin@futura.local / admin)"
echo ""

print_success "All services are running and accessible! 🚀"
