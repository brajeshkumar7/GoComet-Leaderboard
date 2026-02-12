/**
 * Load environment variables first
 * This allows New Relic configuration to read from .env file
 */
require('dotenv').config();

/**
 * New Relic monitoring must be required BEFORE Express and other modules
 * This ensures proper instrumentation of Express and other dependencies
 * The agent will be disabled if NEW_RELIC_ENABLED=false or license key is missing
 */
if (process.env.NEW_RELIC_ENABLED !== 'false' && process.env.NEW_RELIC_LICENSE_KEY) {
  try {
    require('newrelic');
    console.log('✓ New Relic monitoring enabled');
  } catch (error) {
    console.warn('⚠ New Relic initialization failed:', error.message);
    console.warn('⚠ Application will continue without monitoring');
  }
} else {
  console.log('ℹ New Relic monitoring disabled (set NEW_RELIC_LICENSE_KEY to enable)');
}
const app = require('./app');
const { initDatabase } = require('./db/mysql');
const { initCache, isAvailable } = require('./cache/redis');

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // Initialize database connection
    await initDatabase();
    console.log('✓ Database connected');

    // Initialize Redis cache (graceful fallback if unavailable)
    await initCache();
    if (isAvailable()) {
      console.log('✓ Redis cache connected');
    } else {
      console.log('⚠ Redis cache unavailable - application will continue without caching');
    }

    // Start server
    app.listen(PORT, () => {
      console.log(`✓ Server running on port ${PORT}`);
      console.log(`✓ Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
