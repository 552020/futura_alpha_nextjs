#!/bin/bash

# Futura Alpha ICP - Local Development Setup Script
# This script helps set up the local development environment with Docker

set -e

echo "🚀 Setting up Futura Alpha ICP local development environment..."

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
if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    print_warning "pnpm is not installed. Installing pnpm..."
    npm install -g pnpm
fi

print_status "Environment variables are configured in docker-compose.dev.yml"

print_status "Building and starting Docker services..."

# Build and start services
docker-compose -f docker-compose.dev.yml up --build -d

print_status "Waiting for services to be ready..."

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL..."
until docker-compose -f docker-compose.dev.yml exec postgres pg_isready -U futura_user -d futura_dev; do
    echo "PostgreSQL is unavailable - sleeping"
    sleep 2
done

print_success "PostgreSQL is ready!"

# Wait for Redis to be ready
echo "Waiting for Redis..."
until docker-compose -f docker-compose.dev.yml exec redis redis-cli ping; do
    echo "Redis is unavailable - sleeping"
    sleep 2
done

print_success "Redis is ready!"

print_status "Running database migrations..."

# Run migrations
docker-compose -f docker-compose.dev.yml exec app pnpm db:migrate

print_status "Seeding database..."

# Seed database
docker-compose -f docker-compose.dev.yml exec app pnpm seed

print_success "🎉 Development environment is ready!"
print_status "Services available at:"
echo "  - Application: http://localhost:3000"
echo "  - PostgreSQL: localhost:5432"
echo "  - Redis: localhost:6379"
echo "  - pgAdmin: http://localhost:5050 (admin@futura.local / admin)"
echo ""
print_status "Useful commands:"
echo "  - Stop services: pnpm dev:docker:down"
echo "  - View logs: docker-compose -f docker-compose.dev.yml logs -f"
echo "  - Reset database: pnpm db:docker:reset"
echo "  - Clean everything: pnpm dev:docker:clean"
