#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up ngrok for development...\n');

// Check if developer has their own ngrok URL
const customNgrokUrl = process.env.NEXT_PUBLIC_NGROK_URL;
const defaultNgrokUrl = 'https://theological-damion-unpatronizing.ngrok-free.app';

const ngrokUrl = customNgrokUrl || defaultNgrokUrl;

// Create .env.local content
const envContent = `# ngrok configuration for development
NEXT_PUBLIC_NGROK_URL=${ngrokUrl}

# Development mode flag
NODE_ENV=development
`;

// Write .env.local file (SAFELY append to existing file)
const envPath = path.join(__dirname, '..', '.env.local');

// Check if file exists and read existing content
let existingContent = '';
if (fs.existsSync(envPath)) {
  existingContent = fs.readFileSync(envPath, 'utf8');
  console.log('🔒 Found existing .env.local - will SAFELY append ngrok config');
}

// Only add ngrok config if it doesn't already exist
const ngrokConfigExists = existingContent.includes('NEXT_PUBLIC_NGROK_URL');
if (!ngrokConfigExists) {
  // Create backup before modifying
  if (existingContent) {
    const backupPath = envPath + '.backup.' + Date.now();
    fs.writeFileSync(backupPath, existingContent);
    console.log(`💾 Created backup: ${path.basename(backupPath)}`);
  }

  // Append ngrok configuration to existing content
  const finalContent = existingContent + (existingContent ? '\n' : '') + envContent;
  fs.writeFileSync(envPath, finalContent);
  console.log('✅ SAFELY added ngrok configuration to .env.local');
} else {
  console.log('✅ ngrok configuration already exists in .env.local');
}
console.log(`📝 ngrok URL: ${ngrokUrl}`);

if (customNgrokUrl) {
  console.log('🎯 Using your custom ngrok URL');
} else {
  console.log("⚠️  Using shared ngrok URL (Stefano's)");
  console.log('💡 For your own setup:');
  console.log('   1. Sign up at https://ngrok.com');
  console.log('   2. Get your authtoken');
  console.log('   3. Run: ngrok config add-authtoken <your-token>');
  console.log('   4. Set: export NEXT_PUBLIC_NGROK_URL=https://your-domain.ngrok-free.app');
  console.log('   5. Run this script again');
}

console.log('\n🔧 Next steps:');
console.log('1. Run: npm run dev:with-ngrok');
console.log('2. Your app will be accessible from the internet');
console.log('\n📋 Your app will be available at:');
console.log(`   - Local: http://localhost:3000`);
console.log(`   - Public: ${ngrokUrl}`);
console.log('\n🎯 This allows external services to call your API endpoints:');
console.log(`   ${ngrokUrl}/api/*`);
