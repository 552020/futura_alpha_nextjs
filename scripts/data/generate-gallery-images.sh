#!/bin/bash

# Generate test gallery images with different aspect ratios for gallery development
# Usage: ./generate-gallery-images.sh [format] [count]
# Example: ./generate-gallery-images.sh webp 60

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
FORMAT=${1:-webp}
COUNT=${2:-60}
OUTPUT_DIR="public/mock/gallery"

# Create subdirectories for different aspect ratios
LANDSCAPE_DIR="$OUTPUT_DIR/landscape"
PORTRAIT_DIR="$OUTPUT_DIR/portrait"
SQUARE_DIR="$OUTPUT_DIR/square"
WILD_DIR="$OUTPUT_DIR/wild"

# Colors array for pleasant, photography-like images
COLORS=(
    "#F8FAFC" "#F1F5F9" "#E2E8F0" "#CBD5E1" "#94A3B8"  # Soft grays
    "#FEF3C7" "#FDE68A" "#FCD34D" "#F59E0B" "#D97706"  # Warm yellows
    "#DCFCE7" "#BBF7D0" "#86EFAC" "#4ADE80" "#22C55E"  # Soft greens
    "#DBEAFE" "#BFDBFE" "#93C5FD" "#60A5FA" "#3B82F6"  # Soft blues
    "#F3E8FF" "#E9D5FF" "#D8B4FE" "#C084FC" "#A855F7"  # Soft purples
    "#FEE2E2" "#FECACA" "#FCA5A5" "#F87171" "#EF4444"  # Soft reds
    "#FED7AA" "#FDBA74" "#FB923C" "#F97316" "#EA580C"  # Soft oranges
)



# Aspect ratio configurations - using arrays instead of associative arrays
LANDSCAPE_SIZES=(
    "1920x1080"   # 16:9 Full HD
    "1600x900"    # 16:9 
    "1440x810"    # 16:9
    "1280x720"    # 16:9 HD
    "2560x1440"   # 16:9 2K
    "3840x2160"   # 16:9 4K
    "1920x1200"   # 16:10
    "1680x1050"   # 16:10
    "2560x1600"   # 16:10
    "3440x1440"   # 21:9 Ultrawide
)

PORTRAIT_SIZES=(
    "1080x1920"   # 9:16 Mobile
    "900x1600"    # 9:16
    "810x1440"    # 9:16
    "720x1280"    # 9:16
    "1200x1920"   # 10:16
    "1050x1680"   # 10:16
    "1600x2560"   # 10:16
    "2160x3840"   # 9:16 4K Portrait
    "1440x2560"   # 9:16 2K Portrait
    "1440x3440"   # 9:21 Tall
)

SQUARE_SIZES=(
    "1200x1200"   # 1:1 Instagram
    "1000x1000"   # 1:1
    "800x800"     # 1:1
    "1500x1500"   # 1:1 Large
    "2000x2000"   # 1:1 XL
)

WILD_SIZES=(
    "2400x800"    # 3:1 Panoramic
    "3200x900"    # ~3.5:1 Ultra-wide
    "800x2400"    # 1:3 Ultra-tall
    "900x3200"    # 1:3.5 Super tall
    "4000x1000"   # 4:1 Extreme panoramic
    "1000x4000"   # 1:4 Extreme tall
    "3600x1200"   # 3:1 Wide
    "1200x3600"   # 1:3 Tall
    "5120x1440"   # ~3.5:1 Super ultrawide
    "1440x5120"   # 1:3.5 Super tall
)

# Check if ImageMagick is installed
if ! command -v magick &> /dev/null; then
    echo -e "${RED}❌ Error: ImageMagick is not installed.${NC}"
    echo "Please install it first:"
    echo "  macOS: brew install imagemagick"
    echo "  Ubuntu: sudo apt-get install imagemagick"
    echo "  CentOS: sudo yum install ImageMagick"
    exit 1
fi

# Create output directories
mkdir -p "$LANDSCAPE_DIR" "$PORTRAIT_DIR" "$SQUARE_DIR" "$WILD_DIR" "$OUTPUT_DIR/generated"

echo -e "${BLUE}🎨 Generating $COUNT gallery test images ($FORMAT format)...${NC}"
echo -e "${BLUE}📁 Output directory: $OUTPUT_DIR${NC}"
echo ""

# Function to generate a single image
generate_image() {
    local category=$1
    local size=$2
    local index=$3
    local total=$4
    
    # Parse size
    IFS='x' read -r WIDTH HEIGHT <<< "$size"
    
    # Get random color
    local COLOR=${COLORS[$((RANDOM % ${#COLORS[@]}))]}
    
    # Simple, normal words for filenames
    local WORDS=("photo" "image" "picture" "shot" "photo" "image" "picture" "shot")
    local WORD=${WORDS[$((RANDOM % ${#WORDS[@]}))]}
    
    # Create filename
    local NUM=$(printf "%02d" $index)
    local FILENAME="${WORD}_${NUM}.$FORMAT"
    
    # Determine output directory based on category
    local OUTPUT_SUBDIR
    case $category in
        landscape) OUTPUT_SUBDIR="$LANDSCAPE_DIR" ;;
        portrait) OUTPUT_SUBDIR="$PORTRAIT_DIR" ;;
        square) OUTPUT_SUBDIR="$SQUARE_DIR" ;;
        wild) OUTPUT_SUBDIR="$WILD_DIR" ;;
        *) OUTPUT_SUBDIR="$OUTPUT_DIR/generated" ;;
    esac
    
    local FILEPATH="$OUTPUT_SUBDIR/$FILENAME"
    
    # Calculate aspect ratio for display (avoid bc dependency)
    local ASPECT_RATIO
    if [ "$HEIGHT" -ne 0 ]; then
        ASPECT_RATIO=$(awk "BEGIN {printf \"%.2f\", $WIDTH/$HEIGHT}")
    else
        ASPECT_RATIO="N/A"
    fi
    
    # Create clean solid color image (no text, no gradients)
    magick -size "${WIDTH}x${HEIGHT}" \
        "xc:$COLOR" \
        "$FILEPATH"
    
    echo -e "  ✅ Generated: ${FILENAME} (${WIDTH}×${HEIGHT}, ${category})"
}

# Generate images by category
echo -e "${GREEN}📸 Generating landscape images (16:9, 16:10, 21:9)...${NC}"
landscape_count=$((COUNT * 40 / 100))  # 40% landscape
for i in $(seq 1 $landscape_count); do
    size_index=$(((i-1) % ${#LANDSCAPE_SIZES[@]}))
    size="${LANDSCAPE_SIZES[$size_index]}"
    generate_image "landscape" "$size" "$i" "$landscape_count"
done

echo ""
echo -e "${GREEN}📱 Generating portrait images (9:16, 10:16)...${NC}"
portrait_count=$((COUNT * 30 / 100))  # 30% portrait
for i in $(seq 1 $portrait_count); do
    size_index=$(((i-1) % ${#PORTRAIT_SIZES[@]}))
    size="${PORTRAIT_SIZES[$size_index]}"
    generate_image "portrait" "$size" "$i" "$portrait_count"
done

echo ""
echo -e "${GREEN}⬜ Generating square images (1:1)...${NC}"
square_count=$((COUNT * 15 / 100))  # 15% square
if [ $square_count -gt 0 ]; then
    for i in $(seq 1 $square_count); do
        size_index=$(((i-1) % ${#SQUARE_SIZES[@]}))
        size="${SQUARE_SIZES[$size_index]}"
        generate_image "square" "$size" "$i" "$square_count"
    done
fi

echo ""
echo -e "${GREEN}🌊 Generating wild aspect ratio images (panoramic, ultra-tall)...${NC}"
wild_count=$((COUNT * 15 / 100))  # 15% wild ratios
if [ $wild_count -gt 0 ]; then
    for i in $(seq 1 $wild_count); do
        size_index=$(((i-1) % ${#WILD_SIZES[@]}))
        size="${WILD_SIZES[$size_index]}"
        generate_image "wild" "$size" "$i" "$wild_count"
    done
fi

echo ""
echo -e "${GREEN}🎉 Successfully generated $COUNT gallery test images!${NC}"
echo ""
echo -e "${YELLOW}📊 Distribution:${NC}"
echo "  📸 Landscape (16:9, 16:10, 21:9): $landscape_count images"
echo "  📱 Portrait (9:16, 10:16): $portrait_count images"
echo "  ⬜ Square (1:1): $square_count images"
echo "  🌊 Wild ratios (panoramic, ultra-tall): $wild_count images"
echo ""
echo -e "${YELLOW}📁 Images organized in:${NC}"
echo "  • $LANDSCAPE_DIR/ - Landscape images"
echo "  • $PORTRAIT_DIR/ - Portrait images"
echo "  • $SQUARE_DIR/ - Square images"
echo "  • $WILD_DIR/ - Wild aspect ratio images"
echo ""
echo -e "${BLUE}💡 Usage:${NC}"
echo "  1. Set NEXT_PUBLIC_GALLERY_MOCK=1 in your .env.local"
echo "  2. The gallery service will automatically use these images"
echo "  3. Test different gallery sizes: 3, 10, 25, 50+ images"
echo ""
echo -e "${GREEN}✅ Ready for gallery development and testing!${NC}"