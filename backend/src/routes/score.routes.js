const express = require('express');
const router = express.Router();
const scoreController = require('../controllers/score.controller');

router.post('/', scoreController.submitScore);
router.get('/:userId', scoreController.getUserScore);

module.exports = router;
