#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Health check function to add to declaration files
const healthCheckCode = `
// Health check function to prevent crashes when ICP is unavailable
const isIcpAvailable = async () => {
  try {
    const host = process.env.NEXT_PUBLIC_IC_HOST || 'http://127.0.0.1:4943';
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    
    const res = await fetch(\`\${host}/api/v2/status\`, {
      method: 'GET',
      signal: controller.signal,
      cache: 'no-store',
    });
    
    clearTimeout(timeoutId);
    return res.ok;
  } catch {
    return false;
  }
};`;

// Safe fetchRootKey code to replace the original
const safeFetchRootKeyCode = `
    // SAFE fetchRootKey with health check - only call if ICP is available
    if (process.env.NEXT_PUBLIC_DFX_NETWORK !== 'ic') {
      // Check if ICP is available before calling fetchRootKey
      isIcpAvailable().then(available => {
        if (available) {
          agent.fetchRootKey().catch((err) => {
            console.warn('Unable to fetch root key. ICP may be unavailable');
            console.error(err);
          });
        } else {
          console.warn('ICP network unavailable, skipping fetchRootKey to prevent crashes');
        }
      });
    }`;

// Files to patch
const declarationFiles = [
  'src/ic/declarations/backend/index.js',
  'src/ic/declarations/internet_identity/index.js',
  'src/ic/declarations/canister_factory/index.js',
];

function patchDeclarationFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');

  // Add health check function after imports
  if (!content.includes('isIcpAvailable')) {
    content = content.replace(
      /export const canisterId = process\.env\.NEXT_PUBLIC_CANISTER_ID_/,
      `${healthCheckCode}\n\nexport const canisterId = process.env.NEXT_PUBLIC_CANISTER_ID_`
    );
  }

  // Replace the original fetchRootKey call with safe version
  const originalFetchRootKey = /\/\/ Fetch root key for certificate validation during development[\s\S]*?}\);/;
  if (originalFetchRootKey.test(content)) {
    content = content.replace(originalFetchRootKey, safeFetchRootKeyCode);
  }

  fs.writeFileSync(filePath, content);
  console.log(`Patched: ${filePath}`);
}

// Patch all declaration files
console.log('Patching declaration files...');
declarationFiles.forEach(patchDeclarationFile);
console.log('Done! Declaration files have been patched with health checks.');
