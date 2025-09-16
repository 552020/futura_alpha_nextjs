#!/usr/bin/env node

/**
 * Vercel Blob Test Script
 *
 * This script tests basic Vercel Blob operations:
 * - Upload a file
 * - List files
 * - Delete a file
 */

const { put, del, list } = require("@vercel/blob");
const fs = require("fs");
const path = require("path");

// Load environment variables from .env.local
require("dotenv").config({ path: path.join(__dirname, "../../.env.local") });

async function testBlobOperations() {
  console.log("🧪 Testing Vercel Blob operations...\n");

  try {
    // Check if token is available
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      throw new Error("BLOB_READ_WRITE_TOKEN not found in environment variables");
    }
    console.log("✅ BLOB_READ_WRITE_TOKEN found");

    // Test 1: Upload a text file
    console.log("\n📤 Test 1: Uploading text file...");
    const textResult = await put("test-script.txt", "Hello from Vercel Blob script!", {
      access: "public",
      contentType: "text/plain",
    });
    console.log("✅ Upload successful:", textResult.url);

    // Test 2: Upload a JSON file
    console.log("\n📤 Test 2: Uploading JSON file...");
    const jsonData = {
      timestamp: new Date().toISOString(),
      message: "Test data from script",
      random: Math.random(),
    };
    const jsonResult = await put("test-script.json", JSON.stringify(jsonData, null, 2), {
      access: "public",
      contentType: "application/json",
    });
    console.log("✅ Upload successful:", jsonResult.url);

    // Test 3: List all blobs
    console.log("\n📋 Test 3: Listing all blobs...");
    const blobs = await list();
    console.log(`✅ Found ${blobs.blobs.length} blobs total`);

    // Show recent uploads
    const recentBlobs = blobs.blobs
      .filter((blob) => blob.pathname.includes("test-script"))
      .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));

    console.log("\n📄 Recent test uploads:");
    recentBlobs.forEach((blob) => {
      console.log(`  - ${blob.pathname} (${blob.size} bytes, ${blob.contentType})`);
    });

    // Test 4: Delete the test files
    console.log("\n🗑️ Test 4: Cleaning up test files...");
    await del(textResult.url);
    console.log("✅ Deleted text file");

    await del(jsonResult.url);
    console.log("✅ Deleted JSON file");

    console.log("\n🎉 All tests completed successfully!");
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    process.exit(1);
  }
}

// Run the tests
testBlobOperations();
