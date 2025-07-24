#!/usr/bin/env node

/**
 * Script to clear Redis cache after deployment
 * Usage: node clear-cache.js [environment]
 */

const Redis = require('redis');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Get environment from command line argument
const environment = process.argv[2] || 'development';
console.log(`Clearing cache for ${environment} environment`);

// Load environment variables
const envFile = `.env.${environment}`;
if (fs.existsSync(envFile)) {
  dotenv.config({ path: envFile });
} else {
  dotenv.config();
}

// Redis connection configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || '0')
};

// Connect to Redis
const client = Redis.createClient(redisConfig);

client.on('error', (err) => {
  console.error('Redis connection error:', err);
  process.exit(1);
});

client.on('connect', async () => {
  console.log('Connected to Redis server');
  
  try {
    // Clear specific cache keys based on environment
    if (environment === 'production') {
      // In production, selectively clear cache to avoid full purge
      const keys = await client.keys('stock:*');
      if (keys.length > 0) {
        console.log(`Clearing ${keys.length} stock cache keys`);
        await client.del(keys);
      }
      
      // Clear API response cache
      const apiKeys = await client.keys('api:response:*');
      if (apiKeys.length > 0) {
        console.log(`Clearing ${apiKeys.length} API cache keys`);
        await client.del(apiKeys);
      }
    } else {
      // In non-production environments, clear all cache
      console.log('Flushing all cache data');
      await client.flushDb();
    }
    
    console.log('Cache cleared successfully');
  } catch (error) {
    console.error('Error clearing cache:', error);
  } finally {
    client.quit();
  }
});