#!/bin/bash

# Generate different types of galleries for testing
# Usage: ./generate-galleries.sh [format]
# Example: ./generate-galleries.sh webp

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default format
FORMAT=${1:-webp}
GALLERIES_DIR="public/mock/galleries"

echo -e "${BLUE}🎨 Generating different gallery types for testing...${NC}"
echo -e "${BLUE}📁 Output directory: $GALLERIES_DIR${NC}"
echo ""

# Create galleries directory
mkdir -p "$GALLERIES_DIR"

# Function to generate a single image
generate_single_image() {
    local gallery_dir=$1
    local size=$2
    local index=$3
    local format=$4
    
    # Parse size
    IFS='x' read -r WIDTH HEIGHT <<< "$size"
    
    # Colors array for pleasant, photography-like images
    local COLORS=(
        "#F8FAFC" "#F1F5F9" "#E2E8F0" "#CBD5E1" "#94A3B8"  # Soft grays
        "#FEF3C7" "#FDE68A" "#FCD34D" "#F59E0B" "#D97706"  # Warm yellows
        "#DCFCE7" "#BBF7D0" "#86EFAC" "#4ADE80" "#22C55E"  # Soft greens
        "#DBEAFE" "#BFDBFE" "#93C5FD" "#60A5FA" "#3B82F6"  # Soft blues
        "#F3E8FF" "#E9D5FF" "#D8B4FE" "#C084FC" "#A855F7"  # Soft purples
        "#FEE2E2" "#FECACA" "#FCA5A5" "#F87171" "#EF4444"  # Soft reds
        "#FED7AA" "#FDBA74" "#FB923C" "#F97316" "#EA580C"  # Soft oranges
    )
    
    # Get random color
    local COLOR=${COLORS[$((RANDOM % ${#COLORS[@]}))]}
    
    # Simple, normal words for filenames
    local WORDS=("photo" "image" "picture" "shot" "photo" "image" "picture" "shot")
    local WORD=${WORDS[$((RANDOM % ${#WORDS[@]}))]}
    
    # Create filename
    local NUM=$(printf "%02d" $index)
    local FILENAME="${WORD}_${NUM}.$format"
    local FILEPATH="$gallery_dir/$FILENAME"
    
    # Create clean solid color image (no text, no gradients)
    magick -size "${WIDTH}x${HEIGHT}" \
        "xc:$COLOR" \
        "$FILEPATH"
    
    echo -e "  ✅ Generated: ${FILENAME} (${WIDTH}×${HEIGHT})"
}

# Function to generate a gallery
generate_gallery() {
    local gallery_name=$1
    local image_count=$2
    local aspect_ratio=$3
    local description=$4
    
    local gallery_dir="$GALLERIES_DIR/$gallery_name"
    mkdir -p "$gallery_dir"
    
    echo -e "${GREEN}📸 Generating $gallery_name ($image_count images, $aspect_ratio)...${NC}"
    
    # Generate images directly in the gallery directory
    case $aspect_ratio in
        "portrait")
            # Generate portrait images directly
            for i in $(seq 1 $image_count); do
                size_index=$(((i-1) % 4))  # Use first 4 portrait sizes
                size="1080x1920 900x1600 810x1440 720x1280"
                size=$(echo $size | cut -d' ' -f$((size_index + 1)))
                generate_single_image "$gallery_dir" "$size" "$i" "$FORMAT"
            done
            ;;
        "landscape")
            # Generate landscape images directly
            for i in $(seq 1 $image_count); do
                size_index=$(((i-1) % 4))  # Use first 4 landscape sizes
                size="1920x1080 1600x900 1440x810 1280x720"
                size=$(echo $size | cut -d' ' -f$((size_index + 1)))
                generate_single_image "$gallery_dir" "$size" "$i" "$FORMAT"
            done
            ;;
        "mixed")
            # Generate mixed images directly
            for i in $(seq 1 $image_count); do
                size_index=$(((i-1) % 8))  # Mix of landscape and portrait
                size="1920x1080 1600x900 1080x1920 900x1600 1440x810 1280x720 810x1440 720x1280"
                size=$(echo $size | cut -d' ' -f$((size_index + 1)))
                generate_single_image "$gallery_dir" "$size" "$i" "$FORMAT"
            done
            ;;
        "wild")
            # Generate wild images directly
            for i in $(seq 1 $image_count); do
                size_index=$(((i-1) % 12))  # Mix of all formats
                size="1920x1080 1600x900 1080x1920 900x1600 1200x1200 1000x1000 2400x800 3200x900 800x2400 900x3200 4000x1000 1000x4000"
                size=$(echo $size | cut -d' ' -f$((size_index + 1)))
                generate_single_image "$gallery_dir" "$size" "$i" "$FORMAT"
            done
            ;;
    esac
    
    # Create gallery metadata
    cat > "$gallery_dir/gallery.json" << EOF
{
  "name": "$gallery_name",
  "description": "$description",
  "imageCount": $(ls "$gallery_dir"/*.$FORMAT 2>/dev/null | wc -l),
  "aspectRatio": "$aspect_ratio",
  "format": "$FORMAT",
  "createdAt": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
EOF
    
    local actual_count=$(ls "$gallery_dir"/*.$FORMAT 2>/dev/null | wc -l)
    echo -e "  ✅ Generated: $gallery_name ($actual_count images)"
}

# Generate different gallery types
echo -e "${YELLOW}🎯 Generating 6 different gallery types...${NC}"
echo ""

# 1. Portrait Gallery (portrait-only)
generate_gallery "portrait-gallery" 15 "portrait" "Portrait-only gallery for testing vertical layouts"

# 2. Landscape Gallery (landscape-only)  
generate_gallery "landscape-gallery" 15 "landscape" "Landscape-only gallery for testing horizontal layouts"

# 3. Mixed Gallery (landscape + portrait)
generate_gallery "mixed-gallery" 20 "mixed" "Mixed aspect ratios for realistic testing"

# 4. Wild Gallery (all formats)
generate_gallery "wild-gallery" 25 "wild" "All aspect ratios including square and panoramic"

# 5. Small Gallery (few images)
generate_gallery "small-gallery" 5 "mixed" "Small gallery for quick loading tests"

# 6. Large Gallery (many images)
generate_gallery "large-gallery" 50 "mixed" "Large gallery for performance testing"

echo ""
echo -e "${GREEN}🎉 Successfully generated 6 gallery types!${NC}"
echo ""
echo -e "${YELLOW}📊 Gallery Summary:${NC}"
echo "  📱 Portrait Gallery: $(ls "$GALLERIES_DIR/portrait-gallery"/*.$FORMAT 2>/dev/null | wc -l) images"
echo "  📸 Landscape Gallery: $(ls "$GALLERIES_DIR/landscape-gallery"/*.$FORMAT 2>/dev/null | wc -l) images"
echo "  🎨 Mixed Gallery: $(ls "$GALLERIES_DIR/mixed-gallery"/*.$FORMAT 2>/dev/null | wc -l) images"
echo "  🌊 Wild Gallery: $(ls "$GALLERIES_DIR/wild-gallery"/*.$FORMAT 2>/dev/null | wc -l) images"
echo "  🔸 Small Gallery: $(ls "$GALLERIES_DIR/small-gallery"/*.$FORMAT 2>/dev/null | wc -l) images"
echo "  🔹 Large Gallery: $(ls "$GALLERIES_DIR/large-gallery"/*.$FORMAT 2>/dev/null | wc -l) images"
echo ""
echo -e "${YELLOW}📁 Galleries organized in:${NC}"
echo "  • $GALLERIES_DIR/portrait-gallery/ - Portrait-only images"
echo "  • $GALLERIES_DIR/landscape-gallery/ - Landscape-only images"
echo "  • $GALLERIES_DIR/mixed-gallery/ - Mixed aspect ratios"
echo "  • $GALLERIES_DIR/wild-gallery/ - All formats including square/panoramic"
echo "  • $GALLERIES_DIR/small-gallery/ - Small collection (5 images)"
echo "  • $GALLERIES_DIR/large-gallery/ - Large collection (50 images)"
echo ""
echo -e "${BLUE}💡 Usage:${NC}"
echo "  1. Each gallery has a gallery.json with metadata"
echo "  2. Use these galleries for different testing scenarios"
echo "  3. Test loading performance, layout, and user experience"
echo ""
echo -e "${GREEN}✅ Ready for comprehensive gallery testing!${NC}"
