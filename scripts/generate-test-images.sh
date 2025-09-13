#!/bin/bash

# Generate test images for gallery
# Usage: ./generate-test-images.sh [format] [count]
# Example: ./generate-test-images.sh webp 40

set -e

# Default values
FORMAT=${1:-webp}
COUNT=${2:-40}
OUTPUT_DIR="public/mock/dashboard/images"

# Colors array
COLORS=(
    "#FF6B6B" "#4ECDC4" "#45B7D1" "#96CEB4" "#FFEAA7"
    "#DDA0DD" "#98D8C8" "#F7DC6F" "#BB8FCE" "#85C1E9"
    "#F8C471" "#82E0AA" "#F1948A" "#85C1E9" "#D7BDE2"
    "#A3E4D7" "#F9E79F" "#FADBD8" "#D5DBDB" "#AED6F1"
    "#A9DFBF" "#F4D03F" "#E8DAEF" "#D6EAF8" "#D1F2EB"
    "#FCF3CF" "#EBDEF0" "#EBF5FB" "#E8F8F5" "#FEF9E7"
    "#FF7675" "#74B9FF" "#00B894" "#FDCB6E" "#6C5CE7"
    "#A29BFE" "#FD79A8" "#E17055" "#00CEC9" "#55A3FF"
    "#FF9FF3" "#54A0FF" "#5F27CD" "#00D2D3" "#FF9F43"
    "#EE5A24" "#009432" "#0652DD" "#9980FA" "#EA2027"
)

# Adjectives for naming
ADJECTIVES=(
    "Beautiful" "Amazing" "Stunning" "Gorgeous" "Wonderful"
    "Fantastic" "Incredible" "Spectacular" "Magnificent" "Breathtaking"
    "Charming" "Delightful" "Enchanting" "Captivating" "Mesmerizing"
    "Radiant" "Vibrant" "Luminous" "Brilliant" "Dazzling"
)

# Subjects for naming
SUBJECTS=(
    "Sunset" "Mountain" "Ocean" "Forest" "Garden"
    "Landscape" "Portrait" "Architecture" "Street" "Nature"
    "Flower" "Sky" "River" "Beach" "City"
    "Bridge" "Building" "Park" "Lake" "Valley"
    "Meadow" "Waterfall" "Castle" "Village" "Harbor"
    "Lighthouse" "Cathedral" "Market" "Festival" "Wedding"
    "Family" "Friends" "Children" "Couple" "Celebration"
    "Journey" "Adventure" "Memory" "Moment" "Experience"
)

# Sizes array (width x height)
SIZES=(
    "1920x1080"  # Landscape
    "1080x1920"  # Portrait
    "1200x800"   # Wide
    "800x1200"   # Tall
    "1000x1000"  # Square
)

# Check if ImageMagick is installed
if ! command -v magick &> /dev/null; then
    echo "❌ Error: ImageMagick is not installed."
    echo "Please install it first:"
    echo "  macOS: brew install imagemagick"
    echo "  Ubuntu: sudo apt-get install imagemagick"
    echo "  CentOS: sudo yum install ImageMagick"
    exit 1
fi

# Create output directory
mkdir -p "$OUTPUT_DIR"

echo "🎨 Generating $COUNT test images for gallery ($FORMAT format)..."
echo "📁 Output directory: $OUTPUT_DIR"

# Generate images
for i in $(seq 1 $COUNT); do
    # Get random values
    COLOR=${COLORS[$((RANDOM % ${#COLORS[@]}))]}
    ADJECTIVE=${ADJECTIVES[$((RANDOM % ${#ADJECTIVES[@]}))]}
    SUBJECT=${SUBJECTS[$((RANDOM % ${#SUBJECTS[@]}))]}
    SIZE=${SIZES[$((i % ${#SIZES[@]}))]}
    
    # Parse size
    IFS='x' read -r WIDTH HEIGHT <<< "$SIZE"
    
    # Create filename
    NUM=$(printf "%02d" $i)
    FILENAME="${ADJECTIVE}_${SUBJECT}_${NUM}.$FORMAT"
    FILEPATH="$OUTPUT_DIR/$FILENAME"
    
    # Generate image with ImageMagick
    magick -size "${WIDTH}x${HEIGHT}" "xc:$COLOR" \
        -gravity center \
        -pointsize 48 \
        -fill white \
        -stroke black \
        -strokewidth 2 \
        -annotate +0+0 "Test Image $i" \
        -pointsize 24 \
        -annotate +0+60 "$WIDTH x $HEIGHT" \
        "$FILEPATH"
    
    echo "✅ Generated: $FILENAME (${WIDTH}x${HEIGHT}, $COLOR)"
done

echo ""
echo "🎉 Successfully generated $COUNT test images!"
echo "📍 Images saved to: $OUTPUT_DIR"
echo ""
echo "💡 You can now update your gallery page to use these test images:"
echo "   - Update the thumbnail paths to point to /gallery/[filename].$FORMAT"
echo "   - The images have various sizes and colors for realistic testing"
echo ""
echo "🔧 To generate different formats, run:"
echo "   ./scripts/generate-test-images.sh jpg 40"
echo "   ./scripts/generate-test-images.sh png 40"
echo "   ./scripts/generate-test-images.sh webp 40"
