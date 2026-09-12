const assert = require('assert');
const GameValidationService = require('../server/services/gameValidationService');

async function testGameValidation() {
  console.log('🧪 Testing Authoritative Game Logic & Anti-Cheat...');

  const sampleTrack = { id: 1, name: 'Harbor Run', length_meters: 3200, difficulty: 'Beginner' };
  const sampleVehicle = { id: 1, class: 'Starter', top_speed: 225 };

  // 1. Valid Race Validation
  const validTelemetry = {
    totalTimeMs: 180000,
    bestLapMs: 58000,
    laps: 3,
    maxSpeedRecordedKmh: 215,
    checkpointsCrossed: 12,
    requiredCheckpoints: 12,
    damageTakenPct: 8,
    fuelUsedLiters: 14.5
  };
  const resultValid = GameValidationService.validateRaceResult(validTelemetry, sampleTrack, sampleVehicle);
  assert.strictEqual(resultValid.isValid, true, 'Valid telemetry must pass validation');

  // 2. Suspicious Speed / Impossible Lap Time (Anti-Cheat)
  const cheaterTelemetry = {
    totalTimeMs: 15000, // 15s for 3 laps is physically impossible
    bestLapMs: 5000,    // 5s per lap
    laps: 3,
    maxSpeedRecordedKmh: 999, // 999 km/h
    checkpointsCrossed: 12,
    requiredCheckpoints: 12,
    damageTakenPct: 0,
    fuelUsedLiters: 1.0
  };
  const resultCheat = GameValidationService.validateRaceResult(cheaterTelemetry, sampleTrack, sampleVehicle);
  assert.strictEqual(resultCheat.isValid, false, 'Cheater telemetry must fail validation');
  assert.ok(resultCheat.errors.length >= 2, 'Must catch impossible lap time and impossible speed');

  // 3. Authoritative Reward Calculation
  const p1Rewards = GameValidationService.calculateRaceRewards({
    position: 1,
    laps: 3,
    difficulty: 'Intermediate',
    isCleanRace: true,
    driftPoints: 2400,
    overtakes: 5
  });
  assert.ok(p1Rewards.credits > 5000, 'P1 clean finish should award solid credits');
  assert.ok(p1Rewards.xp > 2000, 'P1 clean finish should award high XP');

  // 4. Progression & Level Calculation
  const prog = GameValidationService.computeProgression(0, 7500);
  assert.ok(prog.level >= 5, '7500 XP must elevate driver to level 5+');
  assert.strictEqual(prog.careerRank, 'Amateur', 'Level 5 must graduate from Rookie to Amateur rank');

  console.log('✅ Game validation & anti-cheat tests passed successfully.');
}

module.exports = testGameValidation;
