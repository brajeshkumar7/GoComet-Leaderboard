const express = require('express');
const router = express.Router();
const leaderboardController = require('../controllers/leaderboard.controller');

// Core leaderboard APIs
router.post('/submit', leaderboardController.submitScore);
router.get('/top', leaderboardController.getTopUsers);
router.get('/rank/:user_id', leaderboardController.getUserRank);

// Legacy endpoints (kept for backward compatibility)
router.get('/', leaderboardController.getLeaderboard);
router.get('/:gameMode', leaderboardController.getLeaderboardByMode);

module.exports = router;
