const express = require('express');
const router = express.Router();
const LeaderboardController = require('../controllers/leaderboardController');

router.get('/', LeaderboardController.getLeaderboard);

module.exports = router;
