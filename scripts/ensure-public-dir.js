import { existsSync, mkdirSync } from 'fs';
import { resolve } from 'path';

// Ensure the public directory exists
const publicDir = resolve(process.cwd(), 'public');

if (!existsSync(publicDir)) {
  console.log(`Creating public directory: ${publicDir}`);
  mkdirSync(publicDir, { recursive: true });
} else {
  console.log(`Public directory already exists: ${publicDir}`);
}
