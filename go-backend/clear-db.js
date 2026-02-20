#!/usr/bin/env node

/**
 * Clear Database Script (Go backend)
 * Deletes all documents from all non-system collections
 * in the Go backend MongoDB database.
 */

const fs = require('fs');
const path = require('path');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separator = trimmed.indexOf('=');
    if (separator === -1) {
      continue;
    }

    const key = trimmed.slice(0, separator).trim();
    if (!key) {
      continue;
    }

    let value = trimmed.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function loadEnv() {
  const candidates = [
    path.join(process.cwd(), '.env'),
    path.join(__dirname, '.env'),
    path.join(__dirname, '../.env'),
  ];

  for (const envPath of candidates) {
    loadEnvFile(envPath);
  }
}

function requireMongoClient() {
  const candidates = [
    'mongodb',
    path.join(__dirname, 'node_modules', 'mongodb'),
    path.join(__dirname, '..', 'backend', 'node_modules', 'mongodb'),
  ];

  for (const candidate of candidates) {
    try {
      const module = require(candidate);
      if (module && module.MongoClient) {
        return module.MongoClient;
      }
    } catch {
      // Try next candidate.
    }
  }

  throw new Error(
    'Cannot find the "mongodb" package. Install it in this repo or run "npm install" in /backend first.'
  );
}

async function clearDatabase() {
  loadEnv();

  const MongoClient = requireMongoClient();
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/msme_marketplace';
  const dbName = process.env.MONGODB_DB_NAME || 'msme_marketplace';

  const client = new MongoClient(uri);

  try {
    console.log('Connecting to MongoDB...');
    await client.connect();
    console.log(`Connected. Using database: ${dbName}`);

    const db = client.db(dbName);
    const collections = await db.listCollections({}, { nameOnly: true }).toArray();
    const targetCollections = collections
      .map((collection) => collection.name)
      .filter((name) => !name.startsWith('system.'));

    if (targetCollections.length === 0) {
      console.log('No collections found to clear.');
      return;
    }

    console.log('\nDeleting all documents from collections:');
    let totalDeleted = 0;

    for (const collectionName of targetCollections) {
      const result = await db.collection(collectionName).deleteMany({});
      const deleted = result.deletedCount || 0;
      totalDeleted += deleted;
      console.log(`- ${collectionName}: ${deleted} deleted`);
    }

    console.log(`\nDatabase clear complete. Total deleted documents: ${totalDeleted}`);
  } finally {
    await client.close();
  }
}

clearDatabase().catch((error) => {
  console.error('Failed to clear database:', error.message);
  process.exit(1);
});
