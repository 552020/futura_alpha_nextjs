#!/bin/bash

# Futura Alpha ICP - PostgreSQL Development Setup Script
# This script sets up the local PostgreSQL development environment with Docker

set -e

echo "🐳 Setting up PostgreSQL development environment..."

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

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker compose &> /dev/null; then
    print_error "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Check if npm is available
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install Node.js first."
    exit 1
fi

print_status "Starting Docker services (PostgreSQL + pgAdmin)..."

# Start Docker services
docker compose -f docker-compose.dev.yml up -d

print_status "Waiting for PostgreSQL to be ready..."

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL..."
until docker compose -f docker-compose.dev.yml exec postgres pg_isready -U futura_user -d futura_dev; do
    echo "PostgreSQL is unavailable - sleeping"
    sleep 2
done

print_success "PostgreSQL is ready!"

# Run quick test
print_status "Running quick health check..."
./scripts/db/quick-test.sh

# Run comprehensive test
print_status "Running comprehensive connection test..."
./scripts/db/test-connection.sh

print_status "Running database migrations..."

# Run migrations
npm run db:migrate

print_success "🎉 PostgreSQL development environment is ready!"
print_status "Services available at:"
echo "  - PostgreSQL: localhost:5432"
echo "  - pgAdmin: http://localhost:5050 (admin@example.com / admin)"
echo ""
print_status "Next steps:"
echo "  1. Update your .env.local with Docker database URLs"
echo "  2. Start Next.js: npm run dev"
echo "  3. Access pgAdmin: http://localhost:5050"
echo ""
print_status "Useful commands:"
echo "  - Stop services: docker compose -f docker-compose.dev.yml down"
echo "  - View logs: docker compose -f docker-compose.dev.yml logs -f"
echo "  - Reset database: docker compose -f docker-compose.dev.yml down -v && docker compose -f docker-compose.dev.yml up -d"