const crypto = require('crypto');
const db = require('../config/db');
const GameValidationService = require('../services/gameValidationService');

class RaceController {
  static async getTracks(req, res, next) {
    try {
      const [tracks] = await db.query('SELECT * FROM `tracks` ORDER BY id ASC');
      res.json({ success: true, tracks });
    } catch (error) {
      next(error);
    }
  }

  static async startRace(req, res, next) {
    try {
      const userId = req.user ? req.user.id : 1;
      const { trackId, raceType = 'QUICK', weather = 'CLEAR', timeOfDay = 'DAY', laps = 3, aiOpponentsCount = 5 } = req.body;

      const track = db.inMemoryDb.tracks.find(t => t.id === Number(trackId)) || db.inMemoryDb.tracks[0];
      const raceId = `race_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

      // Build grid participants with distinct AI profiles
      const aiPersonalities = ['AGGRESSIVE', 'DEFENSIVE', 'BALANCED', 'CAUTIOUS', 'EXPERT'];
      const aiDrivers = [
        { name: 'Klaus Richter', personality: 'AGGRESSIVE', vehicleId: 3 },
        { name: 'Elena Rostova', personality: 'DEFENSIVE', vehicleId: 2 },
        { name: 'Dante Silva', personality: 'BALANCED', vehicleId: 4 },
        { name: 'Marcus Sterling', personality: 'EXPERT', vehicleId: 5 },
        { name: 'Chloe Dubois', personality: 'CAUTIOUS', vehicleId: 1 },
      ];

      const participants = [
        {
          userId,
          driverName: req.user ? req.user.username : 'Player 1',
          isAi: false,
          gridPosition: aiOpponentsCount + 1,
        }
      ];

      for (let i = 0; i < Math.min(aiOpponentsCount, aiDrivers.length); i++) {
        participants.push({
          userId: null,
          driverName: aiDrivers[i].name,
          isAi: true,
          aiPersonality: aiDrivers[i].personality,
          vehicleId: aiDrivers[i].vehicleId,
          gridPosition: i + 1,
        });
      }

      const raceRecord = {
        id: raceId,
        trackId: track.id,
        raceType,
        weather,
        timeOfDay,
        laps,
        participants,
        status: 'IN_PROGRESS',
        startedAt: new Date(),
      };

      db.inMemoryDb.races.push(raceRecord);

      res.status(201).json({
        success: true,
        raceId,
        track,
        weather,
        timeOfDay,
        laps,
        participants
      });
    } catch (error) {
      next(error);
    }
  }

  static async submitResult(req, res, next) {
    try {
      const userId = req.user ? req.user.id : 1;
      const {
        raceId,
        trackId,
        position,
        totalTimeMs,
        bestLapMs,
        laps,
        maxSpeedRecordedKmh,
        checkpointsCrossed,
        requiredCheckpoints,
        damageTakenPct,
        fuelUsedLiters,
        tireWearPct,
        isCleanRace,
        driftPoints,
        overtakes,
        vehicleId
      } = req.body;

      const track = db.inMemoryDb.tracks.find(t => t.id === Number(trackId)) || db.inMemoryDb.tracks[0];
      const vehicle = db.inMemoryDb.vehicles.find(v => v.id === Number(vehicleId)) || db.inMemoryDb.vehicles[0];

      // 1. Authoritative Validation
      const validation = GameValidationService.validateRaceResult(
        {
          totalTimeMs,
          bestLapMs,
          laps: laps || 3,
          maxSpeedRecordedKmh,
          checkpointsCrossed: checkpointsCrossed || requiredCheckpoints,
          requiredCheckpoints: requiredCheckpoints || 1,
          damageTakenPct,
          fuelUsedLiters
        },
        track,
        vehicle
      );

      if (!validation.isValid) {
        console.warn('⚠️ [ANTI-CHEAT] Suspicious race outcome detected:', validation.errors);
        return res.status(422).json({
          success: false,
          error: 'Telemetry validation failed.',
          details: validation.errors
        });
      }

      // 2. Authoritative Reward Calculation
      const rewards = GameValidationService.calculateRaceRewards({
        position: Number(position) || 1,
        laps: Number(laps) || 3,
        difficulty: track.difficulty,
        isCleanRace: !!isCleanRace,
        driftPoints: Number(driftPoints) || 0,
        overtakes: Number(overtakes) || 0
      });

      // 3. Update Player Profile & Progression
      let profile = db.inMemoryDb.profiles.find(p => p.user_id === userId);
      if (!profile) {
        profile = { user_id: userId, driver_name: 'Driver', level: 1, xp: 0, credits: 15000, career_rank: 'Rookie' };
        db.inMemoryDb.profiles.push(profile);
      }

      profile.credits += rewards.credits;
      const progression = GameValidationService.computeProgression(profile.xp, rewards.xp);
      profile.xp = progression.xp;
      profile.level = progression.level;
      profile.career_rank = progression.careerRank;

      // 4. Update Vehicle Condition & Damage
      const activeVehicle = db.inMemoryDb.player_vehicles.find(v => v.user_id === userId && (v.is_active || v.vehicle_id === vehicle.id));
      if (activeVehicle) {
        activeVehicle.condition_pct = Math.max(0, (activeVehicle.condition_pct || 100) - (damageTakenPct || 0));
        activeVehicle.mileage_km = Number(((activeVehicle.mileage_km || 0) + (track.length_meters * (laps || 3) / 1000)).toFixed(2));
      }

      // 5. Update Leaderboard if Personal Best
      let isPersonalBest = false;
      let userLd = db.inMemoryDb.leaderboards.find(l => l.track_id === track.id && l.user_id === userId);
      if (!userLd) {
        isPersonalBest = true;
        db.inMemoryDb.leaderboards.push({
          id: db.inMemoryDb.leaderboards.length + 1,
          track_id: track.id,
          user_id: userId,
          driver_name: profile.driver_name,
          vehicle_id: vehicle.id,
          best_lap_ms: bestLapMs,
          rating: 1250,
          weather: 'CLEAR',
          submitted_at: new Date()
        });
      } else if (bestLapMs < userLd.best_lap_ms) {
        isPersonalBest = true;
        userLd.best_lap_ms = bestLapMs;
        userLd.vehicle_id = vehicle.id;
        userLd.submitted_at = new Date();
      }

      // 6. Record in race_results
      const resultEntry = {
        race_id: raceId || 'session_local',
        user_id: userId,
        driver_name: profile.driver_name,
        position,
        total_time_ms: totalTimeMs,
        best_lap_ms: bestLapMs,
        credits_earned: rewards.credits,
        xp_earned: rewards.xp,
        distance_km: (track.length_meters * (laps || 3) / 1000),
        damage_pct: damageTakenPct,
        fuel_used_liters: fuelUsedLiters,
        tire_wear_pct: tireWearPct,
        is_clean_race: isCleanRace ? 1 : 0,
        is_personal_best: isPersonalBest ? 1 : 0,
        created_at: new Date()
      };
      db.inMemoryDb.race_results.push(resultEntry);

      // Return comprehensive result summary
      res.json({
        success: true,
        message: 'Race results authoritatively validated and registered.',
        results: {
          position,
          totalTimeMs,
          bestLapMs,
          distanceKm: resultEntry.distance_km,
          damagePct: damageTakenPct,
          fuelUsedLiters,
          tireWearPct,
          isPersonalBest,
          rewards,
          progression,
          updatedCredits: profile.credits
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = RaceController;
