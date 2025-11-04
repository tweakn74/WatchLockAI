#!/usr/bin/env node

/**
 * Export KV namespace data to JSON
 */

import fs from 'fs/promises';

const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const KV_NAMESPACE_ID = process.env.KV_NAMESPACE_ID;

const API_BASE = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/storage/kv/namespaces`;

/**
 * Main export function
 */
async function exportKV() {
  if (!CLOUDFLARE_API_TOKEN || !CLOUDFLARE_ACCOUNT_ID) {
    console.error('Missing required environment variables:');
    console.error('- CLOUDFLARE_API_TOKEN');
    console.error('- CLOUDFLARE_ACCOUNT_ID');
    process.exit(1);
  }

  console.log('Starting KV export...');

  try {
    // Create backups directory
    await fs.mkdir('backups', { recursive: true });

    // Get namespace ID if not provided
    let namespaceId = KV_NAMESPACE_ID;

    if (!namespaceId) {
      console.log('Fetching KV namespaces...');
      const namespaces = await listNamespaces();
      const newsKV = namespaces.find(ns => ns.title === 'NEWS_KV');

      if (!newsKV) {
        console.error('NEWS_KV namespace not found');
        process.exit(1);
      }

      namespaceId = newsKV.id;
      console.log(`Found NEWS_KV namespace: ${namespaceId}`);
    }

    // List all keys
    console.log('Listing keys...');
    const keys = await listKeys(namespaceId);
    console.log(`Found ${keys.length} keys`);

    // Export each key
    const data = {};

    for (const key of keys) {
      console.log(`Exporting: ${key.name}`);
      const value = await getKey(namespaceId, key.name);
      data[key.name] = value;
    }

    // Write to file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backups/kv-dump-${timestamp}.json`;

    await fs.writeFile(filename, JSON.stringify(data, null, 2));

    console.log(`✅ Export complete: ${filename}`);
    console.log(`Exported ${Object.keys(data).length} keys`);
  } catch (error) {
    console.error('Export failed:', error.message);
    process.exit(1);
  }
}

/**
 * List all KV namespaces
 */
async function listNamespaces() {
  const response = await fetch(API_BASE, {
    headers: {
      Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to list namespaces: ${response.status}`);
  }

  const data = await response.json();
  return data.result || [];
}

/**
 * List all keys in a namespace
 */
async function listKeys(namespaceId) {
  const allKeys = [];
  let cursor = null;

  do {
    const url = new URL(`${API_BASE}/${namespaceId}/keys`);
    if (cursor) url.searchParams.set('cursor', cursor);

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to list keys: ${response.status}`);
    }

    const data = await response.json();
    allKeys.push(...(data.result || []));

    cursor = data.result_info?.cursor;
  } while (cursor);

  return allKeys;
}

/**
 * Get a key value
 */
async function getKey(namespaceId, key) {
  const response = await fetch(`${API_BASE}/${namespaceId}/values/${encodeURIComponent(key)}`, {
    headers: {
      Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to get key ${key}: ${response.status}`);
  }

  const contentType = response.headers.get('content-type');

  if (contentType && contentType.includes('application/json')) {
    return await response.json();
  } else {
    return await response.text();
  }
}

// Run export
exportKV();
