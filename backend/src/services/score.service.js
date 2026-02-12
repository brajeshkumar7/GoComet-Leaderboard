const { getPool } = require('../db/mysql');
const { deleteCachePattern } = require('../cache/redis');
const leaderboardService = require('./leaderboard.service');

async function submitScore({ userId, username, score, gameMode, metadata }) {
  const pool = getPool();

  // Start transaction
  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    // Ensure user exists
    await connection.execute(
      'INSERT INTO users (id, username) VALUES (?, ?) ON DUPLICATE KEY UPDATE username = ?',
      [userId, username, username]
    );

    // Insert score
    await connection.execute(
      'INSERT INTO scores (user_id, score, game_mode, metadata) VALUES (?, ?, ?, ?)',
      [userId, score, gameMode, JSON.stringify(metadata)]
    );

    // Update leaderboard
    await connection.execute(
      `INSERT INTO leaderboard (user_id, username, score, rank, game_mode)
       VALUES (?, ?, ?, 1, ?)
       ON DUPLICATE KEY UPDATE
         score = GREATEST(score, VALUES(score)),
         username = VALUES(username),
         updated_at = CASE 
           WHEN VALUES(score) > score THEN CURRENT_TIMESTAMP 
           ELSE updated_at 
         END`,
      [userId, username, score, gameMode]
    );

    // Recalculate ranks
    await connection.execute(
      `UPDATE leaderboard l1
       SET rank = (
         SELECT COUNT(*) + 1
         FROM leaderboard l2
         WHERE l2.game_mode = l1.game_mode
         AND (l2.score > l1.score OR (l2.score = l1.score AND l2.updated_at < l1.updated_at))
       )
       WHERE l1.game_mode = ?`,
      [gameMode]
    );

    await connection.commit();

    // Get updated user rank
    const [rankResult] = await pool.execute(
      'SELECT rank FROM leaderboard WHERE user_id = ? AND game_mode = ?',
      [userId, gameMode]
    );

    // Invalidate cache
    await deleteCachePattern(`leaderboard:${gameMode}:*`);
    await deleteCachePattern('leaderboard:all:*');
    await deleteCachePattern(`score:${userId}:*`);

    return {
      userId,
      username,
      score,
      gameMode,
      rank: rankResult[0]?.rank || null,
      metadata
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function getUserScore({ userId, gameMode = null }) {
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
      WHERE l.user_id = ? AND l.game_mode = ?
    `;
    params = [userId, gameMode];
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
      WHERE l.user_id = ?
      ORDER BY l.score DESC
      LIMIT 1
    `;
    params = [userId];
  }

  const [rows] = await pool.execute(query, params);

  if (rows.length === 0) {
    return null;
  }

  const row = rows[0];
  return {
    userId: row.user_id,
    username: row.username,
    score: row.score,
    rank: row.rank,
    gameMode: row.game_mode,
    updatedAt: row.updated_at
  };
}

module.exports = {
  submitScore,
  getUserScore
};
