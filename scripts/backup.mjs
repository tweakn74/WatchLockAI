#!/usr/bin/env node

/**
 * Comprehensive backup script
 */

import fs from 'fs/promises';
import { execSync } from 'child_process';

async function backup() {
  console.log('🔄 Starting backup process...');

  try {
    // Create backups directory
    await fs.mkdir('backups', { recursive: true });
    await fs.mkdir('artifacts', { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    // 1. Export KV data
    console.log('\n📦 Exporting KV data...');
    try {
      execSync('node scripts/kv_export.mjs', { stdio: 'inherit' });
    } catch {
      console.warn('⚠️  KV export failed (may not be configured yet)');
    }

    // 2. Create code bundle
    console.log('\n📦 Creating code bundle...');
    const bundleName = `artifacts/backup-${timestamp}.zip`;

    try {
      execSync(
        `zip -r "${bundleName}" worker/ index.html app.js package.json wrangler.toml README.md -x "*.git*" "node_modules/*"`,
        {
          stdio: 'inherit',
        }
      );
      console.log(`✅ Code bundle created: ${bundleName}`);
    } catch (error) {
      console.error('❌ Failed to create bundle:', error.message);
    }

    // 3. Create backup manifest
    console.log('\n📝 Creating backup manifest...');
    const manifest = {
      timestamp: new Date().toISOString(),
      version: timestamp,
      files: {
        bundle: bundleName,
        kvDump: `backups/kv-dump-${timestamp}.json`,
      },
      git: {
        commit: execSync('git rev-parse HEAD').toString().trim(),
        branch: execSync('git rev-parse --abbrev-ref HEAD').toString().trim(),
      },
    };

    await fs.writeFile(`backups/manifest-${timestamp}.json`, JSON.stringify(manifest, null, 2));

    console.log('\n✅ Backup complete!');
    console.log(`Version: ${timestamp}`);
  } catch (error) {
    console.error('\n❌ Backup failed:', error.message);
    process.exit(1);
  }
}

backup();
