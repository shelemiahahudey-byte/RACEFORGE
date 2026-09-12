-- ==============================================================================
-- RACEFORGE SEED DATA
-- Fictional Vehicles, Tracks, Upgrades, Achievements, and Initial Challenges
-- ==============================================================================

USE `raceforge`;

-- Insert Base Vehicles (8 Categories)
INSERT INTO `vehicles` (`id`, `name`, `manufacturer`, `class`, `mass`, `horsepower`, `torque`, `top_speed`, `acceleration`, `braking`, `grip`, `handling`, `drivetrain`, `fuel_capacity`, `price`, `unlock_level`) VALUES
(1, 'Apex Pulse GT', 'Veloce Dynamics', 'Starter', 1280.00, 210, 260, 225.00, 6.20, 38.50, 0.95, 0.85, 'FWD', 55.00, 0, 1),
(2, 'Shinobi Kuro 35', 'Katana Motors', 'Street', 1320.00, 320, 390, 260.00, 4.80, 36.00, 1.10, 0.90, 'RWD', 60.00, 28000, 3),
(3, 'Valkyrie R-Spec', 'AeroNordic', 'Sport', 1250.00, 420, 480, 290.00, 3.90, 33.50, 1.25, 0.94, 'RWD', 65.00, 65000, 6),
(4, 'Bison Torq 7.0', 'Detroit Ironworks', 'Muscle', 1650.00, 560, 720, 280.00, 4.10, 39.00, 1.05, 0.78, 'RWD', 75.00, 52000, 8),
(5, 'Spectre Evoluzione', 'Fiorano Corse', 'Super', 1180.00, 680, 700, 335.00, 3.10, 31.00, 1.40, 0.96, 'RWD', 70.00, 140000, 12),
(6, 'Nebula Chronos X', 'Aether Hypertech', 'Hyper', 1100.00, 980, 1050, 385.00, 2.40, 29.00, 1.55, 0.98, 'AWD', 80.00, 350000, 18),
(7, 'Dune Strider RX', 'Kalahari Works', 'Rally', 1220.00, 380, 510, 245.00, 3.70, 34.00, 1.30, 0.92, 'AWD', 65.00, 80000, 10),
(8, 'Zenith LMP Carbon', 'Apex Prototype Lab', 'Track', 890.00, 750, 650, 350.00, 2.60, 27.50, 1.70, 0.99, 'RWD', 85.00, 500000, 25)
ON DUPLICATE KEY UPDATE `name`=VALUES(`name`);

-- Insert Tracks (5 Fictional Tracks)
INSERT INTO `tracks` (`id`, `name`, `length_meters`, `difficulty`, `environment`, `sectors_count`, `elevation_diff_meters`, `weather_support`, `night_support`, `track_record_ms`, `track_record_holder`) VALUES
(1, 'Harbor Run', 3200, 'Beginner', 'Coastal Harbor', 3, 12.5, 1, 1, 68420, 'Marina_Speedster'),
(2, 'Accra Circuit', 4550, 'Intermediate', 'Urban Metropolis', 3, 18.0, 1, 1, 92150, 'BlackStar_Racer'),
(3, 'Desert Apex', 5200, 'Advanced', 'Canyon Dunes', 4, 38.0, 1, 1, 108300, 'Dune_Phantom'),
(4, 'Mountain Pass', 6100, 'Expert', 'Alpine Slopes', 4, 145.0, 1, 1, 134500, 'Touge_Ghost'),
(5, 'Neon Grand Prix', 4800, 'Master', 'Cyberpunk Night City', 3, 24.0, 1, 1, 95800, 'Cyber_Drifter')
ON DUPLICATE KEY UPDATE `name`=VALUES(`name`);

-- Insert Vehicle Upgrades
INSERT INTO `vehicle_upgrades` (`id`, `category`, `tier`, `name`, `description`, `price`, `hp_delta`, `torque_delta`, `mass_delta`, `grip_delta`, `braking_delta`, `handling_delta`, `top_speed_delta`) VALUES
(1, 'ENGINE', 1, 'Stage 1 ECU & Cold Air Intake', 'High-flow filter and tuned fuel maps', 2500, 25, 30, 0.00, 0.00, 0.00, 0.00, 8.00),
(2, 'ENGINE', 2, 'Stage 2 Camshaft & Headers', 'High-lift cams and equal-length headers', 6500, 55, 65, -5.00, 0.00, 0.00, 0.00, 18.00),
(3, 'ENGINE', 3, 'Race-Spec Forged Internals', 'Titanium rods, forged pistons, and dry sump lubrication', 16000, 110, 130, -12.00, 0.00, 0.00, 0.00, 32.00),

(4, 'TURBO', 1, 'Twin-Scroll Ball Bearing Turbo', 'Rapid spool, reduced turbo lag', 4200, 40, 50, 4.00, 0.00, 0.00, 0.00, 12.00),
(5, 'TURBO', 2, 'Variable Vane Hybrid Turbo', 'Linear boost delivery across the entire rev band', 9800, 85, 100, 6.00, 0.00, 0.00, 0.00, 24.00),

(6, 'TRANSMISSION', 1, 'Close-Ratio 6-Speed Manual', 'Optimized gear spacing for explosive mid-range exit', 3000, 0, 0, -8.00, 0.00, 0.00, 0.02, 5.00),
(7, 'TRANSMISSION', 2, 'Sequential Dog-Box with Paddle Shift', 'Lightning 30ms shift times with flat-foot upshifts', 8500, 0, 0, -15.00, 0.00, 0.00, 0.05, 10.00),

(8, 'BRAKES', 1, 'Slotted Rotors & Ceramic Pads', 'Resistant to brake fade under repeated hard stops', 2200, 0, 0, -3.00, 0.02, -3.50, 0.02, 0.00),
(9, 'BRAKES', 2, 'Carbon-Ceramic 6-Piston Brembo Kit', 'F1-derived stopping power and weight reduction', 7800, 0, 0, -14.00, 0.05, -7.20, 0.05, 0.00),

(10, 'SUSPENSION', 1, 'Adjustable Coilover Kit', 'Lower center of gravity and reduced body roll', 2800, 0, 0, -6.00, 0.06, -1.00, 0.08, 0.00),
(11, 'SUSPENSION', 2, 'Active Magnetic Dampers', 'Real-time adaptive damping per wheel', 8200, 0, 0, -10.00, 0.12, -2.00, 0.15, 0.00),

(12, 'TIRES', 1, 'Street Performance Compound', 'Enhanced silica tread for predictable dry/wet grip', 1800, 0, 0, 0.00, 0.08, -2.00, 0.06, 0.00),
(13, 'TIRES', 2, 'Semi-Slick Competition Tires', 'Maximum contact patch for high-G apex speeds', 4500, 0, 0, 0.00, 0.18, -4.50, 0.12, 0.00),

(14, 'AERODYNAMICS', 1, 'Front Splitter & Ducktail Spoiler', 'Reduced front lift and stable high-speed tracking', 2100, 0, 0, 5.00, 0.05, 0.00, 0.06, -2.00),
(15, 'AERODYNAMICS', 2, 'Full GT3 Carbon Wing & Venturi Tunnel', 'Massive ground-effect downforce for flat-out sweepers', 6800, 0, 0, 8.00, 0.15, 0.00, 0.12, -5.00),

(16, 'WEIGHT REDUCTION', 1, 'Stripped Interior & Carbon Seats', 'Sound deadening removal and lightweight bucket seats', 2000, 0, 0, -50.00, 0.03, -1.50, 0.05, 4.00),
(17, 'WEIGHT REDUCTION', 2, 'Carbon Fiber Body Panels & Lexan Glass', 'Ultra-light shell with optimal 50:50 weight balance', 7500, 0, 0, -120.00, 0.08, -3.80, 0.10, 8.00)
ON DUPLICATE KEY UPDATE `name`=VALUES(`name`);

-- Insert Achievements (10 Motorsport milestones)
INSERT INTO `achievements` (`id`, `key_name`, `title`, `description`, `reward_credits`, `reward_xp`, `icon`) VALUES
(1, 'FIRST_VICTORY', 'First Blood on Asphalt', 'Win your very first race in career or quick race mode.', 2500, 1000, 'trophy-gold'),
(2, '100_RACES', 'Century Driver', 'Complete 100 competitive races.', 20000, 8000, 'flag-checkered'),
(3, 'PERFECT_LAP', 'Precision Telemetry', 'Complete a full lap without going off-track or taking any damage.', 3000, 1200, 'target'),
(4, 'DRIFT_KING', 'Apex Sideways', 'Score over 5,000 drift points in a single drift sequence.', 4000, 1500, 'tire-smoke'),
(5, 'SPEED_DEMON', 'Sound Barrier', 'Exceed 320 km/h in any vehicle.', 5000, 2000, 'speedometer'),
(6, 'RAIN_MASTER', 'Aquaplane Conqueror', 'Win a race in Heavy Rain or Storm conditions without spinning out.', 6000, 2500, 'cloud-rain'),
(7, 'NIGHT_RACER', 'Midnight Phantom', 'Take P1 in a night race under floodlights.', 4500, 1800, 'moon'),
(8, 'CLEAN_RACER', 'Gentleman Driver', 'Finish 5 consecutive races with 0% vehicle damage.', 7500, 3000, 'shield-check'),
(9, 'PIT_STRATEGIST', 'Tactical Undercut', 'Perform a mid-race pit stop to swap tires and win.', 5000, 2000, 'wrench'),
(10, 'LEGEND', 'Motorsport Deity', 'Reach Career Rank Legend and unlock the Zenith LMP Carbon.', 50000, 25000, 'crown')
ON DUPLICATE KEY UPDATE `title`=VALUES(`title`);

-- Insert Challenges
INSERT INTO `challenges` (`id`, `type`, `title`, `description`, `target_metric`, `target_value`, `reward_credits`, `reward_xp`, `expires_at`) VALUES
(1, 'DAILY', 'Warmup Circuit', 'Complete 3 races across any tracks.', 'races_completed', 3, 3500, 1200, DATE_ADD(NOW(), INTERVAL 1 DAY)),
(2, 'DAILY', 'High Roller', 'Earn a P1 finish on Accra Circuit.', 'accra_p1', 1, 4500, 1500, DATE_ADD(NOW(), INTERVAL 1 DAY)),
(3, 'DAILY', 'Clean Overtakes', 'Perform 10 overtakes without touching opponent vehicles.', 'clean_overtakes', 10, 5000, 1800, DATE_ADD(NOW(), INTERVAL 1 DAY)),
(4, 'DAILY', 'Storm Chaser', 'Complete a wet track race with tire wear under 35%.', 'wet_race_clean', 1, 6000, 2200, DATE_ADD(NOW(), INTERVAL 1 DAY)),
(5, 'WEEKLY', 'Endurance Master', 'Accumulate 150 km of total competitive racing distance.', 'distance_km', 150, 25000, 10000, DATE_ADD(NOW(), INTERVAL 7 DAY))
ON DUPLICATE KEY UPDATE `title`=VALUES(`title`);
