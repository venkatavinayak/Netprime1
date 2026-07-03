const User = require('../models/User');
const Session = require('../models/Session');
const Subscription = require('../models/Subscription');
const logger = require('../utils/logger');

// 1. Get user wishlist
exports.getWishlist = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('wishlist');
    res.status(200).json(user ? user.wishlist : []);
  } catch (error) {
    logger.error('Get wishlist error: %O', error);
    res.status(500).json({ error: 'Failed to retrieve wishlist.' });
  }
};

// 2. Add movie to wishlist
exports.addToWishlist = async (req, res) => {
  const { movieId } = req.body;
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    if (!user.wishlist.includes(movieId)) {
      user.wishlist.push(movieId);
      await user.save();
    }
    res.status(200).json({ message: 'Movie added to wishlist.', wishlist: user.wishlist });
  } catch (error) {
    logger.error('Add to wishlist error: %O', error);
    res.status(500).json({ error: 'Failed to add to wishlist.' });
  }
};

// 3. Remove movie from wishlist
exports.removeFromWishlist = async (req, res) => {
  const { movieId } = req.params;
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    user.wishlist = user.wishlist.filter(id => id !== movieId);
    await user.save();
    res.status(200).json({ message: 'Movie removed from wishlist.', wishlist: user.wishlist });
  } catch (error) {
    logger.error('Remove from wishlist error: %O', error);
    res.status(500).json({ error: 'Failed to remove from wishlist.' });
  }
};

// 4. Get watch history
exports.getWatchHistory = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('watchHistory');
    res.status(200).json(user ? user.watchHistory : []);
  } catch (error) {
    logger.error('Get watch history error: %O', error);
    res.status(500).json({ error: 'Failed to retrieve watch history.' });
  }
};

// 5. Add or update watch history
exports.updateWatchHistory = async (req, res) => {
  const { movieId, duration, resumePosition } = req.body;
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const existingIndex = user.watchHistory.findIndex(h => h.movieId === movieId);
    if (existingIndex > -1) {
      // Update existing record
      user.watchHistory[existingIndex].watchedAt = new Date();
      user.watchHistory[existingIndex].duration = duration;
      user.watchHistory[existingIndex].resumePosition = resumePosition;
    } else {
      // Add new record
      user.watchHistory.push({
        movieId,
        duration,
        resumePosition,
        watchedAt: new Date()
      });
    }

    // Keep history trimmed to last 20 movies
    if (user.watchHistory.length > 20) {
      user.watchHistory.sort((a, b) => b.watchedAt - a.watchedAt);
      user.watchHistory = user.watchHistory.slice(0, 20);
    }

    await user.save();
    res.status(200).json(user.watchHistory);
  } catch (error) {
    logger.error('Update watch history error: %O', error);
    res.status(500).json({ error: 'Failed to update watch history.' });
  }
};

// 6. Get active login sessions (Device Management)
exports.getSessions = async (req, res) => {
  const currentToken = req.cookies.refreshToken;
  try {
    const sessions = await Session.find({ userId: req.user.id }).sort({ lastSeen: -1 });
    const formattedSessions = sessions.map(s => ({
      id: s._id,
      deviceName: s.deviceName,
      browser: s.browser,
      os: s.os,
      ipAddress: s.ipAddress,
      lastSeen: s.lastSeen,
      isCurrent: s.refreshToken === currentToken
    }));
    res.status(200).json(formattedSessions);
  } catch (error) {
    logger.error('Get sessions error: %O', error);
    res.status(500).json({ error: 'Failed to retrieve active devices.' });
  }
};

// 7. Revoke specific session (Log out from specific device)
exports.deleteSession = async (req, res) => {
  const { sessionId } = req.params;
  try {
    const session = await Session.findOne({ _id: sessionId, userId: req.user.id });
    if (!session) {
      return res.status(404).json({ error: 'Session not found or unauthorized.' });
    }

    await Session.deleteOne({ _id: sessionId });
    logger.info(`Session ${sessionId} manually revoked by User: ${req.user.email}`);
    res.status(200).json({ message: 'Device logged out successfully.' });
  } catch (error) {
    logger.error('Delete session error: %O', error);
    res.status(500).json({ error: 'Failed to log out device.' });
  }
};

// 8. Revoke all other sessions (Log out from all other devices)
exports.deleteAllOtherSessions = async (req, res) => {
  const currentToken = req.cookies.refreshToken;
  try {
    await Session.deleteMany({ userId: req.user.id, refreshToken: { $ne: currentToken } });
    logger.info(`All other sessions revoked by User: ${req.user.email}`);
    res.status(200).json({ message: 'Successfully logged out of all other devices.' });
  } catch (error) {
    logger.error('Delete all other sessions error: %O', error);
    res.status(500).json({ error: 'Failed to log out other devices.' });
  }
};

// 9. Stream Movie Trailer Link Authorization (Verify Subscription Status on Backend)
exports.authorizeStream = async (req, res) => {
  const { movieId, isFree } = req.query;

  try {
    // If the movie is marked as Free, allow stream instantly without subscription checks
    if (isFree === 'true') {
      return res.status(200).json({
        authorized: true,
        message: 'Free access granted.'
      });
    }

    // Load active subscription status
    const sub = await Subscription.findOne({ userId: req.user.id });
    if (sub && sub.status === 'ACTIVE' && sub.expiryDate > new Date()) {
      return res.status(200).json({
        authorized: true,
        message: 'Premium access granted.'
      });
    }

    // Demote sub in DB if expired
    if (sub && sub.status === 'ACTIVE' && sub.expiryDate <= new Date()) {
      sub.status = 'EXPIRED';
      sub.plan = 'FREE';
      await sub.save();
    }

    logger.warn(`Unauthorized streaming attempt for Premium Movie ID: ${movieId} by User: ${req.user.email}`);
    res.status(403).json({
      authorized: false,
      error: 'Upgrade to Premium. Active subscription required to watch this premium content.'
    });
  } catch (error) {
    logger.error('Authorize stream error: %O', error);
    res.status(500).json({ error: 'Failed to authorize movie stream.' });
  }
};

// 10. Update user profile name and avatar preset
exports.updateProfile = async (req, res) => {
  const { name, avatar } = req.body;
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    if (name) user.name = name;
    if (avatar) user.avatar = avatar;
    await user.save();

    logger.info(`Profile details updated for User: ${user.email}`);
    res.status(200).json({ 
      message: 'Profile updated successfully.', 
      user: { name: user.name, avatar: user.avatar } 
    });
  } catch (error) {
    logger.error('Update profile details error: %O', error);
    res.status(500).json({ error: 'Failed to update profile settings.' });
  }
};
