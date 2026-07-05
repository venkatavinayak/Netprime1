const crypto = require('crypto');
const razorpay = require('../config/razorpay');
const Payment = require('../models/Payment');
const Subscription = require('../models/Subscription');
const User = require('../models/User');
const { generateInvoicePDF } = require('../utils/pdf');
const { sendEmail } = require('../utils/email');
const logger = require('../utils/logger');

// Locked Backend Prices
const PLAN_PRICES = {
  TRIAL: 1,       // ₹1
  MONTHLY: 199,   // ₹199
  YEARLY: 1499    // ₹1499
};

// Plan duration helpers
const getPlanDurationMs = (plan) => {
  if (plan === 'TRIAL') return 30 * 24 * 60 * 60 * 1000; // 30 days
  if (plan === 'MONTHLY') return 30 * 24 * 60 * 60 * 1000; // 30 days
  if (plan === 'YEARLY') return 365 * 24 * 60 * 60 * 1000; // 365 days
  return 0;
};

// 1. Create Razorpay Order (Backend Price Locking)
exports.createOrder = async (req, res) => {
  const { plan } = req.body;
  
  if (!PLAN_PRICES.hasOwnProperty(plan)) {
    return res.status(400).json({ error: 'Invalid subscription plan selected.' });
  }

  const amount = PLAN_PRICES[plan]; // Lock price on backend

  try {
    let orderId = '';
    
    if (razorpay) {
      // Create Razorpay Order
      const rzpOrder = await razorpay.orders.create({
        amount: amount * 100, // Razorpay requires paise
        currency: 'INR',
        receipt: `receipt_sub_${req.user.id.toString().substring(0,8)}`
      });
      orderId = rzpOrder.id;
    } else {
      if (process.env.NODE_ENV === 'production') {
        logger.error('Razorpay configuration missing in production!');
        return res.status(500).json({ error: 'Payment gateway configuration missing in production.' });
      }
      // Mock mode fallback
      orderId = `order_mock_${crypto.randomBytes(8).toString('hex')}`;
      logger.info(`[MOCK MODE] Generated mock Razorpay order ID: ${orderId}`);
    }

    // Save PENDING Payment entry in DB
    const payment = new Payment({
      userId: req.user.id,
      plan,
      amount,
      razorpayOrderId: orderId,
      status: 'PENDING'
    });
    await payment.save();

    res.status(200).json({
      orderId,
      amount: amount * 100,
      currency: 'INR',
      keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_mockkeyid12345'
    });
  } catch (error) {
    logger.error('Failed to create payment order: %O', error);
    res.status(500).json({ error: 'Failed to create payment gateway order.' });
  }
};

// Helper function to activate user subscription
const activateUserSubscription = async (payment, razorpayPaymentId, razorpaySignature) => {
  payment.status = 'SUCCESS';
  payment.razorpayPaymentId = razorpayPaymentId;
  payment.razorpaySignature = razorpaySignature;
  await payment.save();

  // Load or create Subscription record
  let sub = await Subscription.findOne({ userId: payment.userId });
  const durationMs = getPlanDurationMs(payment.plan);
  
  if (!sub) {
    sub = new Subscription({ userId: payment.userId });
  }

  sub.plan = payment.plan;
  sub.status = 'ACTIVE';
  sub.startDate = new Date();
  sub.expiryDate = new Date(Date.now() + durationMs);
  sub.autoRenew = payment.plan !== 'TRIAL'; // Auto-renew monthly/yearly
  await sub.save();

  // Link sub ID to payment invoice
  payment.subscriptionId = sub._id;
  await payment.save();

  // Fetch User and email invoice
  const user = await User.findById(payment.userId);
  if (user) {
    const invoiceLink = `${process.env.CLIENT_URL || 'http://localhost:5000'}/api/payments/invoice/${payment._id}`;
    
    await sendEmail({
      to: user.email,
      subject: 'NetPrime Subscription Activated! 🍿',
      text: `Hi ${user.name},\nYour NetPrime Premium subscription (${payment.plan}) has been activated successfully! Billed Amount: ₹${payment.amount}. Expiry Date: ${sub.expiryDate.toLocaleDateString()}.\nDownload your PDF receipt: ${invoiceLink}`,
      html: `
        <div style="font-family: sans-serif; max-width: 550px; padding: 25px; border: 1px solid #ff007f; border-radius: 12px; line-height: 1.6;">
          <h2 style="color: #ff007f; margin-bottom: 5px;">Subscription Activated!</h2>
          <p style="color: #666; font-size: 0.9rem; margin-top: 0;">NetPrime Premium Receipt</p>
          <hr style="border: 0; border-top: 1px dashed #dddddd; margin: 20px 0;">
          <p>Hi <strong>${user.name}</strong>,</p>
          <p>Your subscription is active. Here is your transaction receipt details:</p>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 0.95rem;">
            <tr>
              <td style="padding: 6px 0; color: #777;">Plan Tier:</td>
              <td style="padding: 6px 0; font-weight: bold; text-align: right;">${payment.plan}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #777;">Paid Amount:</td>
              <td style="padding: 6px 0; font-weight: bold; text-align: right; color: #ff007f;">₹${payment.amount} INR</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #777;">Payment ID:</td>
              <td style="padding: 6px 0; font-family: monospace; text-align: right;">${razorpayPaymentId || 'N/A'}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #777;">Validity Expiry:</td>
              <td style="padding: 6px 0; font-weight: bold; text-align: right; color: #ffaa00;">${sub.expiryDate.toLocaleDateString()}</td>
            </tr>
          </table>
          <div style="text-align: center; margin: 30px 0 15px 0;">
            <a href="${invoiceLink}" style="display: inline-block; padding: 12px 24px; background-color: #ff007f; color: #fff; text-decoration: none; border-radius: 6px; font-weight: bold; box-shadow: 0 4px 10px rgba(255,0,127,0.2);">Download PDF Invoice</a>
          </div>
          <p style="font-size: 0.8rem; color: #888; text-align: center;">Need help? Contact support at +91 800-NET-PRIME</p>
        </div>
      `
    });
  }

  logger.info(`Subscription activated for User ID: ${payment.userId} | Plan: ${payment.plan}`);
  return sub;
};

// 2. Verify Payment (Card/UPI Signature Match)
exports.verifyPayment = async (req, res) => {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

  try {
    const hasMockCredential = [razorpayOrderId, razorpayPaymentId, razorpaySignature]
      .some(value => typeof value === 'string' && /(^|_)mock_/i.test(value));
    if (process.env.NODE_ENV === 'production' && hasMockCredential) {
      logger.warn('Mock Razorpay credentials rejected in production.');
      return res.status(403).json({ error: 'Mock payments are forbidden in production.' });
    }

    const payment = await Payment.findOne({ razorpayOrderId, userId: req.user.id });
    if (!payment) {
      return res.status(404).json({ error: 'Transaction order not found.' });
    }

    if (payment.status === 'SUCCESS') {
      return res.status(200).json({ message: 'Payment verified and active.' });
    }

    if (razorpay) {
      // Real Signature Verification
      const generatedSig = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest('hex');

      if (generatedSig === razorpaySignature) {
        await activateUserSubscription(payment, razorpayPaymentId, razorpaySignature);
        return res.status(200).json({ message: 'Signature matched successfully! Subscription active.' });
      } else {
        payment.status = 'FAILED';
        await payment.save();
        logger.error(`Razorpay signature verification failed for Order: ${razorpayOrderId}`);
        return res.status(400).json({ error: 'Signature verification failed. Potential tampering.' });
      }
    } else {
      if (process.env.NODE_ENV === 'production') {
        logger.warn('Mock Razorpay verification attempt rejected in production.');
        return res.status(403).json({ error: 'Mock payments are forbidden in production.' });
      }
      // Mock mode activation
      logger.info('[MOCK GATEWAY] Confirming mock verification bypass for order.');
      const mockSig = `sig_mock_${crypto.randomBytes(8).toString('hex')}`;
      const mockPayId = `pay_mock_${crypto.randomBytes(8).toString('hex')}`;
      
      await activateUserSubscription(payment, mockPayId, mockSig);
      return res.status(200).json({ message: '[MOCK SUCCESS] Subscription activated.' });
    }
  } catch (error) {
    logger.error('Signature verification route error: %O', error);
    res.status(500).json({ error: 'Failed to verify payment.' });
  }
};

// 3. Webhook listener (Ensures database update if browser is closed)
exports.handleWebhook = async (req, res) => {
  const rzpSignature = req.headers['x-razorpay-signature'];
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'mockwebhooksecret123456';

  try {
    // Verify Webhook Signature
    const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body));
    const expectedSig = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    if (expectedSig !== rzpSignature && process.env.NODE_ENV === 'production') {
      logger.warn('Received invalid Razorpay Webhook signature.');
      return res.status(400).json({ error: 'Invalid webhook signature.' });
    }

    const payload = Buffer.isBuffer(req.body) ? JSON.parse(req.body.toString('utf8')) : req.body;
    const event = payload.event;
    logger.info(`Received Razorpay webhook event: ${event}`);

    if (event === 'payment.captured' || event === 'order.paid') {
      const entity = payload.payload.payment ? payload.payload.payment.entity : payload.payload.order.entity;
      const orderId = entity.order_id;
      const paymentId = entity.id;

      const payment = await Payment.findOne({ razorpayOrderId: orderId });
      if (payment && payment.status === 'PENDING') {
        logger.info(`Webhooks activating pending payment for Order: ${orderId}`);
        await activateUserSubscription(payment, paymentId, rzpSignature || 'webhook_bypass');
      }
    }

    res.status(200).json({ status: 'ok' });
  } catch (error) {
    logger.error('Webhook processing failed: %O', error);
    res.status(500).json({ error: 'Webhook processing failed.' });
  }
};

// 4. Billing history retrieval
exports.getBillingHistory = async (req, res) => {
  try {
    const history = await Payment.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.status(200).json(history);
  } catch (error) {
    logger.error('Get billing history error: %O', error);
    res.status(500).json({ error: 'Failed to retrieve billing history.' });
  }
};

// 5. PDF Invoice Download
exports.downloadInvoice = async (req, res) => {
  const { paymentId } = req.params;
  try {
    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({ error: 'Invoice payment record not found.' });
    }

    // Secure checking: Users can only download their own invoices
    if (payment.userId.toString() !== req.user.id && req.user.email !== 'admin@netprime.com') {
      return res.status(403).json({ error: 'Unauthorized access.' });
    }

    const user = await User.findById(payment.userId);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=NetPrime_Invoice_${paymentId}.pdf`);

    // Stream PDF buffer directly to response stream
    generateInvoicePDF(payment, user, res);
  } catch (error) {
    logger.error('Download invoice failed: %O', error);
    res.status(500).json({ error: 'Failed to compile invoice PDF.' });
  }
};
