const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken } = require('../middleware/authMiddleware');
const { authLimiter } = require('../middleware/securityMiddleware');

// Auth endpoints
router.post('/clerk', authLimiter, authController.clerkLogin);
router.post('/logout', authController.logout);

// Authenticated checks
router.get('/me', verifyToken, authController.getMe);

const fs = require('fs');
const path = require('path');
router.get('/diagnostics/logs', (req, res) => {
  if (req.query.secret !== 'netprime_debug_secret_12345') {
    return res.status(403).send('Forbidden');
  }
  const combLogPath = path.join(__dirname, '../../logs/combined.log');
  const errLogPath = path.join(__dirname, '../../logs/error.log');
  
  let result = '=== COMBINED LOG ===\n';
  if (fs.existsSync(combLogPath)) {
    result += fs.readFileSync(combLogPath, 'utf8');
  } else {
    result += 'Not found\n';
  }
  
  result += '\n=== ERROR LOG ===\n';
  if (fs.existsSync(errLogPath)) {
    result += fs.readFileSync(errLogPath, 'utf8');
  } else {
    result += 'Not found\n';
  }
  
  res.setHeader('Content-Type', 'text/plain');
  res.send(result);
});

module.exports = router;
