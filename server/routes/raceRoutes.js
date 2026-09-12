const express = require('express');
const router = express.Router();
const RaceController = require('../controllers/raceController');
const { optionalToken } = require('../middleware/auth');

router.get('/tracks', RaceController.getTracks);
router.post('/start', optionalToken, RaceController.startRace);
router.post('/submit-result', optionalToken, RaceController.submitResult);

module.exports = router;
