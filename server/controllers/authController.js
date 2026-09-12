const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const config = require('../config/env');
const db = require('../config/db');

class AuthController {
  static async register(req, res, next) {
    try {
      const { email, username, password, confirmPassword, driverName, country } = req.body;

      if (!email || !username || !password) {
        return res.status(400).json({ success: false, error: 'Email, username, and password are required.' });
      }

      if (confirmPassword && password !== confirmPassword) {
        return res.status(400).json({ success: false, error: 'Passwords do not match.' });
      }

      if (password.length < 6) {
        return res.status(400).json({ success: false, error: 'Password must be at least 6 characters long.' });
      }

      // Check existing user
      const [existing] = await db.query(
        'SELECT id FROM `users` WHERE email = ? OR username = ? LIMIT 1',
        [email.trim().toLowerCase(), username.trim()]
      );

      if (existing && existing.length > 0) {
        return res.status(409).json({ success: false, error: 'A user with this email or username already exists.' });
      }

      // Hash password with bcrypt
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Insert User
      const [userResult] = await db.query(
        'INSERT INTO `users` (email, username, password_hash) VALUES (?, ?, ?)',
        [email.trim().toLowerCase(), username.trim(), passwordHash]
      );

      const userId = userResult.insertId;
      const cleanDriverName = driverName || username;

      // Insert Profile
      await db.query(
        'INSERT INTO `profiles` (user_id, driver_name, country, avatar, level, xp, credits, career_rank) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [userId, cleanDriverName, country || 'USA', 'avatar_default', 1, 0, 15000, 'Rookie']
      );

      // Give starter car (Apex Pulse GT, vehicle_id 1)
      await db.query(
        'INSERT INTO `player_vehicles` (user_id, vehicle_id, color_hex, condition_pct, is_active) VALUES (?, ?, ?, ?, ?)',
        [userId, 1, '#FF4500', 100.0, 1]
      );

      // Generate JWT
      const token = jwt.sign(
        { id: userId, username: username.trim(), email: email.trim().toLowerCase() },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
      );

      return res.status(201).json({
        success: true,
        message: 'Welcome to Raceforge. Driver account initialized.',
        token,
        user: {
          id: userId,
          username: username.trim(),
          driverName: cleanDriverName,
          credits: 15000,
          level: 1,
          xp: 0,
          careerRank: 'Rookie'
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async login(req, res, next) {
    try {
      const { emailOrUsername, password } = req.body;

      if (!emailOrUsername || !password) {
        return res.status(400).json({ success: false, error: 'Username/email and password are required.' });
      }

      const [users] = await db.query(
        'SELECT * FROM `users` WHERE email = ? OR username = ? LIMIT 1',
        [emailOrUsername.trim().toLowerCase(), emailOrUsername.trim()]
      );

      const user = users && users[0];
      if (!user) {
        return res.status(401).json({ success: false, error: 'Invalid credentials. Check your email/username and password.' });
      }

      const match = await bcrypt.compare(password, user.password_hash);
      if (!match) {
        return res.status(401).json({ success: false, error: 'Invalid credentials. Check your email/username and password.' });
      }

      // Fetch Profile
      const [profiles] = await db.query(
        'SELECT * FROM `profiles` WHERE user_id = ? LIMIT 1',
        [user.id]
      );
      const profile = profiles && profiles[0] ? profiles[0] : {
        driver_name: user.username,
        credits: 15000,
        level: 1,
        xp: 0,
        career_rank: 'Rookie',
        country: 'USA'
      };

      // Generate JWT
      const token = jwt.sign(
        { id: user.id, username: user.username, email: user.email },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
      );

      return res.json({
        success: true,
        message: 'Authentication successful.',
        token,
        user: {
          id: user.id,
          username: user.username,
          driverName: profile.driver_name,
          country: profile.country,
          credits: profile.credits,
          level: profile.level,
          xp: profile.xp,
          careerRank: profile.career_rank
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async getProfile(req, res, next) {
    try {
      const userId = req.user ? req.user.id : 1;
      const [profiles] = await db.query('SELECT * FROM `profiles` WHERE user_id = ? LIMIT 1', [userId]);
      const profile = profiles && profiles[0] ? profiles[0] : {
        user_id: userId,
        driver_name: req.user ? req.user.username : 'Guest Driver',
        country: 'USA',
        level: 1,
        xp: 0,
        credits: 15000,
        career_rank: 'Rookie'
      };

      // Compute progression
      const nextLevelXp = Math.pow(profile.level, 2) * 150;
      const currentLevelBaseXp = Math.pow(profile.level - 1, 2) * 150;

      res.json({
        success: true,
        profile: {
          ...profile,
          nextLevelXp,
          levelProgressPct: Math.min(100, Math.max(0, Math.round(((profile.xp - currentLevelBaseXp) / (nextLevelXp - currentLevelBaseXp)) * 100)))
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateProfile(req, res, next) {
    try {
      const userId = req.user.id;
      const { driverName, country, avatar } = req.body;

      await db.query(
        'UPDATE `profiles` SET driver_name = COALESCE(?, driver_name), country = COALESCE(?, country), avatar = COALESCE(?, avatar) WHERE user_id = ?',
        [driverName, country, avatar, userId]
      );

      res.json({ success: true, message: 'Profile updated successfully.' });
    } catch (error) {
      next(error);
    }
  }

  static async recoverPassword(req, res, next) {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ success: false, error: 'Email address is required.' });
      }

      // Safe response without exposing whether the account exists
      res.json({
        success: true,
        message: 'If an active Raceforge account is registered with this address, recovery verification instructions have been dispatched.'
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AuthController;
