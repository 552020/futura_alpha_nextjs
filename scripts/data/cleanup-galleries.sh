#!/bin/bash

# Clean up all gallery mock data for fresh start
# Usage: ./cleanup-galleries.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧹 Cleaning up gallery mock data...${NC}"
echo ""

# Directories to clean
GALLERIES_DIR="public/mock/galleries"
GALLERY_DIR="public/mock/gallery"

# Check if directories exist and remove them
if [ -d "$GALLERIES_DIR" ]; then
    echo -e "${YELLOW}🗑️  Removing $GALLERIES_DIR...${NC}"
    rm -rf "$GALLERIES_DIR"
    echo -e "  ✅ Removed: $GALLERIES_DIR"
else
    echo -e "${YELLOW}ℹ️  $GALLERIES_DIR does not exist${NC}"
fi

if [ -d "$GALLERY_DIR" ]; then
    echo -e "${YELLOW}🗑️  Removing $GALLERY_DIR...${NC}"
    rm -rf "$GALLERY_DIR"
    echo -e "  ✅ Removed: $GALLERY_DIR"
else
    echo -e "${YELLOW}ℹ️  $GALLERY_DIR does not exist${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Gallery cleanup complete!${NC}"
echo ""
echo -e "${BLUE}💡 To regenerate galleries:${NC}"
echo "  ./scripts/generate-galleries.sh webp"
echo ""
echo -e "${GREEN}✅ Ready for fresh gallery generation!${NC}"
