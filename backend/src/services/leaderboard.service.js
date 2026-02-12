const { getPool } = require('../db/mysql');
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

module.exports = {
  getLeaderboard,
  updateLeaderboard
};
