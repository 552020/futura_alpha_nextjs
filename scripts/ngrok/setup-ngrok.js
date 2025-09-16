#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting ngrok setup for UploadThing development...\n');

// Start ngrok
const ngrok = spawn('ngrok', ['http', '3000', '--log=stdout'], {
  stdio: ['pipe', 'pipe', 'pipe'],
});

let ngrokUrl = null;

ngrok.stdout.on('data', data => {
  const output = data.toString();
  console.log(output);

  // Look for the ngrok URL in the output
  const urlMatch = output.match(/https:\/\/[a-z0-9-]+\.ngrok\.io/);
  if (urlMatch && !ngrokUrl) {
    ngrokUrl = urlMatch[0];
    console.log(`\n✅ ngrok URL found: ${ngrokUrl}`);
    console.log(`\n📝 Add this to your .env.local file:`);
    console.log(`NEXT_PUBLIC_APP_URL=${ngrokUrl}`);
    console.log(`\n🔧 Or run this command:`);
    console.log(`echo "NEXT_PUBLIC_APP_URL=${ngrokUrl}" >> .env.local`);
  }
});

ngrok.stderr.on('data', data => {
  console.error('ngrok error:', data.toString());
});

ngrok.on('close', code => {
  console.log(`\nngrok process exited with code ${code}`);
});

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\n\n🛑 Stopping ngrok...');
  ngrok.kill();
  process.exit(0);
});

console.log('⏳ Waiting for ngrok to start...');
console.log('Press Ctrl+C to stop ngrok\n');
