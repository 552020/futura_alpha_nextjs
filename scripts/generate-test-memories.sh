#!/bin/bash

# Generate test memories for all types (images, documents, videos, audio, notes)
# Usage: ./generate-test-memories.sh
# Creates 5 files of each type in the appropriate mock folders

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Base directories
MOCK_BASE="public/mock/dashboard"
IMAGES_DIR="$MOCK_BASE/images"
DOCUMENTS_DIR="$MOCK_BASE/documents"
NOTES_DIR="$MOCK_BASE/notes"
VIDEOS_DIR="$MOCK_BASE/video"
AUDIO_DIR="$MOCK_BASE/audio"

# Create directories
mkdir -p "$IMAGES_DIR" "$DOCUMENTS_DIR" "$NOTES_DIR" "$VIDEOS_DIR" "$AUDIO_DIR"

echo -e "${BLUE}🎨 Generating test memories for dashboard...${NC}"
echo ""

# Check if ImageMagick is installed
if ! command -v magick &> /dev/null; then
    echo -e "${RED}❌ Error: ImageMagick is not installed.${NC}"
    echo "Please install it first:"
    echo "  macOS: brew install imagemagick"
    echo "  Ubuntu: sudo apt-get install imagemagick"
    exit 1
fi

# Check if ffmpeg is installed
if ! command -v ffmpeg &> /dev/null; then
    echo -e "${YELLOW}⚠️  Warning: ffmpeg is not installed. Video and audio files will be empty.${NC}"
    echo "Install ffmpeg for proper video/audio generation:"
    echo "  macOS: brew install ffmpeg"
    echo "  Ubuntu: sudo apt-get install ffmpeg"
    echo ""
fi

# Image generation function
generate_images() {
    echo -e "${GREEN}📸 Generating 5 test images...${NC}"
    
    local titles=("Family Vacation" "Wedding Ceremony" "Birthday Party" "Hiking Trip" "Beach Sunset")
    local colors=("#FF6B6B" "#4ECDC4" "#45B7D1" "#96CEB4" "#FFEAA7")
    local sizes=("1920x1080" "1080x1920" "1200x800" "800x1200" "1000x1000")
    
    for i in {1..5}; do
        local title="${titles[$((i-1))]}"
        local color="${colors[$((i-1))]}"
        local size="${sizes[$((i-1))]}"
        local filename="test_image_${i}.webp"
        local filepath="$IMAGES_DIR/$filename"
        
        IFS='x' read -r WIDTH HEIGHT <<< "$size"
        
        magick -size "${WIDTH}x${HEIGHT}" "xc:$color" "$filepath"
        
        echo -e "  ✅ Generated: $filename (${WIDTH}x${HEIGHT})"
    done
    echo ""
}

# Document generation function (file uploads)
generate_documents() {
    echo -e "${GREEN}📄 Generating 5 test documents (file uploads)...${NC}"
    
    local titles=("Project Proposal" "Contract Agreement" "Financial Report" "Technical Manual" "Business Plan")
    local content_templates=(
        "# Project Proposal: Website Redesign\n\n## Executive Summary\nThis proposal outlines the redesign of our corporate website to improve user experience and conversion rates.\n\n## Objectives\n- Improve navigation\n- Increase mobile responsiveness\n- Enhance visual design\n\n## Timeline: 3 months\n## Budget: $50,000"
        
        "# Contract Agreement\n\nThis agreement is made between Company A and Company B for the provision of consulting services.\n\n## Terms\n- Duration: 12 months\n- Payment: Monthly\n- Termination: 30 days notice\n\n## Signed by\nCompany A: ________________\nCompany B: ________________"
        
        "# Financial Report - Q4 2023\n\n## Summary\nRevenue: $1,250,000\nExpenses: $850,000\nProfit: $400,000\n\n## Key Highlights\n- 15% revenue increase\n- Cost reduction achieved\n- Strong Q4 performance\n\n## Outlook: Positive for Q1 2024"
        
        "# Technical Manual: System Setup\n\n## 1. Prerequisites\n- Node.js 18+\n- PostgreSQL 14+\n- Redis 6+\n\n## 2. Installation\n- Clone repository\n- Run npm install\n- Configure environment\n\n## 3. Deployment\n- Build application\n- Deploy to server\n- Run migrations"
        
        "# Business Plan 2024\n\n## Vision\nTo become the leading platform for digital memory management.\n\n## Strategy\n- Focus on user experience\n- Expand to new markets\n- Develop partnerships\n\n## Financial Projections\n- Year 1: $500K revenue\n- Year 2: $2M revenue\n- Year 3: $5M revenue"
    )
    
    for i in {1..5}; do
        local title="${titles[$((i-1))]}"
        local content="${content_templates[$((i-1))]}"
        local filename="test_document_${i}.md"
        local filepath="$DOCUMENTS_DIR/$filename"
        
        echo -e "$content" > "$filepath"
        
        echo -e "  ✅ Generated: $filename"
    done
    echo ""
}

# Video generation function
generate_videos() {
    echo -e "${GREEN}🎥 Generating 5 test videos...${NC}"
    
    local titles=("Product Demo" "Training Video" "Event Recording" "Interview" "Presentation")
    local durations=(10 15 20 25 30)  # seconds
    
    for i in {1..5}; do
        local title="${titles[$((i-1))]}"
        local duration="${durations[$((i-1))]}"
        local filename="test_video_${i}.mp4"
        local filepath="$VIDEOS_DIR/$filename"
        
        if command -v ffmpeg &> /dev/null; then
            # Generate a simple video with text overlay
            ffmpeg -f lavfi -i "color=c=0x4ECDC4:size=640x480:duration=$duration" \
                -vf "drawtext=text='$title':fontsize=48:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2" \
                -c:v libx264 -preset ultrafast -crf 23 \
                "$filepath" -y > /dev/null 2>&1
            
            echo -e "  ✅ Generated: $filename (${duration}s)"
        else
            # Create empty file if ffmpeg not available
            touch "$filepath"
            echo -e "  ⚠️  Created empty: $filename (ffmpeg not available)"
        fi
    done
    echo ""
}

# Audio generation function
generate_audio() {
    echo -e "${GREEN}🎵 Generating 5 test audio files...${NC}"
    
    local titles=("Podcast Episode" "Music Track" "Voice Memo" "Interview Audio" "Presentation Audio")
    local durations=(30 45 60 75 90)  # seconds
    
    for i in {1..5}; do
        local title="${titles[$((i-1))]}"
        local duration="${durations[$((i-1))]}"
        local filename="test_audio_${i}.mp3"
        local filepath="$AUDIO_DIR/$filename"
        
        if command -v ffmpeg &> /dev/null; then
            # Generate a simple audio tone
            ffmpeg -f lavfi -i "sine=frequency=440:duration=$duration" \
                -c:a libmp3lame -b:a 128k \
                "$filepath" -y > /dev/null 2>&1
            
            echo -e "  ✅ Generated: $filename (${duration}s)"
        else
            # Create empty file if ffmpeg not available
            touch "$filepath"
            echo -e "  ⚠️  Created empty: $filename (ffmpeg not available)"
        fi
    done
    echo ""
}

# Note generation function (database content)
generate_notes() {
    echo -e "${GREEN}📝 Generating 5 test notes (database content)...${NC}"
    
    local titles=("Daily Journal" "Shopping List" "Meeting Notes" "Ideas" "Reminders")
    local content_templates=(
        "Daily Journal - March 10, 2024\n\nToday was productive! Completed the project proposal and had a great meeting with the team. The new design ideas are really coming together.\n\nTomorrow's goals:\n- Review feedback\n- Start implementation\n- Schedule follow-up meeting\n\nFeeling: Excited and motivated!"
        
        "Shopping List\n\nGroceries:\n- Milk\n- Bread\n- Eggs\n- Bananas\n- Chicken breast\n- Rice\n- Tomatoes\n\nHousehold:\n- Dish soap\n- Paper towels\n- Laundry detergent\n\nElectronics:\n- USB cable\n- Phone charger"
        
        "Meeting Notes - Team Sync\n\nDate: March 10, 2024\nAttendees: Alice, Bob, Charlie, Diana\n\nDiscussion:\n- Project timeline review\n- Resource allocation\n- Risk assessment\n\nAction Items:\n- Alice: Update documentation\n- Bob: Contact vendor\n- Charlie: Prepare presentation\n- Diana: Schedule next meeting\n\nNext meeting: March 12, 2 PM"
        
        "Ideas for Future Projects\n\n1. Mobile App\n   - Fitness tracking\n   - Social features\n   - Gamification\n\n2. Website Redesign\n   - Modern UI/UX\n   - Better navigation\n   - Mobile responsive\n\n3. Content Platform\n   - Video tutorials\n   - Interactive courses\n   - Community features\n\n4. Productivity Tool\n   - Task management\n   - Time tracking\n   - Team collaboration"
        
        "Reminders\n\nPersonal:\n- Call mom (March 11)\n- Dentist appointment (March 15)\n- Car service (March 20)\n- Birthday party (March 25)\n\nWork:\n- Submit report (March 12)\n- Team meeting (March 13)\n- Project deadline (March 18)\n- Performance review (March 22)\n\nHealth:\n- Gym workout (daily)\n- Meditation (evening)\n- Doctor checkup (March 30)"
    )
    
    for i in {1..5}; do
        local title="${titles[$((i-1))]}"
        local content="${content_templates[$((i-1))]}"
        local filename="test_note_${i}.txt"
        local filepath="$NOTES_DIR/$filename"
        
        echo -e "$content" > "$filepath"
        
        echo -e "  ✅ Generated: $filename"
    done
    echo ""
}

# Main execution
echo -e "${BLUE}🚀 Starting test memory generation...${NC}"
echo ""

# Generate all types
generate_images
generate_documents
generate_videos
generate_audio
generate_notes

echo -e "${GREEN}🎉 Test memory generation complete!${NC}"
echo ""
echo -e "${YELLOW}📁 Files created:${NC}"
echo "  📸 Images: $IMAGES_DIR/ (5 files)"
echo "  📄 Documents: $DOCUMENTS_DIR/ (5 files)"
echo "  📝 Notes: $NOTES_DIR/ (5 files)"
echo "  🎥 Videos: $VIDEOS_DIR/ (5 files)"
echo "  🎵 Audio: $AUDIO_DIR/ (5 files)"
echo ""
echo -e "${BLUE}💡 Next steps:${NC}"
echo "  1. Update sample data to use these new files"
echo "  2. Test the dashboard with mock data enabled"
echo "  3. Verify all memory types display correctly"
echo ""
echo -e "${GREEN}✅ Ready for testing!${NC}"
