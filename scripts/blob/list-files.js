#!/usr/bin/env node

/**
 * Vercel Blob File Lister
 *
 * This script lists all files in your Vercel Blob storage with detailed information:
 * - File count and total size
 * - Files by type/category
 * - Recent uploads
 * - Storage usage breakdown
 */

const { list } = require('@vercel/blob');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });

async function listBlobFiles() {
  console.log('📋 Listing all files in Vercel Blob storage...\n');

  try {
    // Check if token is available
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      throw new Error('BLOB_READ_WRITE_TOKEN not found in environment variables');
    }
    console.log('✅ BLOB_READ_WRITE_TOKEN found\n');

    // Get all blobs
    console.log('🔍 Fetching all files...');
    const blobs = await list();
    const files = blobs.blobs;

    if (files.length === 0) {
      console.log('📭 No files found in blob storage');
      return;
    }

    // Basic statistics
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(2);

    console.log(`📊 Storage Statistics:`);
    console.log(`   Total files: ${files.length}`);
    console.log(`   Total size: ${totalSizeMB} MB`);
    console.log(`   Average file size: ${(totalSize / files.length / 1024).toFixed(2)} KB\n`);

    // Group files by type
    const filesByType = files.reduce((acc, file) => {
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

    // Group files by folder/prefix
    const filesByFolder = files.reduce((acc, file) => {
      const pathParts = file.pathname.split('/');
      const folder = pathParts.length > 1 ? pathParts[0] : 'root';
      if (!acc[folder]) acc[folder] = [];
      acc[folder].push(file);
      return acc;
    }, {});

    console.log('\n📂 Files by folder:');
    Object.entries(filesByFolder)
      .sort(([, a], [, b]) => b.length - a.length)
      .forEach(([folder, folderFiles]) => {
        const folderSize = folderFiles.reduce((sum, file) => sum + file.size, 0);
        const folderSizeMB = (folderSize / (1024 * 1024)).toFixed(2);
        console.log(`   ${folder}: ${folderFiles.length} files (${folderSizeMB} MB)`);
      });

    // Recent uploads (last 10)
    const recentFiles = files.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt)).slice(0, 10);

    console.log('\n🕒 Recent uploads (last 10):');
    recentFiles.forEach((file, index) => {
      const sizeKB = (file.size / 1024).toFixed(2);
      const uploadedAt = new Date(file.uploadedAt).toLocaleString();
      console.log(`   ${index + 1}. ${file.pathname}`);
      console.log(`      Size: ${sizeKB} KB | Type: ${file.contentType || 'unknown'} | Uploaded: ${uploadedAt}`);
    });

    // Large files (> 1MB)
    const largeFiles = files.filter(file => file.size > 1024 * 1024).sort((a, b) => b.size - a.size);

    if (largeFiles.length > 0) {
      console.log(`\n📦 Large files (> 1MB):`);
      largeFiles.forEach((file, index) => {
        const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
        console.log(`   ${index + 1}. ${file.pathname} (${sizeMB} MB)`);
      });
    }

    // File type breakdown
    const contentTypeCounts = files.reduce((acc, file) => {
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

    // Export to JSON file (optional)
    const exportData = {
      timestamp: new Date().toISOString(),
      totalFiles: files.length,
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
      files: files.map(file => ({
        pathname: file.pathname,
        size: file.size,
        contentType: file.contentType,
        uploadedAt: file.uploadedAt,
        url: file.url,
      })),
    };

    const exportPath = path.join(__dirname, 'blob-files-export.json');
    fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2));
    console.log(`\n💾 Export saved to: ${exportPath}`);

    console.log('\n✅ File listing completed!');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the script
listBlobFiles();
