#!/usr/bin/env node

/**
 * S3 File Lister
 *
 * This script lists all files in your S3 bucket with detailed information:
 * - File count and total size
 * - Files by type/category
 * - Recent uploads
 * - Storage usage breakdown
 * - Directory structure analysis
 */

const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });

// S3 Configuration
const s3Config = {
  region: process.env.AWS_S3_REGION || 'eu-central-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
};

const s3Client = new S3Client(s3Config);
const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'futura0';

async function listS3Files() {
  console.log('📋 Listing all files in S3 bucket...\n');

  try {
    // Check if S3 is configured
    if (
      !process.env.AWS_ACCESS_KEY_ID ||
      !process.env.AWS_SECRET_ACCESS_KEY ||
      !process.env.AWS_S3_BUCKET
    ) {
      throw new Error(
        'S3 credentials not found in environment variables. Please check AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_S3_BUCKET'
      );
    }
    console.log(
      `✅ S3 configured for bucket: ${BUCKET_NAME} (${s3Config.region})`
    );
    console.log('');

    // Get all objects from S3
    console.log('🔍 Fetching all files from S3...');
    const allFiles = [];
    let continuationToken = undefined;

    do {
      const command = new ListObjectsV2Command({
        Bucket: BUCKET_NAME,
        ContinuationToken: continuationToken,
      });

      const response = await s3Client.send(command);
      if (response.Contents) {
        allFiles.push(...response.Contents);
      }
      continuationToken = response.NextContinuationToken;
    } while (continuationToken);

    if (allFiles.length === 0) {
      console.log('📭 No files found in S3 bucket');
      return;
    }

    // Basic statistics
    const totalSize = allFiles.reduce((sum, file) => sum + (file.Size || 0), 0);
    const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(2);

    console.log(`📊 S3 Storage Statistics:`);
    console.log(`   Total files: ${allFiles.length}`);
    console.log(`   Total size: ${totalSizeMB} MB`);
    console.log(
      `   Average file size: ${(totalSize / allFiles.length / 1024).toFixed(2)} KB\n`
    );

    // Group files by type (based on file extension)
    const filesByType = allFiles.reduce((acc, file) => {
      const key = file.Key || '';
      const extension = key.split('.').pop()?.toLowerCase() || 'unknown';

      // Map extensions to types
      let type = 'other';
      if (
        ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(extension)
      ) {
        type = 'image';
      } else if (
        ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm'].includes(extension)
      ) {
        type = 'video';
      } else if (['mp3', 'wav', 'flac', 'aac', 'ogg'].includes(extension)) {
        type = 'audio';
      } else if (['pdf', 'doc', 'docx', 'txt', 'rtf'].includes(extension)) {
        type = 'document';
      } else if (['zip', 'rar', '7z', 'tar', 'gz'].includes(extension)) {
        type = 'archive';
      }

      if (!acc[type]) acc[type] = [];
      acc[type].push(file);
      return acc;
    }, {});

    console.log('📁 Files by type:');
    Object.entries(filesByType)
      .sort(([, a], [, b]) => b.length - a.length)
      .forEach(([type, typeFiles]) => {
        const typeSize = typeFiles.reduce(
          (sum, file) => sum + (file.Size || 0),
          0
        );
        const typeSizeMB = (typeSize / (1024 * 1024)).toFixed(2);
        console.log(`   ${type}: ${typeFiles.length} files (${typeSizeMB} MB)`);
      });

    // Group files by directory/prefix
    const filesByDirectory = allFiles.reduce((acc, file) => {
      const key = file.Key || '';
      const pathParts = key.split('/');
      const directory = pathParts.length > 1 ? pathParts[0] : 'root';

      if (!acc[directory]) acc[directory] = [];
      acc[directory].push(file);
      return acc;
    }, {});

    console.log('\n📂 Files by directory:');
    Object.entries(filesByDirectory)
      .sort(([, a], [, b]) => b.length - a.length)
      .forEach(([directory, dirFiles]) => {
        const dirSize = dirFiles.reduce(
          (sum, file) => sum + (file.Size || 0),
          0
        );
        const dirSizeMB = (dirSize / (1024 * 1024)).toFixed(2);
        console.log(
          `   ${directory}: ${dirFiles.length} files (${dirSizeMB} MB)`
        );
      });

    // Recent uploads (last 20)
    const recentFiles = allFiles
      .filter((file) => file.LastModified)
      .sort((a, b) => new Date(b.LastModified) - new Date(a.LastModified))
      .slice(0, 20);

    console.log('\n🕒 Recent uploads (last 20):');
    recentFiles.forEach((file, index) => {
      const sizeKB = ((file.Size || 0) / 1024).toFixed(2);
      const uploadedAt = new Date(file.LastModified).toLocaleString();
      const fileName = file.Key?.split('/').pop() || 'unknown';
      console.log(`   ${index + 1}. ${fileName}`);
      console.log(
        `      Size: ${sizeKB} KB | Key: ${file.Key} | Uploaded: ${uploadedAt}`
      );
    });

    // Large files (> 1MB)
    const largeFiles = allFiles
      .filter((file) => (file.Size || 0) > 1024 * 1024)
      .sort((a, b) => (b.Size || 0) - (a.Size || 0));

    if (largeFiles.length > 0) {
      console.log(`\n📦 Large files (> 1MB):`);
      largeFiles.forEach((file, index) => {
        const sizeMB = ((file.Size || 0) / (1024 * 1024)).toFixed(2);
        const fileName = file.Key?.split('/').pop() || 'unknown';
        console.log(`   ${index + 1}. ${fileName} (${sizeMB} MB)`);
      });
    }

    // File extension breakdown
    const extensionCounts = allFiles.reduce((acc, file) => {
      const key = file.Key || '';
      const extension = key.split('.').pop()?.toLowerCase() || 'no-extension';
      acc[extension] = (acc[extension] || 0) + 1;
      return acc;
    }, {});

    console.log('\n🎯 File extension breakdown:');
    Object.entries(extensionCounts)
      .sort(([, a], [, b]) => b - a)
      .forEach(([extension, count]) => {
        console.log(`   .${extension}: ${count} files`);
      });

    // Show processed image patterns (display, thumb variants)
    const imageFiles = allFiles.filter((file) => {
      const key = file.Key || '';
      const extension = key.split('.').pop()?.toLowerCase() || '';
      return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(
        extension
      );
    });

    if (imageFiles.length > 0) {
      console.log('\n🖼️ Image files analysis:');

      // Group by base name (remove variants)
      const imageGroups = imageFiles.reduce((acc, file) => {
        const key = file.Key || '';
        const fileName = key.split('/').pop() || '';

        // Extract base name (remove timestamp and variants)
        let baseName = fileName
          .replace(/^\d+-/, '') // Remove timestamp prefix
          .replace(/-display\.webp$/, '') // Remove display variant
          .replace(/-thumb\.webp$/, '') // Remove thumb variant
          .replace(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i, ''); // Remove extension

        if (!acc[baseName]) acc[baseName] = [];
        acc[baseName].push(file);
        return acc;
      }, {});

      // Show files with multiple variants (likely processed images)
      const multiVariantImages = Object.entries(imageGroups)
        .filter(([, files]) => files.length > 1)
        .sort(([, a], [, b]) => b.length - a.length);

      if (multiVariantImages.length > 0) {
        console.log('   Processed images (multiple variants):');
        multiVariantImages.slice(0, 10).forEach(([baseName, files]) => {
          const totalSize = files.reduce(
            (sum, file) => sum + (file.Size || 0),
            0
          );
          const totalSizeKB = (totalSize / 1024).toFixed(2);
          console.log(
            `   ${baseName}: ${files.length} variants (${totalSizeKB} KB total)`
          );
          files.forEach((file) => {
            const fileName = file.Key?.split('/').pop() || 'unknown';
            const sizeKB = ((file.Size || 0) / 1024).toFixed(2);
            console.log(`     - ${fileName} (${sizeKB} KB)`);
          });
        });
      }

      // Show single images
      const singleImages = Object.entries(imageGroups).filter(
        ([, files]) => files.length === 1
      ).length;

      if (singleImages > 0) {
        console.log(`   Single images (no variants): ${singleImages} files`);
      }
    }

    // User directory analysis
    const userDirectories = allFiles.reduce((acc, file) => {
      const key = file.Key || '';
      const pathParts = key.split('/');
      if (pathParts.length >= 2 && pathParts[0] === 'uploads') {
        const userId = pathParts[1];
        if (!acc[userId]) acc[userId] = [];
        acc[userId].push(file);
      }
      return acc;
    }, {});

    if (Object.keys(userDirectories).length > 0) {
      console.log('\n👥 User directories:');
      Object.entries(userDirectories)
        .sort(([, a], [, b]) => b.length - a.length)
        .forEach(([userId, userFiles]) => {
          const userSize = userFiles.reduce(
            (sum, file) => sum + (file.Size || 0),
            0
          );
          const userSizeMB = (userSize / (1024 * 1024)).toFixed(2);
          console.log(
            `   ${userId}: ${userFiles.length} files (${userSizeMB} MB)`
          );
        });
    }

    // Export to JSON file
    const exportData = {
      timestamp: new Date().toISOString(),
      bucket: BUCKET_NAME,
      region: s3Config.region,
      totalFiles: allFiles.length,
      totalSize: totalSize,
      totalSizeMB: parseFloat(totalSizeMB),
      filesByType: Object.fromEntries(
        Object.entries(filesByType).map(([type, typeFiles]) => [
          type,
          {
            count: typeFiles.length,
            size: typeFiles.reduce((sum, file) => sum + (file.Size || 0), 0),
            sizeMB: parseFloat(
              (
                typeFiles.reduce((sum, file) => sum + (file.Size || 0), 0) /
                (1024 * 1024)
              ).toFixed(2)
            ),
          },
        ])
      ),
      filesByDirectory: Object.fromEntries(
        Object.entries(filesByDirectory).map(([directory, dirFiles]) => [
          directory,
          {
            count: dirFiles.length,
            size: dirFiles.reduce((sum, file) => sum + (file.Size || 0), 0),
            sizeMB: parseFloat(
              (
                dirFiles.reduce((sum, file) => sum + (file.Size || 0), 0) /
                (1024 * 1024)
              ).toFixed(2)
            ),
          },
        ])
      ),
      files: allFiles.map((file) => ({
        key: file.Key,
        fileName: file.Key?.split('/').pop() || 'unknown',
        size: file.Size || 0,
        lastModified: file.LastModified,
        etag: file.ETag,
        storageClass: file.StorageClass,
      })),
    };

    const exportPath = path.join(__dirname, 's3-files-export.json');
    fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2));
    console.log(`\n💾 Export saved to: ${exportPath}`);

    console.log('\n✅ S3 file listing completed!');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the script
listS3Files();
