const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/User');
const Subscription = require('../models/Subscription');
const Session = require('../models/Session');
const { generateAccessToken, generateRefreshToken } = require('../middleware/authMiddleware');
const { verifyGoogleToken } = require('../config/firebase');
const { sendEmail } = require('../utils/email');
const logger = require('../utils/logger');

// Utility to parse device details from User Agent
const parseUserAgent = (userAgent) => {
  const ua = userAgent || '';
  let os = 'Unknown OS';
  let browser = 'Unknown Browser';
  let deviceName = 'PC / Desktop';

  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Macintosh') || ua.includes('Mac OS')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) { os = 'Android'; deviceName = 'Mobile Device'; }
  else if (ua.includes('iPhone')) { os = 'iOS'; deviceName = 'iPhone'; }

  if (ua.includes('Chrome')) browser = 'Chrome';
  else if (ua.includes('Safari')) browser = 'Safari';
  else if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Edg')) browser = 'Edge';

  return { os, browser, deviceName };
};

// Register User
exports.register = async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered.' });
    }

    // Encrypt password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Generate verification token
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');

    // Create User
    const user = new User({
      name,
      email,
      password: passwordHash,
      emailVerificationToken
    });

    await user.save();

    // Initialize FREE Subscription
    const subscription = new Subscription({
      userId: user._id,
      plan: 'FREE',
      status: 'NONE',
      expiryDate: new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000) // Infinite free
    });
    await subscription.save();

    // Send Verification Email
    const verifyLink = `${process.env.CLIENT_URL || 'http://localhost:5000'}/verify.html?token=${emailVerificationToken}`;
    await sendEmail({
      to: user.email,
      subject: 'Verify Your NetPrime Account',
      text: `Welcome to NetPrime, ${user.name}! Verify your account by visiting: ${verifyLink}`,
      html: `
        <div style="font-family: sans-serif; max-width: 500px; padding: 20px; border: 1px solid #ff007f; border-radius: 8px;">
          <h2 style="color: #ff007f;">Welcome to NetPrime!</h2>
          <p>Hi ${user.name},</p>
          <p>Please verify your email address to complete your registration and start subscribing to premium plans.</p>
          <a href="${verifyLink}" style="display: inline-block; padding: 10px 20px; background-color: #ff007f; color: #fff; text-decoration: none; border-radius: 5px; font-weight: bold; margin-top: 15px;">Verify Email</a>
          <p style="margin-top: 20px; font-size: 0.8rem; color: #666;">If you did not request this, you can ignore this email.</p>
        </div>
      `
    });

    logger.info('New user registered successfully: %s', user.email);
    res.status(201).json({ message: 'Registration successful! Verification email sent.' });
  } catch (error) {
    logger.error('Registration error: %O', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Verify Email Token
exports.verifyEmail = async (req, res) => {
  const { token } = req.query;
  try {
    const user = await User.findOne({ emailVerificationToken: token });
    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired verification token.' });
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    await user.save();

    logger.info('Email verified successfully for: %s', user.email);
    res.status(200).json({ message: 'Email verified successfully! You can now sign in.' });
  } catch (error) {
    logger.error('Verification error: %O', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Login User
exports.login = async (req, res) => {
  const { email, password, rememberMe } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    if (!user.isEmailVerified) {
      return res.status(403).json({ error: 'Please verify your email address before logging in.' });
    }

    // Verify Password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Save Session details (Device Management)
    const { os, browser, deviceName } = parseUserAgent(req.headers['user-agent']);
    const session = new Session({
      userId: user._id,
      refreshToken,
      deviceName,
      browser,
      os,
      ipAddress: req.ip
    });
    await session.save();

    // Set secure HttpOnly cookies
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: 15 * 60 * 1000 // 15 mins
    });

    const refreshMaxAge = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000; // 30 days vs 1 day
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: refreshMaxAge
    });

    logger.info('User logged in: %s on %s (%s)', user.email, deviceName, os);
    res.status(200).json({ 
      message: 'Login successful!', 
      user: { name: user.name, email: user.email, avatar: user.avatar },
      token: accessToken,
      refreshToken: refreshToken
    });
  } catch (error) {
    logger.error('Login error: %O', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Google Auth Callback
exports.googleLogin = async (req, res) => {
  const { idToken } = req.body;
  try {
    // Verify using Firebase admin helper
    const payload = await verifyGoogleToken(idToken);
    
    let user = await User.findOne({ email: payload.email });
    
    if (!user) {
      // Create user automatically
      user = new User({
        name: payload.name,
        email: payload.email,
        avatar: payload.picture,
        isEmailVerified: true // Google emails are already pre-verified
      });
      await user.save();

      // Initialize FREE Subscription
      const subscription = new Subscription({
        userId: user._id,
        plan: 'FREE',
        status: 'NONE',
        expiryDate: new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000)
      });
      await subscription.save();
      logger.info('Registered new Google OAuth account: %s', user.email);
    }

    // Refresh profile image if Google image changed
    if (user.avatar !== payload.picture && payload.picture.startsWith('http')) {
      user.avatar = payload.picture;
      await user.save();
    }

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Save Session details (Device Management)
    const { os, browser, deviceName } = parseUserAgent(req.headers['user-agent']);
    const session = new Session({
      userId: user._id,
      refreshToken,
      deviceName,
      browser,
      os,
      ipAddress: req.ip
    });
    await session.save();

    // Set secure HttpOnly cookies
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: 15 * 60 * 1000 // 15 mins
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });

    logger.info('Google login successful: %s on %s', user.email, deviceName);
    res.status(200).json({ 
      message: 'Google authentication successful!', 
      user: { name: user.name, email: user.email, avatar: user.avatar },
      token: accessToken,
      refreshToken: refreshToken
    });
  } catch (error) {
    logger.error('Google Auth error: %O', error);
    res.status(500).json({ error: 'Google Login verification failed.' });
  }
};

// Logout User
exports.logout = async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  try {
    if (refreshToken) {
      // Remove Session from DB
      await Session.deleteOne({ refreshToken });
    }

    // Clear Cookies
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');

    logger.info('User logged out');
    res.status(200).json({ message: 'Logged out successfully.' });
  } catch (error) {
    logger.error('Logout error: %O', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Forgot Password Request
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      // Don't disclose if email exists for security, return mock success
      return res.status(200).json({ message: 'If the email exists, a password reset link has been sent.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour validity
    await user.save();

    const resetLink = `${process.env.CLIENT_URL || 'http://localhost:5000'}/login.html?resetToken=${token}`;
    await sendEmail({
      to: user.email,
      subject: 'Reset Your NetPrime Password',
      text: `Reset your password by visiting this link: ${resetLink}`,
      html: `
        <div style="font-family: sans-serif; max-width: 500px; padding: 20px; border: 1px solid #ff007f; border-radius: 8px;">
          <h2 style="color: #ff007f;">Reset Password</h2>
          <p>Hi ${user.name},</p>
          <p>You requested a password reset. Click the link below to set a new password. This link is valid for 1 hour.</p>
          <a href="${resetLink}" style="display: inline-block; padding: 10px 20px; background-color: #ff007f; color: #fff; text-decoration: none; border-radius: 5px; font-weight: bold; margin-top: 15px;">Reset Password</a>
          <p style="margin-top: 20px; font-size: 0.8rem; color: #666;">If you did not request this, you can ignore this email.</p>
        </div>
      `
    });

    res.status(200).json({ message: 'Reset link dispatched to email.' });
  } catch (error) {
    logger.error('Forgot password error: %O', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Reset Password Action
exports.resetPassword = async (req, res) => {
  const { token, password } = req.body;
  try {
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ error: 'Password reset token is invalid or has expired.' });
    }

    // Encrypt password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    // Revoke all sessions for this user (force re-login on all devices)
    await Session.deleteMany({ userId: user._id });

    logger.info('Password reset successfully for: %s', user.email);
    res.status(200).json({ message: 'Password has been reset successfully! You can now log in.' });
  } catch (error) {
    logger.error('Reset password error: %O', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Get current user profile (verify token check)
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const subscription = await Subscription.findOne({ userId: user._id });
    const sessionCount = await Session.countDocuments({ userId: user._id });

    res.status(200).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        isEmailVerified: user.isEmailVerified,
        createdAt: user.createdAt,
        wishlist: user.wishlist,
        watchHistory: user.watchHistory
      },
      subscription: {
        plan: subscription ? subscription.plan : 'FREE',
        status: subscription ? subscription.status : 'NONE',
        expiryDate: subscription ? subscription.expiryDate : null,
        autoRenew: subscription ? subscription.autoRenew : false
      },
      sessionCount
    });
  } catch (error) {
    logger.error('Get profile error: %O', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
