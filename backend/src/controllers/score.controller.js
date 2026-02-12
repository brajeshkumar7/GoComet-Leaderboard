const scoreService = require('../services/score.service');

async function submitScore(req, res, next) {
  try {
    const { userId, username, score, gameMode, metadata } = req.body;

    if (!userId || !username || score === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: userId, username, and score are required'
      });
    }

    if (typeof score !== 'number' || score < 0) {
      return res.status(400).json({
        success: false,
        error: 'Score must be a non-negative number'
      });
    }

    const result = await scoreService.submitScore({
      userId: parseInt(userId),
      username,
      score: parseInt(score),
      gameMode: gameMode || 'default',
      metadata: metadata || {}
    });

    res.status(201).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
}

async function getUserScore(req, res, next) {
  try {
    const { userId } = req.params;
    const { gameMode } = req.query;

    const userScore = await scoreService.getUserScore({
      userId: parseInt(userId),
      gameMode: gameMode || null
    });

    if (!userScore) {
      return res.status(404).json({
        success: false,
        error: 'User score not found'
      });
    }

    res.json({
      success: true,
      data: userScore
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  submitScore,
  getUserScore
};
