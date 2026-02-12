const { createClient } = require('redis');

let redisClient = null;
let isRedisAvailable = false;

/**
 * Initialize Redis cache connection
 * Gracefully handles Redis unavailability - application continues without cache
 */
async function initCache() {
  try {
    const redisUrl = process.env.REDIS_URL;
    
    if (!redisUrl) {
      console.warn('⚠ REDIS_URL not provided. Caching will be disabled.');
      isRedisAvailable = false;
      return null;
    }

    redisClient = createClient({
      url: redisUrl,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            console.warn('⚠ Redis reconnection failed after 10 attempts. Caching disabled.');
            isRedisAvailable = false;
            return false; // Stop reconnecting
          }
          return Math.min(retries * 100, 3000); // Exponential backoff, max 3s
        }
      }
    });

    redisClient.on('error', (err) => {
      console.error('Redis Client Error:', err.message);
      isRedisAvailable = false;
    });

    redisClient.on('connect', () => {
      console.log('✓ Redis Client Connected');
      isRedisAvailable = true;
    });

    redisClient.on('ready', () => {
      console.log('✓ Redis Client Ready');
      isRedisAvailable = true;
    });

    redisClient.on('end', () => {
      console.warn('⚠ Redis connection ended. Caching disabled.');
      isRedisAvailable = false;
    });

    await redisClient.connect();
    isRedisAvailable = true;
    return redisClient;
  } catch (error) {
    console.warn('⚠ Redis connection failed. Application will continue without caching:', error.message);
    isRedisAvailable = false;
    redisClient = null;
    // Don't throw - allow application to continue without cache
    return null;
  }
}

/**
 * Check if Redis is available
 * @returns {boolean} True if Redis is connected and ready
 */
function isAvailable() {
  return isRedisAvailable && redisClient !== null;
}

/**
 * Get cached value by key
 * Gracefully falls back to null if Redis is unavailable
 * @param {string} key - Cache key
 * @returns {Promise<any|null>} Cached value or null
 */
async function getCache(key) {
  if (!isAvailable()) {
    return null;
  }

  try {
    const value = await redisClient.get(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    console.error(`Redis get error for key "${key}":`, error.message);
    isRedisAvailable = false;
    return null; // Graceful fallback
  }
}

/**
 * Set cache value with expiration
 * Gracefully fails silently if Redis is unavailable
 * @param {string} key - Cache key
 * @param {any} value - Value to cache
 * @param {number} expirationSeconds - TTL in seconds
 */
async function setCache(key, value, expirationSeconds = 3600) {
  if (!isAvailable()) {
    return; // Graceful fallback - don't throw
  }

  try {
    await redisClient.setEx(key, expirationSeconds, JSON.stringify(value));
  } catch (error) {
    console.error(`Redis set error for key "${key}":`, error.message);
    isRedisAvailable = false;
    // Don't throw - graceful fallback
  }
}

/**
 * Delete cache key
 * Gracefully fails silently if Redis is unavailable
 * @param {string} key - Cache key to delete
 */
async function deleteCache(key) {
  if (!isAvailable()) {
    return; // Graceful fallback
  }

  try {
    await redisClient.del(key);
  } catch (error) {
    console.error(`Redis delete error for key "${key}":`, error.message);
    isRedisAvailable = false;
    // Don't throw - graceful fallback
  }
}

/**
 * Delete cache keys matching pattern
 * Gracefully fails silently if Redis is unavailable
 * @param {string} pattern - Pattern to match (e.g., "leaderboard:*")
 */
async function deleteCachePattern(pattern) {
  if (!isAvailable()) {
    return; // Graceful fallback
  }

  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
  } catch (error) {
    console.error(`Redis delete pattern error for "${pattern}":`, error.message);
    isRedisAvailable = false;
    // Don't throw - graceful fallback
  }
}

/**
 * Close Redis connection
 */
async function close() {
  if (redisClient) {
    try {
      await redisClient.quit();
      isRedisAvailable = false;
      console.log('✓ Redis connection closed');
    } catch (error) {
      console.error('Error closing Redis connection:', error.message);
    }
    redisClient = null;
  }
}

module.exports = {
  initCache,
  isAvailable,
  getCache,
  setCache,
  deleteCache,
  deleteCachePattern,
  close
};
