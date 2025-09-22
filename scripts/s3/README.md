# S3 Scripts

This directory contains scripts for managing and analyzing files in your S3 bucket.

## Scripts

### `list-s3-files.js`
Lists all files in your S3 bucket with detailed analysis.

**Usage:**
```bash
cd src/nextjs
node scripts/s3/list-s3-files.js
```

**Features:**
- 📊 Storage statistics (total files, size, averages)
- 📁 Files grouped by type (images, videos, documents, etc.)
- 📂 Directory structure analysis
- 🕒 Recent uploads (last 20 files)
- 📦 Large files identification (> 1MB)
- 🎯 File extension breakdown
- 🖼️ Processed image variants detection
- 👥 User directory analysis
- 💾 JSON export of all data

**Requirements:**
- AWS credentials in `.env.local`:
  - `AWS_ACCESS_KEY_ID`
  - `AWS_SECRET_ACCESS_KEY`
  - `AWS_S3_BUCKET`
  - `AWS_S3_REGION`

**Output:**
- Console output with detailed analysis
- JSON export file: `s3-files-export.json`

## Environment Setup

Make sure your `.env.local` file contains:
```env
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_S3_BUCKET=futura0
AWS_S3_REGION=eu-central-1
```

## File Naming Convention

S3 files follow this pattern:
```
uploads/{userId}/{timestamp}-{uuid}.{extension}
```

**Examples:**
- Original: `uploads/user123/1758534111231-abc123.jpg`
- Display: `uploads/user123/1758534111231-abc123-display.webp`
- Thumb: `uploads/user123/1758534111231-abc123-thumb.webp`
