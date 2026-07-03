const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken } = require('../middleware/authMiddleware');
const { authLimiter } = require('../middleware/securityMiddleware');

// Auth endpoints
router.post('/register', authLimiter, authController.register);
router.get('/verify-email', authController.verifyEmail);
router.post('/login', authLimiter, authController.login);
router.post('/google', authLimiter, authController.googleLogin);
router.post('/logout', authController.logout);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// Authenticated checks
router.get('/me', verifyToken, authController.getMe);

module.exports = router;
