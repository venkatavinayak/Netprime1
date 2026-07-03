const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');

// Protected admin endpoints
router.get('/stats', verifyToken, isAdmin, adminController.getDashboardStats);
router.get('/users', verifyToken, isAdmin, adminController.getUsers);
router.post('/cancel-subscription', verifyToken, isAdmin, adminController.cancelSubscription);
router.delete('/users/:userId', verifyToken, isAdmin, adminController.deleteUser);

module.exports = router;
