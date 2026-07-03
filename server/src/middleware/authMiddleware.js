const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Subscription = require('../models/Subscription');
const Session = require('../models/Session');
const logger = require('../utils/logger');

// Generate access token (7 days for cross-origin local storage fallback)
const generateAccessToken = (user) => {
  return jwt.sign(
    { id: user._id, email: user.email, name: user.name },
    process.env.ACCESS_TOKEN_SECRET || 'netprime_access_secret_token_15m_auth_secret_key_987654321',
    { expiresIn: '7d' }
  );
};

// Generate refresh token (30 days)
const generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user._id, email: user.email },
    process.env.REFRESH_TOKEN_SECRET || 'netprime_refresh_secret_token_30d_auth_rotation_secret_key_123456789',
    { expiresIn: '30d' }
  );
};

// Main authentication check middleware
const verifyToken = async (req, res, next) => {
  let accessToken = req.cookies.accessToken;

  // Fallback to Auth Header
  if (!accessToken && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    accessToken = req.headers.authorization.split(' ')[1];
  }

  if (!accessToken) {
    return handleRefreshFallback(req, res, next);
  }

  try {
    const decoded = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET || 'netprime_access_secret_token_15m_auth_secret_key_987654321');
    req.user = decoded;
    return next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return handleRefreshFallback(req, res, next);
    }
    logger.warn('Access token verification failed: %s', err.message);
    return res.status(401).json({ error: 'Unauthorized. Invalid session.' });
  }
};

// Fallback to refresh token if access token is expired or missing
const handleRefreshFallback = async (req, res, next) => {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) {
    return res.status(401).json({ error: 'Unauthorized. Session expired.' });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET || 'netprime_refresh_secret_token_30d_auth_rotation_secret_key_123456789');
    
    // Verify session exists in DB
    const session = await Session.findOne({ userId: decoded.id, refreshToken });
    if (!session) {
      logger.warn('Revoked session access attempt for User ID: %s', decoded.id);
      res.clearCookie('accessToken');
      res.clearCookie('refreshToken');
      return res.status(401).json({ error: 'Session revoked. Please log in again.' });
    }

    // Load User
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ error: 'User no longer exists.' });
    }

    // Generate new Access Token
    const newAccessToken = generateAccessToken(user);

    // Set new Access Token in HTTP-only cookie
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('accessToken', newAccessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: 15 * 60 * 1000 // 15 mins
    });

    req.user = { id: user._id, email: user.email, name: user.name };
    
    // Update session last seen timestamp
    session.lastSeen = new Date();
    await session.save();

    return next();
  } catch (err) {
    logger.warn('Refresh token verification failed: %s', err.message);
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    return res.status(401).json({ error: 'Unauthorized. Session expired.' });
  }
};

// Check if user is email-verified
const checkEmailVerified = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || !user.isEmailVerified) {
      return res.status(403).json({ error: 'Email verification required before subscribing.' });
    }
    next();
  } catch (err) {
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Check if user is premium
const checkPremium = async (req, res, next) => {
  try {
    const sub = await Subscription.findOne({ userId: req.user.id });
    
    if (sub && sub.status === 'ACTIVE' && sub.expiryDate > new Date()) {
      req.subscription = sub;
      return next();
    }

    // If expired, perform update
    if (sub && sub.status === 'ACTIVE' && sub.expiryDate <= new Date()) {
      sub.status = 'EXPIRED';
      sub.plan = 'FREE';
      await sub.save();
    }

    return res.status(403).json({ error: 'Upgrade to Premium. Active subscription required.' });
  } catch (err) {
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

const isAdmin = async (req, res, next) => {
  if (req.user && req.user.email === 'admin@netprime.com') {
    return next();
  }
  return res.status(403).json({ error: 'Access denied. Administrator privileges required.' });
};

module.exports = {
  verifyToken,
  checkEmailVerified,
  checkPremium,
  isAdmin,
  generateAccessToken,
  generateRefreshToken
};
