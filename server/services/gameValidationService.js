/**
 * RACEFORGE Server-Side Authoritative Game Logic & Anti-Cheat Engine
 * Validates race telemetry, lap times, checkpoint progression, reward distribution,
 * and economy operations without trusting client-asserted stats.
 */

const MIN_LEGITIMATE_LAP_MS = {
  1: 45000,  // Harbor Run min time ~45s
  2: 60000,  // Accra Circuit min time ~60s
  3: 75000,  // Desert Apex min time ~75s
  4: 85000,  // Mountain Pass min time ~85s
  5: 65000   // Neon Grand Prix min time ~65s
};

const MAX_THEORETICAL_SPEED_KMH = {
  'Starter': 260,
  'Street': 300,
  'Sport': 340,
  'Muscle': 320,
  'Super': 380,
  'Hyper': 440,
  'Rally': 280,
  'Track': 400
};

const CAREER_RANKS = [
  { name: 'Rookie', minLevel: 1, minXp: 0 },
  { name: 'Amateur', minLevel: 5, minXp: 5000 },
  { name: 'Pro', minLevel: 10, minXp: 20000 },
  { name: 'Elite', minLevel: 18, minXp: 60000 },
  { name: 'Master', minLevel: 25, minXp: 150000 },
  { name: 'Legend', minLevel: 35, minXp: 350000 },
];

class GameValidationService {
  /**
   * Validates submitted race results against track limits and vehicle performance capabilities
   */
  static validateRaceResult(data, track, vehicle) {
    const {
      totalTimeMs,
      bestLapMs,
      laps,
      maxSpeedRecordedKmh,
      checkpointsCrossed,
      requiredCheckpoints,
      damageTakenPct,
      fuelUsedLiters,
    } = data;

    const validationErrors = [];

    // 1. Verify Lap Count & Minimum Duration
    const minTrackLap = MIN_LEGITIMATE_LAP_MS[track.id] || 40000;
    if (bestLapMs < minTrackLap) {
      validationErrors.push(`Lap time of ${bestLapMs}ms is faster than physical minimum (${minTrackLap}ms).`);
    }

    if (totalTimeMs < minTrackLap * laps * 0.9) {
      validationErrors.push(`Total time ${totalTimeMs}ms is physically impossible for ${laps} laps.`);
    }

    // 2. Checkpoint Verification
    if (checkpointsCrossed < requiredCheckpoints) {
      validationErrors.push(`Missing checkpoint progression: crossed ${checkpointsCrossed} / ${requiredCheckpoints}`);
    }

    // 3. Speed Validation
    const vehicleClass = vehicle ? vehicle.class : 'Super';
    const topCap = (MAX_THEORETICAL_SPEED_KMH[vehicleClass] || 350) * 1.15; // with drafting/nitro
    if (maxSpeedRecordedKmh > topCap) {
      validationErrors.push(`Peak speed ${maxSpeedRecordedKmh} km/h exceeded class envelope (${topCap} km/h).`);
    }

    // 4. Physical boundaries
    if (damageTakenPct < 0 || damageTakenPct > 100) {
      validationErrors.push('Invalid damage metric.');
    }

    return {
      isValid: validationErrors.length === 0,
      errors: validationErrors,
    };
  }

  /**
   * Calculates Authoritative XP and Credits rewards based on placement, difficulty, and driving quality
   */
  static calculateRaceRewards({ position, laps, difficulty, isCleanRace, driftPoints, overtakes }) {
    let baseCredits = 1500;
    let baseXp = 600;

    // Position multipliers
    const posMultipliers = {
      1: { credits: 3.0, xp: 2.5 },
      2: { credits: 2.2, xp: 2.0 },
      3: { credits: 1.7, xp: 1.6 },
      4: { credits: 1.3, xp: 1.3 },
      5: { credits: 1.1, xp: 1.1 },
    };

    const mult = posMultipliers[position] || { credits: 1.0, xp: 1.0 };
    baseCredits *= mult.credits;
    baseXp *= mult.xp;

    // Lap bonus
    baseCredits += laps * 400;
    baseXp += laps * 150;

    // Clean race bonus
    if (isCleanRace) {
      baseCredits += 800;
      baseXp += 300;
    }

    // Drift bonus (capped to prevent exploit)
    const validDriftScore = Math.min(driftPoints || 0, 10000);
    const driftCredits = Math.floor(validDriftScore * 0.15);
    const driftXp = Math.floor(validDriftScore * 0.08);

    // Overtakes bonus
    const validOvertakes = Math.min(overtakes || 0, 20);
    const overtakeCredits = validOvertakes * 100;
    const overtakeXp = validOvertakes * 50;

    const totalCredits = Math.round(baseCredits + driftCredits + overtakeCredits);
    const totalXp = Math.round(baseXp + driftXp + overtakeXp);

    return {
      credits: totalCredits,
      xp: totalXp,
      cleanBonus: isCleanRace ? 800 : 0,
      driftBonus: driftCredits,
      overtakeBonus: overtakeCredits
    };
  }

  /**
   * Calculates new Career Rank and Level from total accumulated XP
   */
  static computeProgression(currentXp, addedXp) {
    const newXp = currentXp + addedXp;
    // Level formula: Level = floor(sqrt(newXp / 150)) + 1
    const newLevel = Math.floor(Math.sqrt(newXp / 150)) + 1;

    // Determine Career Rank
    let rank = 'Rookie';
    for (let i = CAREER_RANKS.length - 1; i >= 0; i--) {
      if (newLevel >= CAREER_RANKS[i].minLevel || newXp >= CAREER_RANKS[i].minXp) {
        rank = CAREER_RANKS[i].name;
        break;
      }
    }

    const nextLevelXp = Math.pow(newLevel, 2) * 150;
    const currentLevelBaseXp = Math.pow(newLevel - 1, 2) * 150;

    return {
      xp: newXp,
      level: newLevel,
      careerRank: rank,
      xpForNextLevel: nextLevelXp,
      levelProgressPct: Math.min(100, Math.max(0, Math.round(((newXp - currentLevelBaseXp) / (nextLevelXp - currentLevelBaseXp)) * 100)))
    };
  }
}

module.exports = GameValidationService;
