const mysql = require('mysql2/promise');
const config = require('./env');

let pool = null;
let isConnected = false;

// In-Memory Resilient Store for development/offline environments
const inMemoryDb = {
  users: [],
  profiles: [],
  vehicles: [
    { id: 1, name: 'Apex Pulse GT', manufacturer: 'Veloce Dynamics', class: 'Starter', mass: 1280, horsepower: 210, torque: 260, top_speed: 225, acceleration: 6.2, braking: 38.5, grip: 0.95, handling: 0.85, drivetrain: 'FWD', fuel_capacity: 55, price: 0, unlock_level: 1 },
    { id: 2, name: 'Shinobi Kuro 35', manufacturer: 'Katana Motors', class: 'Street', mass: 1320, horsepower: 320, torque: 390, top_speed: 260, acceleration: 4.8, braking: 36.0, grip: 1.10, handling: 0.90, drivetrain: 'RWD', fuel_capacity: 60, price: 28000, unlock_level: 3 },
    { id: 3, name: 'Valkyrie R-Spec', manufacturer: 'AeroNordic', class: 'Sport', mass: 1250, horsepower: 420, torque: 480, top_speed: 290, acceleration: 3.9, braking: 33.5, grip: 1.25, handling: 0.94, drivetrain: 'RWD', fuel_capacity: 65, price: 65000, unlock_level: 6 },
    { id: 4, name: 'Bison Torq 7.0', manufacturer: 'Detroit Ironworks', class: 'Muscle', mass: 1650, horsepower: 560, torque: 720, top_speed: 280, acceleration: 4.1, braking: 39.0, grip: 1.05, handling: 0.78, drivetrain: 'RWD', fuel_capacity: 75, price: 52000, unlock_level: 8 },
    { id: 5, name: 'Spectre Evoluzione', manufacturer: 'Fiorano Corse', class: 'Super', mass: 1180, horsepower: 680, torque: 700, top_speed: 335, acceleration: 3.1, braking: 31.0, grip: 1.40, handling: 0.96, drivetrain: 'RWD', fuel_capacity: 70, price: 140000, unlock_level: 12 },
    { id: 6, name: 'Nebula Chronos X', manufacturer: 'Aether Hypertech', class: 'Hyper', mass: 1100, horsepower: 980, torque: 1050, top_speed: 385, acceleration: 2.4, braking: 29.0, grip: 1.55, handling: 0.98, drivetrain: 'AWD', fuel_capacity: 80, price: 350000, unlock_level: 18 },
    { id: 7, name: 'Dune Strider RX', manufacturer: 'Kalahari Works', class: 'Rally', mass: 1220, horsepower: 380, torque: 510, top_speed: 245, acceleration: 3.7, braking: 34.0, grip: 1.30, handling: 0.92, drivetrain: 'AWD', fuel_capacity: 65, price: 80000, unlock_level: 10 },
    { id: 8, name: 'Zenith LMP Carbon', manufacturer: 'Apex Prototype Lab', class: 'Track', mass: 890, horsepower: 750, torque: 650, top_speed: 350, acceleration: 2.6, braking: 27.5, grip: 1.70, handling: 0.99, drivetrain: 'RWD', fuel_capacity: 85, price: 500000, unlock_level: 25 },
  ],
  player_vehicles: [],
  vehicle_upgrades: [
    { id: 1, category: 'ENGINE', tier: 1, name: 'Stage 1 ECU & Cold Air Intake', description: 'High-flow filter and tuned fuel maps', price: 2500, hp_delta: 25, torque_delta: 30, mass_delta: 0, grip_delta: 0, braking_delta: 0, handling_delta: 0, top_speed_delta: 8 },
    { id: 2, category: 'ENGINE', tier: 2, name: 'Stage 2 Camshaft & Headers', description: 'High-lift cams and equal-length headers', price: 6500, hp_delta: 55, torque_delta: 65, mass_delta: -5, grip_delta: 0, braking_delta: 0, handling_delta: 0, top_speed_delta: 18 },
    { id: 3, category: 'ENGINE', tier: 3, name: 'Race-Spec Forged Internals', description: 'Titanium rods, forged pistons, and dry sump lubrication', price: 16000, hp_delta: 110, torque_delta: 130, mass_delta: -12, grip_delta: 0, braking_delta: 0, handling_delta: 0, top_speed_delta: 32 },
    { id: 4, category: 'TURBO', tier: 1, name: 'Twin-Scroll Ball Bearing Turbo', description: 'Rapid spool, reduced turbo lag', price: 4200, hp_delta: 40, torque_delta: 50, mass_delta: 4, grip_delta: 0, braking_delta: 0, handling_delta: 0, top_speed_delta: 12 },
    { id: 5, category: 'TURBO', tier: 2, name: 'Variable Vane Hybrid Turbo', description: 'Linear boost delivery across rev band', price: 9800, hp_delta: 85, torque_delta: 100, mass_delta: 6, grip_delta: 0, braking_delta: 0, handling_delta: 0, top_speed_delta: 24 },
    { id: 6, category: 'TRANSMISSION', tier: 1, name: 'Close-Ratio 6-Speed Manual', description: 'Optimized gear spacing for explosive mid-range exit', price: 3000, hp_delta: 0, torque_delta: 0, mass_delta: -8, grip_delta: 0, braking_delta: 0, handling_delta: 0.02, top_speed_delta: 5 },
    { id: 7, category: 'TRANSMISSION', tier: 2, name: 'Sequential Dog-Box with Paddle Shift', description: 'Lightning 30ms shift times with flat-foot upshifts', price: 8500, hp_delta: 0, torque_delta: 0, mass_delta: -15, grip_delta: 0, braking_delta: 0, handling_delta: 0.05, top_speed_delta: 10 },
    { id: 8, category: 'BRAKES', tier: 1, name: 'Slotted Rotors & Ceramic Pads', description: 'Resistant to brake fade under repeated hard stops', price: 2200, hp_delta: 0, torque_delta: 0, mass_delta: -3, grip_delta: 0.02, braking_delta: -3.5, handling_delta: 0.02, top_speed_delta: 0 },
    { id: 9, category: 'BRAKES', tier: 2, name: 'Carbon-Ceramic 6-Piston Brembo Kit', description: 'F1-derived stopping power and weight reduction', price: 7800, hp_delta: 0, torque_delta: 0, mass_delta: -14, grip_delta: 0.05, braking_delta: -7.2, handling_delta: 0.05, top_speed_delta: 0 },
    { id: 10, category: 'SUSPENSION', tier: 1, name: 'Adjustable Coilover Kit', description: 'Lower center of gravity and reduced body roll', price: 2800, hp_delta: 0, torque_delta: 0, mass_delta: -6, grip_delta: 0.06, braking_delta: -1.0, handling_delta: 0.08, top_speed_delta: 0 },
    { id: 11, category: 'SUSPENSION', tier: 2, name: 'Active Magnetic Dampers', description: 'Real-time adaptive damping per wheel', price: 8200, hp_delta: 0, torque_delta: 0, mass_delta: -10, grip_delta: 0.12, braking_delta: -2.0, handling_delta: 0.15, top_speed_delta: 0 },
    { id: 12, category: 'TIRES', tier: 1, name: 'Street Performance Compound', description: 'Enhanced silica tread for predictable dry/wet grip', price: 1800, hp_delta: 0, torque_delta: 0, mass_delta: 0, grip_delta: 0.08, braking_delta: -2.0, handling_delta: 0.06, top_speed_delta: 0 },
    { id: 13, category: 'TIRES', tier: 2, name: 'Semi-Slick Competition Tires', description: 'Maximum contact patch for high-G apex speeds', price: 4500, hp_delta: 0, torque_delta: 0, mass_delta: 0, grip_delta: 0.18, braking_delta: -4.5, handling_delta: 0.12, top_speed_delta: 0 },
    { id: 14, category: 'AERODYNAMICS', tier: 1, name: 'Front Splitter & Ducktail Spoiler', description: 'Reduced front lift and stable high-speed tracking', price: 2100, hp_delta: 0, torque_delta: 0, mass_delta: 5, grip_delta: 0.05, braking_delta: 0, handling_delta: 0.06, top_speed_delta: -2 },
    { id: 15, category: 'AERODYNAMICS', tier: 2, name: 'Full GT3 Carbon Wing & Venturi Tunnel', description: 'Ground-effect downforce for flat-out sweepers', price: 6800, hp_delta: 0, torque_delta: 0, mass_delta: 8, grip_delta: 0.15, braking_delta: 0, handling_delta: 0.12, top_speed_delta: -5 },
    { id: 16, category: 'WEIGHT REDUCTION', tier: 1, name: 'Stripped Interior & Carbon Seats', description: 'Sound deadening removal and lightweight bucket seats', price: 2000, hp_delta: 0, torque_delta: 0, mass_delta: -50, grip_delta: 0.03, braking_delta: -1.5, handling_delta: 0.05, top_speed_delta: 4 },
    { id: 17, category: 'WEIGHT REDUCTION', tier: 2, name: 'Carbon Fiber Body Panels & Lexan Glass', description: 'Ultra-light shell with optimal 50:50 weight balance', price: 7500, hp_delta: 0, torque_delta: 0, mass_delta: -120, grip_delta: 0.08, braking_delta: -3.8, handling_delta: 0.10, top_speed_delta: 8 },
  ],
  player_vehicle_upgrades: [],
  vehicle_setups: [],
  tracks: [
    { id: 1, name: 'Harbor Run', length_meters: 3200, difficulty: 'Beginner', environment: 'Coastal Harbor', sectors_count: 3, elevation_diff_meters: 12.5, weather_support: 1, night_support: 1, track_record_ms: 68420, track_record_holder: 'Marina_Speedster' },
    { id: 2, name: 'Accra Circuit', length_meters: 4550, difficulty: 'Intermediate', environment: 'Urban Metropolis', sectors_count: 3, elevation_diff_meters: 18.0, weather_support: 1, night_support: 1, track_record_ms: 92150, track_record_holder: 'BlackStar_Racer' },
    { id: 3, name: 'Desert Apex', length_meters: 5200, difficulty: 'Advanced', environment: 'Canyon Dunes', sectors_count: 4, elevation_diff_meters: 38.0, weather_support: 1, night_support: 1, track_record_ms: 108300, track_record_holder: 'Dune_Phantom' },
    { id: 4, name: 'Mountain Pass', length_meters: 6100, difficulty: 'Expert', environment: 'Alpine Slopes', sectors_count: 4, elevation_diff_meters: 145.0, weather_support: 1, night_support: 1, track_record_ms: 134500, track_record_holder: 'Touge_Ghost' },
    { id: 5, name: 'Neon Grand Prix', length_meters: 4800, difficulty: 'Master', environment: 'Cyberpunk Night City', sectors_count: 3, elevation_diff_meters: 24.0, weather_support: 1, night_support: 1, track_record_ms: 95800, track_record_holder: 'Cyber_Drifter' },
  ],
  races: [],
  race_participants: [],
  race_results: [],
  player_statistics: [],
  leaderboards: [
    { id: 1, track_id: 1, user_id: 999, driver_name: 'Apex_Viper', vehicle_id: 3, best_lap_ms: 67210, rating: 2150, weather: 'CLEAR', submitted_at: new Date() },
    { id: 2, track_id: 1, user_id: 998, driver_name: 'ShadowShift', vehicle_id: 5, best_lap_ms: 68420, rating: 2040, weather: 'CLEAR', submitted_at: new Date() },
    { id: 3, track_id: 2, user_id: 997, driver_name: 'Kuro_Ghost', vehicle_id: 2, best_lap_ms: 91400, rating: 1980, weather: 'CLEAR', submitted_at: new Date() },
    { id: 4, track_id: 3, user_id: 996, driver_name: 'DesertStorm', vehicle_id: 7, best_lap_ms: 107120, rating: 1920, weather: 'CLEAR', submitted_at: new Date() },
    { id: 5, track_id: 4, user_id: 995, driver_name: 'Fujiwara_86', vehicle_id: 2, best_lap_ms: 132450, rating: 2200, weather: 'RAIN', submitted_at: new Date() },
    { id: 6, track_id: 5, user_id: 994, driver_name: 'NeonCyber_99', vehicle_id: 6, best_lap_ms: 94800, rating: 2310, weather: 'CLEAR', submitted_at: new Date() },
  ],
  achievements: [
    { id: 1, key_name: 'FIRST_VICTORY', title: 'First Blood on Asphalt', description: 'Win your very first race in career or quick race mode.', reward_credits: 2500, reward_xp: 1000, icon: 'trophy-gold' },
    { id: 2, key_name: '100_RACES', title: 'Century Driver', description: 'Complete 100 competitive races.', reward_credits: 20000, reward_xp: 8000, icon: 'flag-checkered' },
    { id: 3, key_name: 'PERFECT_LAP', title: 'Precision Telemetry', description: 'Complete a full lap without going off-track or taking any damage.', reward_credits: 3000, reward_xp: 1200, icon: 'target' },
    { id: 4, key_name: 'DRIFT_KING', title: 'Apex Sideways', description: 'Score over 5,000 drift points in a single drift sequence.', reward_credits: 4000, reward_xp: 1500, icon: 'tire-smoke' },
    { id: 5, key_name: 'SPEED_DEMON', title: 'Sound Barrier', description: 'Exceed 320 km/h in any vehicle.', reward_credits: 5000, reward_xp: 2000, icon: 'speedometer' },
    { id: 6, key_name: 'RAIN_MASTER', title: 'Aquaplane Conqueror', description: 'Win a race in Heavy Rain or Storm conditions without spinning out.', reward_credits: 6000, reward_xp: 2500, icon: 'cloud-rain' },
    { id: 7, key_name: 'NIGHT_RACER', title: 'Midnight Phantom', description: 'Take P1 in a night race under floodlights.', reward_credits: 4500, reward_xp: 1800, icon: 'moon' },
    { id: 8, key_name: 'CLEAN_RACER', title: 'Gentleman Driver', description: 'Finish 5 consecutive races with 0% vehicle damage.', reward_credits: 7500, reward_xp: 3000, icon: 'shield-check' },
    { id: 9, key_name: 'PIT_STRATEGIST', title: 'Tactical Undercut', description: 'Perform a mid-race pit stop to swap tires and win.', reward_credits: 5000, reward_xp: 2000, icon: 'wrench' },
    { id: 10, key_name: 'LEGEND', title: 'Motorsport Deity', description: 'Reach Career Rank Legend and unlock the Zenith LMP Carbon.', reward_credits: 50000, reward_xp: 25000, icon: 'crown' },
  ],
  player_achievements: [],
  challenges: [
    { id: 1, type: 'DAILY', title: 'Warmup Circuit', description: 'Complete 3 races across any tracks.', target_metric: 'races_completed', target_value: 3, reward_credits: 3500, reward_xp: 1200, expires_at: new Date(Date.now() + 86400000) },
    { id: 2, type: 'DAILY', title: 'High Roller', description: 'Earn a P1 finish on Accra Circuit.', target_metric: 'accra_p1', target_value: 1, reward_credits: 4500, reward_xp: 1500, expires_at: new Date(Date.now() + 86400000) },
    { id: 3, type: 'DAILY', title: 'Clean Overtakes', description: 'Perform 10 overtakes without touching opponent vehicles.', target_metric: 'clean_overtakes', target_value: 10, reward_credits: 5000, reward_xp: 1800, expires_at: new Date(Date.now() + 86400000) },
    { id: 4, type: 'DAILY', title: 'Storm Chaser', description: 'Complete a wet track race with tire wear under 35%.', target_metric: 'wet_race_clean', target_value: 1, reward_credits: 6000, reward_xp: 2200, expires_at: new Date(Date.now() + 86400000) },
    { id: 5, type: 'WEEKLY', title: 'Endurance Master', description: 'Accumulate 150 km of total competitive racing distance.', target_metric: 'distance_km', target_value: 150, reward_credits: 25000, reward_xp: 10000, expires_at: new Date(Date.now() + 7 * 86400000) },
  ],
  player_challenges: [],
  friendships: [],
  notifications: [],
};

async function initDb() {
  try {
    pool = mysql.createPool({
      host: config.db.host,
      port: config.db.port,
      user: config.db.user,
      password: config.db.password,
      database: config.db.name,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0
    });
    // Test connection with a ping
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    isConnected = true;
    console.log('🏁 [RACEFORGE] Connected to MySQL database:', config.db.name);
  } catch (err) {
    console.warn('⚠️ [RACEFORGE] MySQL not reachable at host:port (' + config.db.host + ':' + config.db.port + '). Initializing High-Speed Memory Data Engine for zero-dependency operation.');
    isConnected = false;
  }
}

// Database query wrapper that executes against MySQL if connected,
// or executes against the in-memory store
async function query(sql, params = []) {
  if (isConnected && pool) {
    return pool.execute(sql, params);
  }
  return executeInMemory(sql, params);
}

// In-Memory query executor
function executeInMemory(sql, params) {
  const normalized = sql.trim().toUpperCase();

  // Handle USERS lookup
  if (normalized.startsWith('SELECT') && normalized.includes('FROM `USERS`')) {
    if (normalized.includes('EMAIL = ?') || normalized.includes('USERNAME = ?')) {
      const val = params[0];
      const match = inMemoryDb.users.filter(u => u.email === val || u.username === val);
      return [match];
    }
    if (normalized.includes('ID = ?')) {
      const id = params[0];
      const match = inMemoryDb.users.filter(u => u.id === Number(id));
      return [match];
    }
    return [inMemoryDb.users];
  }

  // Handle USERS insert
  if (normalized.startsWith('INSERT INTO `USERS`')) {
    const newUser = {
      id: inMemoryDb.users.length + 1,
      email: params[0],
      username: params[1],
      password_hash: params[2],
      created_at: new Date(),
      updated_at: new Date(),
      last_login: new Date()
    };
    inMemoryDb.users.push(newUser);
    return [{ insertId: newUser.id, affectedRows: 1 }];
  }

  // Handle PROFILES
  if (normalized.startsWith('SELECT') && normalized.includes('FROM `PROFILES`')) {
    if (normalized.includes('USER_ID = ?')) {
      const uid = Number(params[0]);
      const match = inMemoryDb.profiles.filter(p => p.user_id === uid);
      return [match];
    }
    return [inMemoryDb.profiles];
  }

  if (normalized.startsWith('INSERT INTO `PROFILES`')) {
    const newProfile = {
      id: inMemoryDb.profiles.length + 1,
      user_id: Number(params[0]),
      driver_name: params[1],
      country: params[2] || 'USA',
      avatar: params[3] || 'avatar_1',
      level: 1,
      xp: 0,
      credits: 15000,
      career_rank: 'Rookie',
      created_at: new Date()
    };
    inMemoryDb.profiles.push(newProfile);
    return [{ insertId: newProfile.id, affectedRows: 1 }];
  }

  // Handle VEHICLES catalog
  if (normalized.startsWith('SELECT') && normalized.includes('FROM `VEHICLES`')) {
    if (normalized.includes('WHERE `ID` = ?') || normalized.includes('WHERE ID = ?')) {
      const id = Number(params[0]);
      const match = inMemoryDb.vehicles.filter(v => v.id === id);
      return [match];
    }
    return [inMemoryDb.vehicles];
  }

  // Handle TRACKS catalog
  if (normalized.startsWith('SELECT') && normalized.includes('FROM `TRACKS`')) {
    if (normalized.includes('WHERE `ID` = ?') || normalized.includes('WHERE ID = ?')) {
      const id = Number(params[0]);
      const match = inMemoryDb.tracks.filter(t => t.id === id);
      return [match];
    }
    return [inMemoryDb.tracks];
  }

  // Handle UPGRADES catalog
  if (normalized.startsWith('SELECT') && normalized.includes('FROM `VEHICLE_UPGRADES`')) {
    return [inMemoryDb.vehicle_upgrades];
  }

  // Handle ACHIEVEMENTS catalog
  if (normalized.startsWith('SELECT') && normalized.includes('FROM `ACHIEVEMENTS`')) {
    return [inMemoryDb.achievements];
  }

  // Handle CHALLENGES catalog
  if (normalized.startsWith('SELECT') && normalized.includes('FROM `CHALLENGES`')) {
    return [inMemoryDb.challenges];
  }

  // Handle LEADERBOARDS
  if (normalized.startsWith('SELECT') && normalized.includes('FROM `LEADERBOARDS`')) {
    let results = [...inMemoryDb.leaderboards];
    if (normalized.includes('TRACK_ID = ?')) {
      const tid = Number(params[0]);
      results = results.filter(l => l.track_id === tid);
    }
    results.sort((a, b) => a.best_lap_ms - b.best_lap_ms);
    return [results];
  }

  // Default fallback
  return [[], {}];
}

module.exports = {
  initDb,
  query,
  inMemoryDb,
  getPool: () => pool,
  isLiveDb: () => isConnected
};
