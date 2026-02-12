require('dotenv').config();
const app = require('./app');
const { initDatabase } = require('./db/mysql');
const { initCache } = require('./cache/redis');

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // Initialize database connection
    await initDatabase();
    console.log('✓ Database connected');

    // Initialize Redis cache
    await initCache();
    console.log('✓ Redis cache connected');

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
