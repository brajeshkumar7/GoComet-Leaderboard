const mysql = require('mysql2/promise');

let pool = null;

/**
 * Initialize MySQL connection pool
 * Uses mysql2 library with connection pooling for high-scale performance
 */
// Use 127.0.0.1 when host is localhost to avoid IPv6 (::1) connection issues on Windows
function getDbHost() {
  const host = process.env.DB_HOST || 'localhost';
  return host === 'localhost' ? '127.0.0.1' : host;
}

async function initDatabase() {
  try {
    pool = mysql.createPool({
      host: getDbHost(),
      port: parseInt(process.env.DB_PORT, 10) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'leaderboard_db',
      waitForConnections: true,
      connectionLimit: 10,
      maxIdle: 10,
      idleTimeout: 60000,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0
    });

    // Test connection
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();

    // Create database schema
    await createSchema();

    return pool;
  } catch (error) {
    console.error('Database connection error:', error);
    throw error;
  }
}

/**
 * Create database schema with all tables, indexes, and foreign keys
 * Designed for high-scale leaderboard system with optimal indexing
 */
async function createSchema() {
  try {
    // Create users table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(100) NOT NULL UNIQUE,
        join_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_username (username)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Create game_sessions table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS game_sessions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        score INT NOT NULL,
        game_mode VARCHAR(50) NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_game_mode (game_mode),
        INDEX idx_timestamp (timestamp DESC)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Create leaderboard table
    // Note: 'rank' is a reserved keyword in MySQL, so it must be escaped with backticks
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS leaderboard (
        user_id INT PRIMARY KEY,
        total_score BIGINT NOT NULL DEFAULT 0,
        \`rank\` INT NOT NULL DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_total_score (total_score DESC),
        INDEX idx_user_id (user_id),
        INDEX idx_rank (\`rank\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    console.log('✓ Database schema initialized successfully');
  } catch (error) {
    console.error('Error creating database schema:', error);
    throw error;
  }
}

/**
 * Get the MySQL connection pool
 * @returns {mysql.Pool} MySQL connection pool
 */
function getPool() {
  if (!pool) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return pool;
}

/**
 * Execute a query with automatic connection management
 * @param {string} query - SQL query string
 * @param {Array} params - Query parameters
 * @returns {Promise<Array>} Query results
 */
async function query(query, params = []) {
  const pool = getPool();
  const [rows] = await pool.execute(query, params);
  return rows;
}

/**
 * Execute a transaction
 * @param {Function} callback - Transaction callback function
 * @returns {Promise<any>} Transaction result
 */
async function transaction(callback) {
  const pool = getPool();
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Close the database connection pool
 */
async function close() {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('✓ Database connection pool closed');
  }
}

module.exports = {
  initDatabase,
  getPool,
  query,
  transaction,
  close
};
