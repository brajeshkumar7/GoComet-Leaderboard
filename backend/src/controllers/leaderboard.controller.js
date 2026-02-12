const leaderboardService = require('../services/leaderboard.service');

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
  getLeaderboard,
  getLeaderboardByMode
};
