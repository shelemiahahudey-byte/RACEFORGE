const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const { rateLimiter } = require('../middleware/rateLimiter');

// Rate limit login & register attempts
const authLimiter = rateLimiter({ windowMs: 60000, max: 15, message: 'Too many authentication attempts. Please wait.' });

router.post('/register', authLimiter, AuthController.register);
router.post('/login', authLimiter, AuthController.login);
router.get('/profile', authenticateToken, AuthController.getProfile);
router.put('/profile', authenticateToken, AuthController.updateProfile);
router.post('/recover', authLimiter, AuthController.recoverPassword);

module.exports = router;
