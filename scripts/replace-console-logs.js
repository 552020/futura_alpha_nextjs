#!/usr/bin/env node

/**
 * Script to replace console.log statements with proper logger calls
 *
 * Usage: node scripts/replace-console-logs.js [directory]
 * Example: node scripts/replace-console-logs.js src/app/api
 */

const fs = require('fs');
const path = require('path');

// Mapping of file patterns to appropriate loggers
const loggerMapping = {
  upload: 'uploadLogger',
  memory: 'memoryLogger',
  user: 'userLogger',
  auth: 'authLogger',
  api: 'apiLogger',
  database: 'dbLogger',
  icp: 'icpLogger',
  s3: 's3Logger',
  'vercel-blob': 'vercelBlobLogger',
  gallery: 'galleryLogger',
  test: 'testLogger',
  'image-processing': 'imageProcessingLogger',
  default: 'logger',
};

function getLoggerForFile(filePath) {
  const fileName = path.basename(filePath);
  const dirName = path.dirname(filePath);

  // Check for specific patterns
  for (const [pattern, logger] of Object.entries(loggerMapping)) {
    if (fileName.includes(pattern) || dirName.includes(pattern)) {
      return logger;
    }
  }

  return loggerMapping.default;
}

function replaceConsoleStatements(content, loggerName) {
  // Replace console.log with logger.info
  content = content.replace(/console\.log\(([^)]+)\)/g, `${loggerName}.info($1)`);

  // Replace console.error with logger.error
  content = content.replace(/console\.error\(([^)]+)\)/g, `${loggerName}.error($1)`);

  // Replace console.warn with logger.warn
  content = content.replace(/console\.warn\(([^)]+)\)/g, `${loggerName}.warn($1)`);

  // Replace console.info with logger.info
  content = content.replace(/console\.info\(([^)]+)\)/g, `${loggerName}.info($1)`);

  // Replace console.debug with logger.debug
  content = content.replace(/console\.debug\(([^)]+)\)/g, `${loggerName}.debug($1)`);

  return content;
}

function addLoggerImport(content, loggerName) {
  // Check if logger is already imported
  if (content.includes(`import { ${loggerName}`) || content.includes(`import { logger`)) {
    return content;
  }

  // Find the last import statement
  const importRegex = /import\s+.*?from\s+['"][^'"]+['"];?\s*\n/g;
  const imports = content.match(importRegex);

  if (imports && imports.length > 0) {
    const lastImport = imports[imports.length - 1];
    const lastImportIndex = content.lastIndexOf(lastImport);
    const insertIndex = lastImportIndex + lastImport.length;

    const loggerImport = `import { ${loggerName} } from '@/lib/logger';\n`;
    return content.slice(0, insertIndex) + loggerImport + content.slice(insertIndex);
  }

  // If no imports found, add at the top
  return `import { ${loggerName} } from '@/lib/logger';\n\n` + content;
}

function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');

    // Skip if no console statements
    if (!content.includes('console.')) {
      return;
    }

    const loggerName = getLoggerForFile(filePath);
    let newContent = content;

    // Add logger import
    newContent = addLoggerImport(newContent, loggerName);

    // Replace console statements
    newContent = replaceConsoleStatements(newContent, loggerName);

    // Only write if content changed
    if (newContent !== content) {
      fs.writeFileSync(filePath, newContent, 'utf8');
      console.log(`✅ Updated: ${filePath} (using ${loggerName})`);
    }
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
  }
}

function processDirectory(dirPath) {
  const items = fs.readdirSync(dirPath);

  for (const item of items) {
    const fullPath = path.join(dirPath, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      // Skip node_modules and other common directories
      if (!['node_modules', '.git', '.next', 'dist', 'build'].includes(item)) {
        processDirectory(fullPath);
      }
    } else if (
      stat.isFile() &&
      (item.endsWith('.ts') || item.endsWith('.tsx') || item.endsWith('.js') || item.endsWith('.jsx'))
    ) {
      processFile(fullPath);
    }
  }
}

// Main execution
const targetDir = process.argv[2] || 'src';
const fullPath = path.resolve(targetDir);

if (!fs.existsSync(fullPath)) {
  console.error(`❌ Directory not found: ${fullPath}`);
  process.exit(1);
}

console.log(`🔍 Processing directory: ${fullPath}`);
processDirectory(fullPath);
console.log('✅ Console.log replacement complete!');
