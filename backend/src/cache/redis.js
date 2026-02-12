const { createClient } = require('redis');

let redisClient = null;

async function initCache() {
  try {
    const redisUrl = process.env.REDIS_URL;
    
    if (!redisUrl) {
      throw new Error('REDIS_URL environment variable is required');
    }

    redisClient = createClient({
      url: redisUrl
    });

    redisClient.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });

    redisClient.on('connect', () => {
      console.log('Redis Client Connected');
    });

    await redisClient.connect();

    return redisClient;
  } catch (error) {
    console.error('Redis connection error:', error);
    throw error;
  }
}

function getRedisClient() {
  if (!redisClient) {
    throw new Error('Redis not initialized. Call initCache() first.');
  }
  return redisClient;
}

async function getCache(key) {
  try {
    const client = getRedisClient();
    const value = await client.get(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    console.error('Redis get error:', error);
    return null;
  }
}

async function setCache(key, value, expirationSeconds = 3600) {
  try {
    const client = getRedisClient();
    await client.setEx(key, expirationSeconds, JSON.stringify(value));
  } catch (error) {
    console.error('Redis set error:', error);
  }
}

async function deleteCache(key) {
  try {
    const client = getRedisClient();
    await client.del(key);
  } catch (error) {
    console.error('Redis delete error:', error);
  }
}

async function deleteCachePattern(pattern) {
  try {
    const client = getRedisClient();
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(keys);
    }
  } catch (error) {
    console.error('Redis delete pattern error:', error);
  }
}

module.exports = {
  initCache,
  getRedisClient,
  getCache,
  setCache,
  deleteCache,
  deleteCachePattern
};
