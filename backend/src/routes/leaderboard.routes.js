const express = require('express');
const router = express.Router();
const leaderboardController = require('../controllers/leaderboard.controller');

router.get('/', leaderboardController.getLeaderboard);
router.get('/:gameMode', leaderboardController.getLeaderboardByMode);

module.exports = router;
