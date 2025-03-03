#!/usr/bin/env node

/**
 * This script fixes import paths in the Cloudflare Worker build output.
 * Cloudflare Workers require ESM imports to have file extensions.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the worker.js file
const workerPath = path.join(__dirname, '../apps/webhook-handler/cloudflare-worker/worker.js');

// Check if the file exists
if (!fs.existsSync(workerPath)) {
  console.error(`Error: ${workerPath} does not exist`);
  process.exit(1);
}

// Read the file
let content = fs.readFileSync(workerPath, 'utf8');

// Fix imports by adding .js extension to relative imports
content = content.replace(/from\s+['"](\.[^'"]+)['"]/g, (match, importPath) => {
  // Only add .js if it doesn't already have an extension
  if (!path.extname(importPath)) {
    return `from '${importPath}.js'`;
  }
  return match;
});

// Write the file back
fs.writeFileSync(workerPath, content);

console.log('Fixed Cloudflare Worker imports');
