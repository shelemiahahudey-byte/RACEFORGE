-- ==============================================================================
-- RACEFORGE DATABASE SCHEMA
-- Relational MySQL Schema with Normalized Tables, Foreign Keys, Indexes & Constraints
-- ==============================================================================

CREATE DATABASE IF NOT EXISTS `raceforge` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `raceforge`;

-- 1. USERS
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `username` VARCHAR(60) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `last_login` TIMESTAMP NULL DEFAULT NULL,
  INDEX `idx_users_email` (`email`),
  INDEX `idx_users_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. PROFILES
CREATE TABLE IF NOT EXISTS `profiles` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNSIGNED NOT NULL UNIQUE,
  `driver_name` VARCHAR(80) NOT NULL,
  `country` VARCHAR(3) DEFAULT 'USA',
  `avatar` VARCHAR(255) DEFAULT 'default_avatar.png',
  `level` INT UNSIGNED DEFAULT 1,
  `xp` BIGINT UNSIGNED DEFAULT 0,
  `credits` BIGINT UNSIGNED DEFAULT 15000,
  `career_rank` VARCHAR(30) DEFAULT 'Rookie',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  INDEX `idx_profiles_user` (`user_id`),
  INDEX `idx_profiles_rank` (`career_rank`, `level`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. VEHICLES (Base Catalog)
CREATE TABLE IF NOT EXISTS `vehicles` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL UNIQUE,
  `manufacturer` VARCHAR(100) NOT NULL,
  `class` ENUM('Starter', 'Street', 'Sport', 'Muscle', 'Super', 'Hyper', 'Rally', 'Track') NOT NULL DEFAULT 'Starter',
  `mass` DECIMAL(8,2) NOT NULL COMMENT 'in kg',
  `horsepower` INT UNSIGNED NOT NULL COMMENT 'BHP',
  `torque` INT UNSIGNED NOT NULL COMMENT 'Nm',
  `top_speed` DECIMAL(6,2) NOT NULL COMMENT 'km/h',
  `acceleration` DECIMAL(4,2) NOT NULL COMMENT '0-100 km/h in seconds',
  `braking` DECIMAL(4,2) NOT NULL COMMENT '100-0 km/h in meters',
  `grip` DECIMAL(4,2) NOT NULL COMMENT 'lateral G grip rating',
  `handling` DECIMAL(4,2) NOT NULL COMMENT 'turn-in responsiveness',
  `drivetrain` ENUM('RWD', 'AWD', 'FWD') NOT NULL DEFAULT 'RWD',
  `fuel_capacity` DECIMAL(5,2) NOT NULL DEFAULT 60.00 COMMENT 'liters',
  `price` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `unlock_level` INT UNSIGNED NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. PLAYER_VEHICLES
CREATE TABLE IF NOT EXISTS `player_vehicles` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNSIGNED NOT NULL,
  `vehicle_id` INT UNSIGNED NOT NULL,
  `color_hex` VARCHAR(10) DEFAULT '#FF4500',
  `color_metallic` DECIMAL(3,2) DEFAULT 0.8,
  `color_roughness` DECIMAL(3,2) DEFAULT 0.2,
  `condition_pct` DECIMAL(5,2) DEFAULT 100.00,
  `mileage_km` DECIMAL(10,2) DEFAULT 0.00,
  `is_active` TINYINT(1) DEFAULT 0,
  `purchased_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles` (`id`) ON DELETE RESTRICT,
  INDEX `idx_pv_user` (`user_id`),
  INDEX `idx_pv_active` (`user_id`, `is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. VEHICLE_UPGRADES (Catalog)
CREATE TABLE IF NOT EXISTS `vehicle_upgrades` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `category` ENUM('ENGINE', 'TURBO', 'TRANSMISSION', 'BRAKES', 'SUSPENSION', 'TIRES', 'AERODYNAMICS', 'WEIGHT REDUCTION') NOT NULL,
  `tier` INT UNSIGNED NOT NULL DEFAULT 1,
  `name` VARCHAR(100) NOT NULL,
  `description` TEXT,
  `price` BIGINT UNSIGNED NOT NULL DEFAULT 1000,
  `hp_delta` INT DEFAULT 0,
  `torque_delta` INT DEFAULT 0,
  `mass_delta` DECIMAL(6,2) DEFAULT 0.00,
  `grip_delta` DECIMAL(4,2) DEFAULT 0.00,
  `braking_delta` DECIMAL(4,2) DEFAULT 0.00,
  `handling_delta` DECIMAL(4,2) DEFAULT 0.00,
  `top_speed_delta` DECIMAL(5,2) DEFAULT 0.00,
  UNIQUE KEY `uk_upgrade_tier` (`category`, `tier`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. PLAYER_VEHICLE_UPGRADES
CREATE TABLE IF NOT EXISTS `player_vehicle_upgrades` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `player_vehicle_id` INT UNSIGNED NOT NULL,
  `upgrade_id` INT UNSIGNED NOT NULL,
  `installed_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`player_vehicle_id`) REFERENCES `player_vehicles` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`upgrade_id`) REFERENCES `vehicle_upgrades` (`id`) ON DELETE CASCADE,
  UNIQUE KEY `uk_pv_upgrade` (`player_vehicle_id`, `upgrade_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. VEHICLE_SETUPS
CREATE TABLE IF NOT EXISTS `vehicle_setups` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `player_vehicle_id` INT UNSIGNED NOT NULL,
  `setup_name` VARCHAR(60) NOT NULL DEFAULT 'Balanced Race',
  `tire_compound` ENUM('Soft', 'Medium', 'Hard', 'Wet') NOT NULL DEFAULT 'Medium',
  `tire_pressure_psi` DECIMAL(4,1) DEFAULT 28.0,
  `downforce_front` DECIMAL(3,2) DEFAULT 0.50,
  `downforce_rear` DECIMAL(3,2) DEFAULT 0.50,
  `gear_ratio_final` DECIMAL(4,2) DEFAULT 3.42,
  `brake_bias_front_pct` INT DEFAULT 55,
  `suspension_stiffness` DECIMAL(3,2) DEFAULT 0.60,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`player_vehicle_id`) REFERENCES `player_vehicles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. TRACKS
CREATE TABLE IF NOT EXISTS `tracks` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL UNIQUE,
  `length_meters` INT UNSIGNED NOT NULL,
  `difficulty` ENUM('Beginner', 'Intermediate', 'Advanced', 'Expert', 'Master') NOT NULL DEFAULT 'Intermediate',
  `environment` VARCHAR(50) NOT NULL DEFAULT 'Circuit',
  `sectors_count` INT UNSIGNED NOT NULL DEFAULT 3,
  `elevation_diff_meters` DECIMAL(5,1) DEFAULT 0.0,
  `weather_support` TINYINT(1) DEFAULT 1,
  `night_support` TINYINT(1) DEFAULT 1,
  `track_record_ms` INT UNSIGNED DEFAULT 75000,
  `track_record_holder` VARCHAR(80) DEFAULT 'Raceforge Ghost',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. RACES (Session state)
CREATE TABLE IF NOT EXISTS `races` (
  `id` VARCHAR(64) PRIMARY KEY,
  `track_id` INT UNSIGNED NOT NULL,
  `race_type` ENUM('CAREER', 'QUICK', 'MULTIPLAYER', 'TIME_TRIAL') NOT NULL DEFAULT 'QUICK',
  `weather` ENUM('CLEAR', 'CLOUDY', 'RAIN', 'HEAVY_RAIN', 'FOG', 'STORM') NOT NULL DEFAULT 'CLEAR',
  `time_of_day` ENUM('DAWN', 'DAY', 'SUNSET', 'NIGHT') NOT NULL DEFAULT 'DAY',
  `laps` INT UNSIGNED NOT NULL DEFAULT 3,
  `participants_count` INT UNSIGNED NOT NULL DEFAULT 1,
  `status` ENUM('WAITING', 'COUNTDOWN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'WAITING',
  `started_at` TIMESTAMP NULL DEFAULT NULL,
  `ended_at` TIMESTAMP NULL DEFAULT NULL,
  FOREIGN KEY (`track_id`) REFERENCES `tracks` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. RACE_PARTICIPANTS
CREATE TABLE IF NOT EXISTS `race_participants` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `race_id` VARCHAR(64) NOT NULL,
  `user_id` INT UNSIGNED NULL COMMENT 'NULL for AI bot',
  `driver_name` VARCHAR(80) NOT NULL,
  `is_ai` TINYINT(1) NOT NULL DEFAULT 0,
  `ai_personality` ENUM('AGGRESSIVE', 'DEFENSIVE', 'BALANCED', 'CAUTIOUS', 'EXPERT') NULL,
  `vehicle_id` INT UNSIGNED NOT NULL,
  `grid_position` INT UNSIGNED NOT NULL,
  FOREIGN KEY (`race_id`) REFERENCES `races` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. RACE_RESULTS
CREATE TABLE IF NOT EXISTS `race_results` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `race_id` VARCHAR(64) NOT NULL,
  `user_id` INT UNSIGNED NULL,
  `driver_name` VARCHAR(80) NOT NULL,
  `position` INT UNSIGNED NOT NULL,
  `total_time_ms` INT UNSIGNED NOT NULL,
  `best_lap_ms` INT UNSIGNED NOT NULL,
  `credits_earned` BIGINT UNSIGNED DEFAULT 0,
  `xp_earned` BIGINT UNSIGNED DEFAULT 0,
  `distance_km` DECIMAL(8,2) DEFAULT 0.00,
  `damage_pct` DECIMAL(5,2) DEFAULT 0.00,
  `fuel_used_liters` DECIMAL(5,2) DEFAULT 0.00,
  `tire_wear_pct` DECIMAL(5,2) DEFAULT 0.00,
  `is_clean_race` TINYINT(1) DEFAULT 1,
  `is_personal_best` TINYINT(1) DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_results_user` (`user_id`),
  INDEX `idx_results_race` (`race_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. PLAYER_STATISTICS
CREATE TABLE IF NOT EXISTS `player_statistics` (
  `user_id` INT UNSIGNED PRIMARY KEY,
  `total_races` INT UNSIGNED DEFAULT 0,
  `wins` INT UNSIGNED DEFAULT 0,
  `podiums` INT UNSIGNED DEFAULT 0,
  `clean_races` INT UNSIGNED DEFAULT 0,
  `total_distance_km` DECIMAL(12,2) DEFAULT 0.00,
  `total_overtakes` INT UNSIGNED DEFAULT 0,
  `total_drift_points` BIGINT UNSIGNED DEFAULT 0,
  `career_points` INT UNSIGNED DEFAULT 0,
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. SEASONS
CREATE TABLE IF NOT EXISTS `seasons` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(60) NOT NULL,
  `start_date` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `end_date` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `is_active` TINYINT(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. LEADERBOARDS
CREATE TABLE IF NOT EXISTS `leaderboards` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `track_id` INT UNSIGNED NOT NULL,
  `user_id` INT UNSIGNED NOT NULL,
  `vehicle_id` INT UNSIGNED NOT NULL,
  `best_lap_ms` INT UNSIGNED NOT NULL,
  `rating` INT UNSIGNED DEFAULT 1200,
  `weather` VARCHAR(20) DEFAULT 'CLEAR',
  `submitted_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`track_id`) REFERENCES `tracks` (`id`),
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles` (`id`),
  UNIQUE KEY `uk_track_user_time` (`track_id`, `user_id`),
  INDEX `idx_leaderboard_rank` (`track_id`, `best_lap_ms` ASC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 15. ACHIEVEMENTS
CREATE TABLE IF NOT EXISTS `achievements` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `key_name` VARCHAR(50) NOT NULL UNIQUE,
  `title` VARCHAR(100) NOT NULL,
  `description` VARCHAR(255) NOT NULL,
  `reward_credits` BIGINT UNSIGNED DEFAULT 1000,
  `reward_xp` BIGINT UNSIGNED DEFAULT 500,
  `icon` VARCHAR(50) DEFAULT 'trophy'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 16. PLAYER_ACHIEVEMENTS
CREATE TABLE IF NOT EXISTS `player_achievements` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNSIGNED NOT NULL,
  `achievement_id` INT UNSIGNED NOT NULL,
  `unlocked_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`achievement_id`) REFERENCES `achievements` (`id`),
  UNIQUE KEY `uk_user_achievement` (`user_id`, `achievement_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 17. CHALLENGES
CREATE TABLE IF NOT EXISTS `challenges` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `type` ENUM('DAILY', 'WEEKLY') NOT NULL DEFAULT 'DAILY',
  `title` VARCHAR(100) NOT NULL,
  `description` VARCHAR(255) NOT NULL,
  `target_metric` VARCHAR(50) NOT NULL,
  `target_value` INT NOT NULL,
  `reward_credits` BIGINT UNSIGNED NOT NULL DEFAULT 2000,
  `reward_xp` BIGINT UNSIGNED NOT NULL DEFAULT 800,
  `expires_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 18. PLAYER_CHALLENGES
CREATE TABLE IF NOT EXISTS `player_challenges` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNSIGNED NOT NULL,
  `challenge_id` INT UNSIGNED NOT NULL,
  `progress_value` INT NOT NULL DEFAULT 0,
  `is_completed` TINYINT(1) DEFAULT 0,
  `claimed_reward` TINYINT(1) DEFAULT 0,
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`challenge_id`) REFERENCES `challenges` (`id`),
  UNIQUE KEY `uk_user_challenge` (`user_id`, `challenge_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 19. FRIENDSHIPS
CREATE TABLE IF NOT EXISTS `friendships` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNSIGNED NOT NULL,
  `friend_user_id` INT UNSIGNED NOT NULL,
  `status` ENUM('PENDING', 'ACCEPTED', 'BLOCKED') NOT NULL DEFAULT 'PENDING',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`friend_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  UNIQUE KEY `uk_friendship` (`user_id`, `friend_user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 20. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS `notifications` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNSIGNED NOT NULL,
  `title` VARCHAR(100) NOT NULL,
  `message` TEXT NOT NULL,
  `type` ENUM('SYSTEM', 'FRIEND_REQUEST', 'RACE_INVITE', 'REWARD', 'CHALLENGE') DEFAULT 'SYSTEM',
  `is_read` TINYINT(1) DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 21. GAME_SETTINGS
CREATE TABLE IF NOT EXISTS `game_settings` (
  `setting_key` VARCHAR(64) PRIMARY KEY,
  `setting_value` TEXT NOT NULL,
  `description` VARCHAR(255)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
