const db = require('../config/db');

class SocialController {
  static async getAchievements(req, res, next) {
    try {
      const userId = req.user ? req.user.id : 1;
      const achievements = db.inMemoryDb.achievements;
      const unlocked = db.inMemoryDb.player_achievements.filter(pa => pa.user_id === userId);

      const result = achievements.map(a => {
        const isUnlocked = unlocked.some(u => u.achievement_id === a.id);
        return {
          ...a,
          isUnlocked,
          progressPct: isUnlocked ? 100 : 35
        };
      });

      res.json({ success: true, achievements: result });
    } catch (error) {
      next(error);
    }
  }

  static async getChallenges(req, res, next) {
    try {
      const userId = req.user ? req.user.id : 1;
      const challenges = db.inMemoryDb.challenges;

      const result = challenges.map(c => {
        const userProgress = db.inMemoryDb.player_challenges.find(pc => pc.user_id === userId && pc.challenge_id === c.id);
        return {
          ...c,
          currentValue: userProgress ? userProgress.progress_value : 1,
          isCompleted: userProgress ? userProgress.is_completed : false,
          progressPct: userProgress ? Math.min(100, Math.round((userProgress.progress_value / c.target_value) * 100)) : 33
        };
      });

      res.json({ success: true, challenges: result });
    } catch (error) {
      next(error);
    }
  }

  static async getFriends(req, res, next) {
    try {
      const dummyFriends = [
        { id: 101, username: 'DriftMaster_Tokyo', status: 'ONLINE', rank: 'Pro', currentCar: 'Shinobi Kuro 35' },
        { id: 102, username: 'ApexHunter99', status: 'IN_RACE', rank: 'Elite', currentCar: 'Spectre Evoluzione' },
        { id: 103, username: 'TurboValkyrie', status: 'OFFLINE', rank: 'Amateur', currentCar: 'Valkyrie R-Spec' },
      ];
      res.json({ success: true, friends: dummyFriends });
    } catch (error) {
      next(error);
    }
  }

  static async sendFriendRequest(req, res, next) {
    try {
      const { targetUsername } = req.body;
      res.json({
        success: true,
        message: `Friend invitation dispatched to driver ${targetUsername}.`
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = SocialController;
