const express = require('express');
const router = express.Router();
const SocialController = require('../controllers/socialController');
const { optionalToken } = require('../middleware/auth');

router.get('/achievements', optionalToken, SocialController.getAchievements);
router.get('/challenges', optionalToken, SocialController.getChallenges);
router.get('/friends', optionalToken, SocialController.getFriends);
router.post('/friends/request', optionalToken, SocialController.sendFriendRequest);

module.exports = router;
