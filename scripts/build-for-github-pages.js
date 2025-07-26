#!/usr/bin/env node

/**
 * Build script for GitHub Pages deployment
 * This script builds the project and copies the output to a docs folder
 * for GitHub Pages deployment
 */

import { execSync } from 'child_process';
import { existsSync, rmSync, cpSync } from 'fs';
import { join } from 'path';

console.log('🚀 Building for GitHub Pages...');

try {
  // Clean previous builds
  if (existsSync('dist')) {
    console.log('🧹 Cleaning previous build...');
    rmSync('dist', { recursive: true, force: true });
  }

  if (existsSync('docs')) {
    console.log('🧹 Cleaning previous docs folder...');
    rmSync('docs', { recursive: true, force: true });
  }

  // Build the project
  console.log('📦 Building project...');
  execSync('bun run build', { stdio: 'inherit' });

  // Copy dist to docs for GitHub Pages
  console.log('📁 Copying build to docs folder...');
  cpSync('dist', 'docs', { recursive: true });

  console.log('✅ Build complete!');
  console.log('');
  console.log('📋 Next steps:');
  console.log('1. Commit and push your changes to GitHub');
  console.log('2. Go to your repository settings');
  console.log('3. Navigate to Pages in the sidebar');
  console.log('4. Set source to "Deploy from a branch"');
  console.log('5. Select "main" branch and "/docs" folder');
  console.log('6. Click Save');
  console.log('');
  console.log('🔐 Don\'t forget to set your VITE_ADMIN_PASSWORD secret in repository settings!');

} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
} 