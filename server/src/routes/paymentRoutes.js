const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const stripeController = require('../controllers/stripeController');
const { verifyToken, checkEmailVerified } = require('../middleware/authMiddleware');

// Webhook listeners (Public routes, verified internally inside controllers using signature)
router.post('/webhook', express.raw({ type: 'application/json' }), paymentController.handleWebhook);
router.post('/stripe/webhook', express.raw({ type: 'application/json' }), stripeController.handleStripeWebhook);

// Stripe checkout routes
router.post('/stripe/create-checkout-session', verifyToken, checkEmailVerified, stripeController.createCheckoutSession);
router.post('/stripe/verify-session', verifyToken, stripeController.verifySession);

// Protected routes
router.post('/create-order', verifyToken, checkEmailVerified, paymentController.createOrder);
router.post('/verify', verifyToken, paymentController.verifyPayment);
router.get('/history', verifyToken, paymentController.getBillingHistory);
router.get('/invoice/:paymentId', verifyToken, paymentController.downloadInvoice);

module.exports = router;
