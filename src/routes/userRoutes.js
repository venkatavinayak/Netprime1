const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyToken } = require('../middleware/authMiddleware');

// Wishlist
router.get('/wishlist', verifyToken, userController.getWishlist);
router.post('/wishlist', verifyToken, userController.addToWishlist);
router.delete('/wishlist/:movieId', verifyToken, userController.removeFromWishlist);

// Watch History
router.get('/history', verifyToken, userController.getWatchHistory);
router.post('/history', verifyToken, userController.updateWatchHistory);

// Session (Device) Management
router.get('/sessions', verifyToken, userController.getSessions);
router.delete('/sessions/:sessionId', verifyToken, userController.deleteSession);
router.post('/sessions/clear-others', verifyToken, userController.deleteAllOtherSessions);

// Movie Authorization Check
router.get('/stream', verifyToken, userController.authorizeStream);

// Update Profile
router.put('/profile', verifyToken, userController.updateProfile);

module.exports = router;
