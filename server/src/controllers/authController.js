const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/User');
const Subscription = require('../models/Subscription');
const Session = require('../models/Session');
const { generateAccessToken, generateRefreshToken } = require('../middleware/authMiddleware');
const { verifyClerkSession } = require('../config/clerk');
const { sendEmail } = require('../utils/email');
const logger = require('../utils/logger');

const normalizeEmail = (email) => (email || '').trim().toLowerCase();
const getOtpRequestCount = (user) => Number.isFinite(user.otpRequestCount) ? user.otpRequestCount : 0;

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

// Register User (Generates signup verification OTP)
exports.register = async (req, res) => {
  const { name, password } = req.body;
  const email = normalizeEmail(req.body.email);
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered.' });
    }

    // Encrypt password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Generate 6-digit OTP code (cryptographically secure)
    const otp = crypto.randomInt(100000, 1000000).toString();
    const otpHash = await bcrypt.hash(otp, 10);
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 mins

    // Create User
    const user = new User({
      name,
      email,
      password: passwordHash,
      isEmailVerified: false,
      otpCodeHash: otpHash,
      otpExpires,
      otpSentAt: new Date(),
      otpAttempts: 0
    });

    await user.save();

    // Send OTP Verification Email asynchronously (no await) to avoid SMTP network delay
    sendEmail({
      to: user.email,
      subject: 'Verify Your NetPrime Account 🍿',
      text: `Your 6-digit verification code is: ${otp}. It will expire in 5 minutes.`,
      html: `
        <div style="font-family: sans-serif; max-width: 500px; padding: 25px; border: 1px solid #ff007f; border-radius: 12px;">
          <h2 style="color: #ff007f; margin-top: 0;">Welcome to NetPrime!</h2>
          <p>Hi ${user.name},</p>
          <p>Please enter this 6-digit verification code to complete your registration:</p>
          <div style="font-size: 2.2rem; font-weight: bold; letter-spacing: 6px; color: #ff007f; text-align: center; margin: 30px 0; padding: 15px; background: #fef0f6; border-radius: 8px; border: 1px dashed #ff007f;">
            ${otp}
          </div>
          <p style="font-size: 0.9rem; color: #666;">This code will expire in 5 minutes. If you did not sign up for NetPrime, please ignore this email.</p>
        </div>
      `
    }).catch(emailError => {
      logger.error('Failed to send verification email asynchronously during registration: %O', emailError);
    });

    logger.info('New user registered, verification OTP dispatched asynchronously: %s', user.email);
    res.status(201).json({
      message: 'Registration successful! Verification OTP sent to email.',
      email: user.email
    });
  } catch (error) {
    logger.error('Registration error: %O', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Resend Signup Verification OTP
exports.resendSignupOtp = async (req, res) => {
  const email = normalizeEmail(req.body.email);
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    if (user.isEmailVerified) {
      return res.status(400).json({ error: 'Email already verified.' });
    }

    // Cooldown check (60 seconds)
    const now = new Date();
    if (user.otpSentAt && (now - user.otpSentAt < 60 * 1000)) {
      const waitSecs = Math.ceil((60 * 1000 - (now - user.otpSentAt)) / 1000);
      return res.status(429).json({ error: `Please wait ${waitSecs} seconds before requesting another code.` });
    }

    // Rate limit check (max 3 requests per 10 minutes)
    if (user.otpRequestResetTime && now > user.otpRequestResetTime) {
      user.otpRequestCount = 0;
      user.otpRequestResetTime = undefined;
    }
    user.otpRequestCount = getOtpRequestCount(user);
    
    if (user.otpRequestCount >= 3) {
      return res.status(429).json({ error: 'Too many requests. Please try again after 10 minutes.' });
    }

    // Generate new OTP
    const otp = crypto.randomInt(100000, 1000000).toString();
    const otpHash = await bcrypt.hash(otp, 10);
    
    // Save state before email attempt to prevent fast spamming
    user.otpCodeHash = otpHash;
    user.otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 mins
    user.otpSentAt = now;
    user.otpAttempts = 0;
    user.otpRequestCount += 1;
    if (!user.otpRequestResetTime) {
      user.otpRequestResetTime = new Date(Date.now() + 10 * 60 * 1000);
    }
    
    await user.save();

    // Send OTP Verification Email asynchronously (no await) to avoid SMTP network delay
    sendEmail({
      to: user.email,
      subject: 'Verify Your NetPrime Account 🍿',
      text: `Your new verification code is: ${otp}. It will expire in 5 minutes.`,
      html: `
        <div style="font-family: sans-serif; max-width: 500px; padding: 25px; border: 1px solid #ff007f; border-radius: 12px;">
          <h2 style="color: #ff007f; margin-top: 0;">Welcome to NetPrime!</h2>
          <p>Here is your new 6-digit verification code:</p>
          <div style="font-size: 2.2rem; font-weight: bold; letter-spacing: 6px; color: #ff007f; text-align: center; margin: 30px 0; padding: 15px; background: #fef0f6; border-radius: 8px; border: 1px dashed #ff007f;">
            ${otp}
          </div>
          <p style="font-size: 0.9rem; color: #666;">This code will expire in 5 minutes. If you did not request this, please ignore this email.</p>
        </div>
      `
    }).catch(emailError => {
      logger.error('Failed to send verification email asynchronously during resend: %O', emailError);
    });

    res.status(200).json({ message: 'New verification OTP sent successfully.' });
  } catch (error) {
    logger.error('Resend OTP error: %O', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Verify Signup OTP (Completes registration and logs user in)
exports.verifyOtp = async (req, res) => {
  const { otp } = req.body;
  const email = normalizeEmail(req.body.email);
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    if (user.isEmailVerified) {
      return res.status(400).json({ error: 'Email already verified.' });
    }

    // Lockout check
    if (user.otpAttempts >= 5) {
      user.otpCodeHash = undefined;
      user.otpExpires = undefined;
      await user.save();
      return res.status(400).json({ error: 'Too many incorrect attempts. Please request a new OTP.' });
    }

    // Expiry check
    if (!user.otpExpires || new Date() > user.otpExpires || !user.otpCodeHash) {
      return res.status(400).json({ error: 'OTP has expired or is invalid. Please request a new OTP.' });
    }

    // Compare hashed OTP
    const isMatch = await bcrypt.compare(otp, user.otpCodeHash);
    if (!isMatch) {
      user.otpAttempts += 1;
      await user.save();
      const remaining = 5 - user.otpAttempts;
      return res.status(400).json({ error: `Incorrect verification code. ${remaining} attempts remaining.` });
    }

    // Success! Verify and activate user
    user.isEmailVerified = true;
    user.otpCodeHash = undefined;
    user.otpExpires = undefined;
    user.otpAttempts = 0;
    user.otpSentAt = undefined;
    user.otpRequestCount = 0;
    user.otpRequestResetTime = undefined;
    await user.save();

    // Initialize default FREE subscription
    const subscription = new Subscription({
      userId: user._id,
      plan: 'FREE',
      status: 'NONE',
      expiryDate: new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000) // Infinite free
    });
    await subscription.save();

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Save Session details (Device Management)
    const { os, browser, deviceName } = parseUserAgent(req.headers['user-agent']);
    const session = new Session({
      userId: user._id,
      refreshToken,
      deviceName,
      os,
      browser,
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

    logger.info('User successfully registered and verified via OTP: %s', user.email);

    res.status(200).json({
      message: 'Account verified and logged in successfully!',
      user: { name: user.name, email: user.email, avatar: user.avatar },
      token: accessToken,
      refreshToken: refreshToken
    });

  } catch (error) {
    logger.error('Verify OTP error: %O', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Send Login Sign-in OTP (Passwordless Login Request)
exports.sendLoginOtp = async (req, res) => {
  const email = normalizeEmail(req.body.email);
  try {
    const user = await User.findOne({ email });
    
    // Generic response to prevent user enumeration
    const genericSuccess = { message: 'If an account exists for this email, an OTP has been sent.' };

    if (!user) {
      logger.info('Send Login OTP request for non-existent email: %s (returned generic success)', email);
      return res.status(200).json(genericSuccess);
    }

    // Cooldown check (60 seconds)
    const now = new Date();
    if (user.otpSentAt && (now - user.otpSentAt < 60 * 1000)) {
      const waitSecs = Math.ceil((60 * 1000 - (now - user.otpSentAt)) / 1000);
      return res.status(429).json({ error: `Please wait ${waitSecs} seconds before requesting another code.` });
    }

    // Rate limit check (max 3 requests per 10 minutes)
    if (user.otpRequestResetTime && now > user.otpRequestResetTime) {
      user.otpRequestCount = 0;
      user.otpRequestResetTime = undefined;
    }
    user.otpRequestCount = getOtpRequestCount(user);
    
    if (user.otpRequestCount >= 3) {
      return res.status(429).json({ error: 'Too many requests. Please try again after 10 minutes.' });
    }

    // Increment request count
    user.otpRequestCount += 1;
    if (!user.otpRequestResetTime) {
      user.otpRequestResetTime = new Date(Date.now() + 10 * 60 * 1000);
    }

    // Generate login OTP
    const otp = crypto.randomInt(100000, 1000000).toString();
    const otpHash = await bcrypt.hash(otp, 10);
    
    user.otpCodeHash = otpHash;
    user.otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 mins
    user.otpSentAt = now;
    user.otpAttempts = 0;
    
    await user.save();

    // Login OTP should confirm SMTP dispatch so real users are not sent to
    // the verification screen when no email was accepted by the provider.
    await sendEmail({
      to: user.email,
      subject: 'Your NetPrime Sign-In Code',
      text: `Your 6-digit one-time sign-in code is: ${otp}. It will expire in 5 minutes.`,
      html: `
        <div style="font-family: sans-serif; max-width: 500px; padding: 25px; border: 1px solid #ff007f; border-radius: 12px;">
          <h2 style="color: #ff007f; margin-top: 0;">Sign In to NetPrime</h2>
          <p>Please enter the following 6-digit one-time passcode to sign in passwordless:</p>
          <div style="font-size: 2.2rem; font-weight: bold; letter-spacing: 6px; color: #ff007f; text-align: center; margin: 30px 0; padding: 15px; background: #fef0f6; border-radius: 8px; border: 1px dashed #ff007f;">
            ${otp}
          </div>
          <p style="font-size: 0.9rem; color: #666;">This code will expire in 5 minutes. If you did not request this sign-in, please secure your account.</p>
        </div>
      `
    });

    res.status(200).json(genericSuccess);
  } catch (error) {
    logger.error('Send Login OTP error: %O', error);
    res.status(503).json({ error: 'Unable to send login OTP email right now. Please try again shortly.' });
  }
};

// Verify Login OTP (Passwordless Login Completion)
exports.verifyLoginOtp = async (req, res) => {
  const { otp } = req.body;
  const email = normalizeEmail(req.body.email);
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid verification code or session expired.' });
    }

    // Lockout check
    if (user.otpAttempts >= 5) {
      user.otpCodeHash = undefined;
      user.otpExpires = undefined;
      await user.save();
      return res.status(400).json({ error: 'Too many incorrect attempts. Please request a new OTP.' });
    }

    // Expiry check
    if (!user.otpExpires || new Date() > user.otpExpires || !user.otpCodeHash) {
      return res.status(400).json({ error: 'OTP has expired or is invalid. Please request a new OTP.' });
    }

    // Compare hashed OTP
    const isMatch = await bcrypt.compare(otp, user.otpCodeHash);
    if (!isMatch) {
      user.otpAttempts += 1;
      await user.save();
      const remaining = 5 - user.otpAttempts;
      return res.status(400).json({ error: `Incorrect verification code. ${remaining} attempts remaining.` });
    }

    // Success! Clear OTP fields and log in user
    user.otpCodeHash = undefined;
    user.otpExpires = undefined;
    user.otpAttempts = 0;
    user.otpSentAt = undefined;
    user.otpRequestCount = 0;
    user.otpRequestResetTime = undefined;
    if (!user.isEmailVerified) {
      user.isEmailVerified = true;
    }
    await user.save();

    // Check if subscription exists, create FREE fallback if not
    let subscription = await Subscription.findOne({ userId: user._id });
    if (!subscription) {
      subscription = new Subscription({
        userId: user._id,
        plan: 'FREE',
        status: 'NONE',
        expiryDate: new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000)
      });
      await subscription.save();
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
      os,
      browser,
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

    logger.info('User successfully logged in via OTP: %s', user.email);

    res.status(200).json({
      message: 'Login successful!',
      user: { name: user.name, email: user.email, avatar: user.avatar },
      token: accessToken,
      refreshToken: refreshToken
    });

  } catch (error) {
    logger.error('Verify Login OTP error: %O', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Login User
exports.login = async (req, res) => {
  const { password, rememberMe } = req.body;
  const email = normalizeEmail(req.body.email);
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

// Clerk Auth Callback
exports.clerkLogin = async (req, res) => {
  const { sessionToken } = req.body;
  try {
    if (!sessionToken) {
      return res.status(400).json({ error: 'Missing Clerk session token.' });
    }

    const profile = await verifyClerkSession(sessionToken);
    
    let user = await User.findOne({ email: profile.email });
    
    if (!user) {
      // Create user automatically
      user = new User({
        name: profile.name,
        email: profile.email,
        avatar: profile.avatar,
        isEmailVerified: true // Clerk has already authenticated the account
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
      logger.info('Registered new Clerk account: %s', user.email);
    }

    // Refresh profile details if Clerk changed
    if (profile.name && user.name !== profile.name) {
      user.name = profile.name;
    }
    if (profile.avatar && user.avatar !== profile.avatar && profile.avatar.startsWith('http')) {
      user.avatar = profile.avatar;
    }
    if (!user.isEmailVerified) {
      user.isEmailVerified = true;
    }
    if (user.isModified()) {
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

    logger.info('Clerk login successful: %s on %s', user.email, deviceName);
    res.status(200).json({ 
      message: 'Clerk authentication successful!',
      user: { name: user.name, email: user.email, avatar: user.avatar },
      token: accessToken,
      refreshToken: refreshToken
    });
  } catch (error) {
    logger.error('Clerk Auth error: %O', error);
    res.status(401).json({ error: 'Clerk authentication failed.' });
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
