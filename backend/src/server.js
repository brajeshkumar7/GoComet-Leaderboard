require('dotenv').config();
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
