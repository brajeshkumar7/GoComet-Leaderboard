const { getPool, transaction } = require('../db/mysql');
const { getCache, setCache, deleteCachePattern } = require('../cache/redis');

async function getLeaderboard({ limit = 100, offset = 0, gameMode = null }) {
  const cacheKey = `leaderboard:${gameMode || 'all'}:${limit}:${offset}`;
  
  // Try to get from cache
  const cached = await getCache(cacheKey);
  if (cached) {
    return cached;
  }

  const pool = getPool();
  let query, params;

  if (gameMode) {
    query = `
      SELECT 
        l.user_id,
        l.username,
        l.score,
        l.rank,
        l.game_mode,
        l.updated_at
      FROM leaderboard l
      WHERE l.game_mode = ?
      ORDER BY l.score DESC, l.updated_at ASC
      LIMIT ? OFFSET ?
    `;
    params = [gameMode, limit, offset];
  } else {
    query = `
      SELECT 
        l.user_id,
        l.username,
        l.score,
        l.rank,
        l.game_mode,
        l.updated_at
      FROM leaderboard l
      ORDER BY l.score DESC, l.updated_at ASC
      LIMIT ? OFFSET ?
    `;
    params = [limit, offset];
  }

  const [rows] = await pool.execute(query, params);

  const leaderboard = rows.map(row => ({
    userId: row.user_id,
    username: row.username,
    score: row.score,
    rank: row.rank,
    gameMode: row.game_mode,
    updatedAt: row.updated_at
  }));

  // Cache for 60 seconds
  await setCache(cacheKey, leaderboard, 60);

  return leaderboard;
}

async function updateLeaderboard(userId, username, score, gameMode) {
  const pool = getPool();

  // Get current rank
  const [higherScores] = await pool.execute(
    `SELECT COUNT(*) as count FROM leaderboard 
     WHERE game_mode = ? AND (score > ? OR (score = ? AND updated_at < NOW()))`,
    [gameMode, score, score]
  );

  const newRank = higherScores[0].count + 1;

  // Insert or update leaderboard entry
  await pool.execute(
    `INSERT INTO leaderboard (user_id, username, score, rank, game_mode)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       score = VALUES(score),
       rank = VALUES(rank),
       username = VALUES(username),
       updated_at = CURRENT_TIMESTAMP`,
    [userId, username, score, newRank, gameMode]
  );

  // Update ranks for all affected entries
  await pool.execute(
    `UPDATE leaderboard 
     SET rank = (
       SELECT COUNT(*) + 1 
       FROM leaderboard l2 
       WHERE l2.game_mode = leaderboard.game_mode 
       AND (l2.score > leaderboard.score OR (l2.score = leaderboard.score AND l2.updated_at < leaderboard.updated_at))
     )
     WHERE game_mode = ?`,
    [gameMode]
  );

  // Invalidate cache
  await deleteCachePattern(`leaderboard:${gameMode}:*`);
  await deleteCachePattern('leaderboard:all:*');
}

/**
 * Submit a score for a user
 * Uses MySQL transaction to ensure atomicity and concurrency safety
 * @param {number} userId - User ID
 * @param {number} score - Score value
 * @returns {Promise<Object>} Submission result with updated rank
 */
async function submitScore(userId, score) {
  return await transaction(async (connection) => {
    // Ensure user exists (create if not exists)
    await connection.execute(
      'INSERT INTO users (id, username) VALUES (?, ?) ON DUPLICATE KEY UPDATE id = id',
      [userId, `user_${userId}`]
    );

    // Insert game session record
    await connection.execute(
      'INSERT INTO game_sessions (user_id, score, game_mode) VALUES (?, ?, ?)',
      [userId, score, 'default']
    );

    // Update leaderboard total_score atomically
    // Use INSERT ... ON DUPLICATE KEY UPDATE with atomic increment
    await connection.execute(
      `INSERT INTO leaderboard (user_id, total_score, rank)
       VALUES (?, ?, 0)
       ON DUPLICATE KEY UPDATE
         total_score = total_score + VALUES(total_score)`,
      [userId, score]
    );

    // Recalculate rank using window function (MySQL 8+)
    // This is efficient and handles ties correctly
    await connection.execute(
      `UPDATE leaderboard l
       JOIN (
         SELECT 
           user_id,
           ROW_NUMBER() OVER (ORDER BY total_score DESC, user_id ASC) as new_rank
         FROM leaderboard
       ) ranked ON l.user_id = ranked.user_id
       SET l.rank = ranked.new_rank`
    );

    // Get updated user data
    const [userRows] = await connection.execute(
      `SELECT 
         user_id,
         total_score,
         rank
       FROM leaderboard
       WHERE user_id = ?`,
      [userId]
    );

    if (userRows.length === 0) {
      throw new Error('Failed to retrieve updated leaderboard data');
    }

    const userData = userRows[0];

    return {
      user_id: userData.user_id,
      score: score,
      total_score: Number(userData.total_score),
      rank: userData.rank
    };
  });
}

/**
 * Get top 10 users ordered by total_score DESC
 * @returns {Promise<Array>} Array of top 10 users
 */
async function getTopUsers() {
  const pool = getPool();

  const [rows] = await pool.execute(
    `SELECT 
       l.user_id,
       u.username,
       l.total_score,
       l.rank
     FROM leaderboard l
     INNER JOIN users u ON l.user_id = u.id
     ORDER BY l.total_score DESC, l.user_id ASC
     LIMIT 10`
  );

  return rows.map(row => ({
    user_id: row.user_id,
    username: row.username,
    total_score: Number(row.total_score),
    rank: row.rank
  }));
}

/**
 * Get user's current rank efficiently
 * Uses optimized query with COUNT to avoid full table scan
 * @param {number} userId - User ID
 * @returns {Promise<Object|null>} User rank data or null if not found
 */
async function getUserRank(userId) {
  const pool = getPool();

  // First, get user's total_score
  const [userRows] = await pool.execute(
    `SELECT 
       l.user_id,
       u.username,
       l.total_score,
       l.rank
     FROM leaderboard l
     INNER JOIN users u ON l.user_id = u.id
     WHERE l.user_id = ?`,
    [userId]
  );

  if (userRows.length === 0) {
    return null;
  }

  const userData = userRows[0];

  // Calculate rank efficiently using COUNT
  // This uses the idx_total_score index and avoids full table scan
  const [rankRows] = await pool.execute(
    `SELECT COUNT(*) + 1 as rank
     FROM leaderboard
     WHERE total_score > ? OR (total_score = ? AND user_id < ?)`,
    [userData.total_score, userData.total_score, userId]
  );

  const calculatedRank = rankRows[0].rank;

  return {
    user_id: userData.user_id,
    username: userData.username,
    total_score: Number(userData.total_score),
    rank: calculatedRank
  };
}

module.exports = {
  submitScore,
  getTopUsers,
  getUserRank,
  getLeaderboard,
  updateLeaderboard
};
