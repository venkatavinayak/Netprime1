const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { verifyToken: verifyClerkToken, createClerkClient } = require('@clerk/backend');
const User = require('../models/User');
const Subscription = require('../models/Subscription');
const Session = require('../models/Session');
const logger = require('../utils/logger');

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
  publishableKey: process.env.CLERK_PUBLISHABLE_KEY
});

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
    { 
      id: user._id, 
      email: user.email,
      jti: crypto.randomBytes(16).toString('hex')
    },
    process.env.REFRESH_TOKEN_SECRET || 'netprime_refresh_secret_token_30d_auth_rotation_secret_key_123456789',
    { expiresIn: '30d' }
  );
};

// Main authentication check middleware (supports Clerk session tokens & native JWT fallbacks)
const verifyToken = async (req, res, next) => {
  let accessToken = req.cookies.accessToken;

  // Fallback to Auth Header
  if (!accessToken && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    accessToken = req.headers.authorization.split(' ')[1];
  }

  if (!accessToken) {
    return handleRefreshFallback(req, res, next);
  }

  // Try Clerk verification first
  try {
    const clerkPayload = await verifyClerkToken(accessToken, {
      secretKey: process.env.CLERK_SECRET_KEY,
      publishableKey: process.env.CLERK_PUBLISHABLE_KEY
    });

    if (clerkPayload && clerkPayload.sub) {
      const clerkId = clerkPayload.sub;
      let user = await User.findOne({ clerkId });

      if (!user) {
        // Fetch profile details from Clerk to automatically register/sync user
        try {
          const clerkUser = await clerkClient.users.getUser(clerkId);
          const primaryEmail = clerkUser.emailAddresses?.find(
            email => email.id === clerkUser.primaryEmailAddressId
          ) || clerkUser.emailAddresses?.[0];

          const email = primaryEmail?.emailAddress?.toLowerCase();
          if (!email) {
            return res.status(400).json({ error: 'Clerk user has no email address.' });
          }

          // Check if user already exists by email
          user = await User.findOne({ email });
          if (user) {
            user.clerkId = clerkId;
            user.lastLogin = new Date();
            await user.save();
            logger.info(`Linked existing user email ${email} to Clerk ID ${clerkId}`);
          } else {
            const name = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ')
              || clerkUser.username
              || email.split('@')[0];

            user = new User({
              clerkId,
              name,
              email,
              avatar: clerkUser.imageUrl || 'avatar1.png',
              isEmailVerified: true,
              lastLogin: new Date()
            });
            await user.save();

            // Save default FREE subscription
            const subscription = new Subscription({
              userId: user._id,
              plan: 'FREE',
              status: 'NONE',
              expiryDate: new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000)
            });
            await subscription.save();
            logger.info(`Created new synced Clerk user record: ${email}`);
          }
        } catch (syncErr) {
          logger.error('Failed to sync Clerk user in verifyToken middleware: %O', syncErr);
          return res.status(401).json({ error: 'Clerk user database sync failed.' });
        }
      } else {
        // Sync last login time
        const now = new Date();
        if (!user.lastLogin || (now - user.lastLogin > 5 * 60 * 1000)) { // limit db writes to once every 5 minutes
          user.lastLogin = now;
          await user.save();
        }
      }

      req.user = { id: user._id, email: user.email, name: user.name, clerkId: user.clerkId };
      return next();
    }
  } catch (clerkErr) {
    // If Clerk token verification fails, fall back to native JWT validation
    try {
      const decoded = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET || 'netprime_access_secret_token_15m_auth_secret_key_987654321');
      req.user = decoded;
      return next();
    } catch (jwtErr) {
      if (jwtErr.name === 'TokenExpiredError') {
        return handleRefreshFallback(req, res, next);
      }
      logger.warn('Token verification failed (Clerk: %s, Native JWT: %s)', clerkErr.message, jwtErr.message);
      return res.status(401).json({ error: 'Unauthorized. Invalid session.' });
    }
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

    req.user = { id: user._id, email: user.email, name: user.name, clerkId: user.clerkId };
    
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
  generateRefreshToken,
  // Requirement aliases
  requireAuth: verifyToken,
  requirePremium: checkPremium,
  requireAdmin: isAdmin
};
