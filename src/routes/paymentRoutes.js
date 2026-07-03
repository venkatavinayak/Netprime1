const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { verifyToken, checkEmailVerified } = require('../middleware/authMiddleware');

// Webhook listener (Public route, verified internally inside controller using signature)
router.post('/webhook', express.raw({ type: 'application/json' }), paymentController.handleWebhook);

// Protected routes
router.post('/create-order', verifyToken, checkEmailVerified, paymentController.createOrder);
router.post('/verify', verifyToken, paymentController.verifyPayment);
router.get('/history', verifyToken, paymentController.getBillingHistory);
router.get('/invoice/:paymentId', verifyToken, paymentController.downloadInvoice);

module.exports = router;
