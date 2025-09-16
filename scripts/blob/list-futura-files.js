#!/usr/bin/env node

/**
 * Vercel Blob Futura Files Lister
 *
 * This script lists only files in the futura folder (or configured folder name)
 * with detailed information about your application's uploaded files.
 */

const { list } = require('@vercel/blob');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });

async function listFuturaFiles() {
  console.log('📋 Listing files in Futura folder...\n');

  try {
    // Check if token is available
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      throw new Error('BLOB_READ_WRITE_TOKEN not found in environment variables');
    }

    // Get folder name from environment or use default
    const folderName = process.env.BLOB_FOLDER_NAME || 'futura';
    console.log(`📁 Folder: "${folderName}"`);
    console.log('');

    // Get all blobs
    console.log('🔍 Fetching all files...');
    const blobs = await list();
    const allFiles = blobs.blobs;

    // Filter files in the futura folder
    const futuraFiles = allFiles.filter(file => file.pathname.startsWith(`${folderName}/`));

    if (futuraFiles.length === 0) {
      console.log(`📭 No files found in "${folderName}" folder`);
      return;
    }

    // Calculate total size
    const totalSize = futuraFiles.reduce((sum, file) => sum + file.size, 0);
    const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(2);
    const averageSizeKB = (totalSize / futuraFiles.length / 1024).toFixed(2);

    console.log(`📊 Futura Folder Statistics:`);
    console.log(`   Total files: ${futuraFiles.length}`);
    console.log(`   Total size: ${totalSizeMB} MB`);
    console.log(`   Average file size: ${averageSizeKB} KB`);
    console.log('');

    // Group files by type
    const filesByType = futuraFiles.reduce((acc, file) => {
      const contentType = file.contentType || 'unknown';
      const type = contentType.split('/')[0];
      if (!acc[type]) acc[type] = [];
      acc[type].push(file);
      return acc;
    }, {});

    console.log('📁 Files by type:');
    Object.entries(filesByType)
      .sort(([, a], [, b]) => b.length - a.length)
      .forEach(([type, typeFiles]) => {
        const typeSize = typeFiles.reduce((sum, file) => sum + file.size, 0);
        const typeSizeMB = (typeSize / (1024 * 1024)).toFixed(2);
        console.log(`   ${type}: ${typeFiles.length} files (${typeSizeMB} MB)`);
      });

    // Recent uploads (last 20)
    const recentFiles = futuraFiles.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt)).slice(0, 20);

    console.log('\n🕒 Recent uploads (last 20):');
    recentFiles.forEach((file, index) => {
      const sizeKB = (file.size / 1024).toFixed(2);
      const uploadedAt = new Date(file.uploadedAt).toLocaleString();
      const fileName = file.pathname.split('/').pop();
      console.log(`   ${index + 1}. ${fileName}`);
      console.log(`      Size: ${sizeKB} KB | Type: ${file.contentType || 'unknown'} | Uploaded: ${uploadedAt}`);
    });

    // Large files (> 1MB)
    const largeFiles = futuraFiles.filter(file => file.size > 1024 * 1024).sort((a, b) => b.size - a.size);

    if (largeFiles.length > 0) {
      console.log(`\n📦 Large files (> 1MB):`);
      largeFiles.forEach((file, index) => {
        const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
        const fileName = file.pathname.split('/').pop();
        console.log(`   ${index + 1}. ${fileName} (${sizeMB} MB)`);
      });
    }

    // File type breakdown
    const contentTypeCounts = futuraFiles.reduce((acc, file) => {
      const contentType = file.contentType || 'unknown';
      acc[contentType] = (acc[contentType] || 0) + 1;
      return acc;
    }, {});

    console.log('\n🎯 File type breakdown:');
    Object.entries(contentTypeCounts)
      .sort(([, a], [, b]) => b - a)
      .forEach(([contentType, count]) => {
        console.log(`   ${contentType}: ${count} files`);
      });

    // Show file patterns (e.g., processed image variants)
    const filePatterns = futuraFiles.reduce((acc, file) => {
      const fileName = file.pathname.split('/').pop();
      // Extract base name (remove timestamp and variants)
      const baseName = fileName.replace(/^\d+-/, '').replace(/(_display|_thumb|_original)\.webp$/, '');
      if (!acc[baseName]) acc[baseName] = [];
      acc[baseName].push(file);
      return acc;
    }, {});

    // Show files with multiple variants (likely processed images)
    const multiVariantFiles = Object.entries(filePatterns)
      .filter(([, files]) => files.length > 1)
      .sort(([, a], [, b]) => b.length - a.length);

    if (multiVariantFiles.length > 0) {
      console.log('\n🖼️ Processed images (multiple variants):');
      multiVariantFiles.slice(0, 10).forEach(([baseName, files]) => {
        const totalSize = files.reduce((sum, file) => sum + file.size, 0);
        const totalSizeKB = (totalSize / 1024).toFixed(2);
        console.log(`   ${baseName}: ${files.length} variants (${totalSizeKB} KB total)`);
        files.forEach(file => {
          const fileName = file.pathname.split('/').pop();
          const sizeKB = (file.size / 1024).toFixed(2);
          console.log(`     - ${fileName} (${sizeKB} KB)`);
        });
      });
    }

    // Export to JSON file
    const exportData = {
      timestamp: new Date().toISOString(),
      folderName: folderName,
      totalFiles: futuraFiles.length,
      totalSize: totalSize,
      totalSizeMB: parseFloat(totalSizeMB),
      filesByType: Object.fromEntries(
        Object.entries(filesByType).map(([type, typeFiles]) => [
          type,
          {
            count: typeFiles.length,
            size: typeFiles.reduce((sum, file) => sum + file.size, 0),
            sizeMB: parseFloat((typeFiles.reduce((sum, file) => sum + file.size, 0) / (1024 * 1024)).toFixed(2)),
          },
        ])
      ),
      files: futuraFiles.map(file => ({
        pathname: file.pathname,
        fileName: file.pathname.split('/').pop(),
        size: file.size,
        contentType: file.contentType,
        uploadedAt: file.uploadedAt,
        url: file.url,
      })),
    };

    const exportPath = path.join(__dirname, `futura-files-export.json`);
    fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2));
    console.log(`\n💾 Export saved to: ${exportPath}`);

    console.log('\n✅ Futura files listing completed!');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the script
listFuturaFiles();
