#!/usr/bin/env node

/**
 * Vercel Blob Folder Deletion Script
 *
 * This script deletes all files in a specific folder within your Vercel Blob storage.
 * It will ask for interactive confirmation before proceeding.
 *
 * Usage:
 *   node scripts/blob/delete-folder.js uploads
 *   node scripts/blob/delete-folder.js fotokotti
 *   node scripts/blob/delete-folder.js uploads --dry-run
 */

const { list, del } = require('@vercel/blob');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Load environment variables from .env.local
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });

// Helper function to ask for user confirmation
function askConfirmation(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer.toLowerCase().trim());
    });
  });
}

async function deleteFolderFiles() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const folderName = args[0];
  const isDryRun = args.includes('--dry-run');

  if (!folderName) {
    console.error('❌ Error: Please provide a folder name');
    console.log('\nUsage:');
    console.log('  node scripts/blob/delete-folder.js <folder-name>');
    console.log('  node scripts/blob/delete-folder.js <folder-name> --dry-run');
    console.log('\nExamples:');
    console.log('  node scripts/blob/delete-folder.js uploads --dry-run');
    console.log('  node scripts/blob/delete-folder.js uploads');
    process.exit(1);
  }

  console.log(`🗂️ Deleting files in folder: "${folderName}"`);
  if (isDryRun) {
    console.log('🔍 DRY RUN MODE - No files will be deleted');
  }
  console.log('');

  try {
    // Check if token is available
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      throw new Error('BLOB_READ_WRITE_TOKEN not found in environment variables');
    }

    // Get all blobs
    console.log('🔍 Fetching all files...');
    const blobs = await list();
    const allFiles = blobs.blobs;

    // Filter files in the specified folder
    const folderFiles = allFiles.filter(
      file => file.pathname.startsWith(`${folderName}/`) || (folderName === 'root' && !file.pathname.includes('/'))
    );

    if (folderFiles.length === 0) {
      console.log(`📭 No files found in folder "${folderName}"`);
      return;
    }

    // Calculate total size
    const totalSize = folderFiles.reduce((sum, file) => sum + file.size, 0);
    const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(2);

    console.log(`📊 Found ${folderFiles.length} files in "${folderName}" folder`);
    console.log(`📦 Total size: ${totalSizeMB} MB`);
    console.log('');

    // Show first 10 files as preview
    console.log('📄 Files to be deleted (showing first 10):');
    folderFiles.slice(0, 10).forEach((file, index) => {
      const sizeKB = (file.size / 1024).toFixed(2);
      console.log(`   ${index + 1}. ${file.pathname} (${sizeKB} KB)`);
    });

    if (folderFiles.length > 10) {
      console.log(`   ... and ${folderFiles.length - 10} more files`);
    }

    console.log('');

    if (isDryRun) {
      console.log('✅ Dry run completed - no files were deleted');
      return;
    }

    // Interactive confirmation
    console.log('⚠️  WARNING: This will permanently delete all files in the folder!');
    console.log(`📊 You are about to delete ${folderFiles.length} files (${totalSizeMB} MB)`);
    console.log('');

    const confirm1 = await askConfirmation('Are you sure you want to proceed? (yes/no): ');
    if (confirm1 !== 'yes' && confirm1 !== 'y') {
      console.log('❌ Operation cancelled by user');
      return;
    }

    console.log('');
    const confirm2 = await askConfirmation("Type 'DELETE' to confirm deletion: ");
    if (confirm2 !== 'delete') {
      console.log('❌ Operation cancelled - confirmation text did not match');
      return;
    }

    // Confirm deletion
    console.log('🗑️ Starting deletion process...');

    let deletedCount = 0;
    let errorCount = 0;
    const errors = [];

    // Delete files in batches to avoid overwhelming the API
    const batchSize = 10;
    for (let i = 0; i < folderFiles.length; i += batchSize) {
      const batch = folderFiles.slice(i, i + batchSize);

      console.log(
        `📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(folderFiles.length / batchSize)} (${
          batch.length
        } files)...`
      );

      // Delete files in parallel within each batch
      const deletePromises = batch.map(async file => {
        try {
          await del(file.url);
          deletedCount++;
          return { success: true, file: file.pathname };
        } catch (error) {
          errorCount++;
          errors.push({ file: file.pathname, error: error.message });
          return { success: false, file: file.pathname, error: error.message };
        }
      });

      const results = await Promise.all(deletePromises);

      // Show progress
      const batchSuccess = results.filter(r => r.success).length;
      const batchErrors = results.filter(r => !r.success).length;
      console.log(`   ✅ Deleted: ${batchSuccess}, ❌ Errors: ${batchErrors}`);
    }

    console.log('');
    console.log('📊 Deletion Summary:');
    console.log(`   ✅ Successfully deleted: ${deletedCount} files`);
    console.log(`   ❌ Errors: ${errorCount} files`);
    console.log(`   📦 Total size freed: ${totalSizeMB} MB`);

    if (errors.length > 0) {
      console.log('');
      console.log('❌ Files that failed to delete:');
      errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error.file}: ${error.error}`);
      });
    }

    if (deletedCount > 0) {
      console.log('');
      console.log('🎉 Folder cleanup completed!');
    }
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the script
deleteFolderFiles();
