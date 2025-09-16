#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up ngrok for your app development...\n');

// Check if developer has their own ngrok URL in environment
const customNgrokUrl = process.env.NEXT_PUBLIC_NGROK_URL;
const defaultNgrokUrl = 'https://theological-damion-unpatronizing.ngrok-free.app';

const ngrokUrl = customNgrokUrl || defaultNgrokUrl;

// Create .env.local content
const envContent = `# ngrok configuration for development
NEXT_PUBLIC_NGROK_URL=${ngrokUrl}

# Development mode flag
NODE_ENV=development
`;

// Write .env.local file
const envPath = path.join(__dirname, '..', '.env.local');
fs.writeFileSync(envPath, envContent);

console.log('✅ Created .env.local with ngrok configuration');
console.log(`📝 ngrok URL: ${ngrokUrl}`);
console.log('\n🔧 Next steps:');
console.log('1. Run: npm run dev:with-ngrok');
console.log('2. Your app will be accessible from the internet');
console.log('\n📋 Your app will be available at:');
console.log(`   - Local: http://localhost:3000`);
console.log(`   - Public: ${ngrokUrl}`);
console.log('\n🎯 This allows external services to call your API endpoints:');
console.log(`   ${ngrokUrl}/api/*`);
