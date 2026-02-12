const leaderboardService = require('../services/leaderboard.service');

/**
 * POST /api/leaderboard/submit
 * Submit a new score for a user
 */
async function submitScore(req, res, next) {
  try {
    const { user_id, score } = req.body;

    // Validate input
    if (user_id === undefined || user_id === null) {
      return res.status(400).json({
        success: false,
        error: 'user_id is required'
      });
    }

    if (score === undefined || score === null) {
      return res.status(400).json({
        success: false,
        error: 'score is required'
      });
    }

    const userId = parseInt(user_id);
    const scoreValue = parseInt(score);

    if (isNaN(userId) || userId <= 0) {
      return res.status(400).json({
        success: false,
        error: 'user_id must be a positive integer'
      });
    }

    if (isNaN(scoreValue) || scoreValue < 0) {
      return res.status(400).json({
        success: false,
        error: 'score must be a non-negative integer'
      });
    }

    const result = await leaderboardService.submitScore(userId, scoreValue);

    res.status(201).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/leaderboard/top
 * Get top 10 users ordered by total_score DESC
 */
async function getTopUsers(req, res, next) {
  try {
    const topUsers = await leaderboardService.getTopUsers();

    res.json({
      success: true,
      data: topUsers
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/leaderboard/rank/:user_id
 * Get user's current rank
 */
async function getUserRank(req, res, next) {
  try {
    const { user_id } = req.params;

    const userId = parseInt(user_id);

    if (isNaN(userId) || userId <= 0) {
      return res.status(400).json({
        success: false,
        error: 'user_id must be a positive integer'
      });
    }

    const rankData = await leaderboardService.getUserRank(userId);

    if (!rankData) {
      return res.status(404).json({
        success: false,
        error: 'User not found in leaderboard'
      });
    }

    res.json({
      success: true,
      data: rankData
    });
  } catch (error) {
    next(error);
  }
}

// Legacy endpoints
async function getLeaderboard(req, res, next) {
  try {
    const { limit = 100, offset = 0, gameMode } = req.query;
    
    const leaderboard = await leaderboardService.getLeaderboard({
      limit: parseInt(limit),
      offset: parseInt(offset),
      gameMode: gameMode || null
    });

    res.json({
      success: true,
      data: leaderboard,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    next(error);
  }
}

async function getLeaderboardByMode(req, res, next) {
  try {
    const { gameMode } = req.params;
    const { limit = 100, offset = 0 } = req.query;

    const leaderboard = await leaderboardService.getLeaderboard({
      limit: parseInt(limit),
      offset: parseInt(offset),
      gameMode
    });

    res.json({
      success: true,
      data: leaderboard,
      gameMode,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  submitScore,
  getTopUsers,
  getUserRank,
  getLeaderboard,
  getLeaderboardByMode
};
