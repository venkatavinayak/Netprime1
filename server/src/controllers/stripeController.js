const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder');
const User = require('../models/User');
const Subscription = require('../models/Subscription');
const Payment = require('../models/Payment');
const logger = require('../utils/logger');
const { generateInvoicePDF } = require('../utils/pdf');
const { sendEmail } = require('../utils/email');

const planPrices = {
  TRIAL: 1,      // ₹1 (matched locked backend price)
  MONTHLY: 199,  // ₹199
  YEARLY: 1499   // ₹1499
};

// Shared helper to handle subscription activation db updates and PDF invoicing
async function activateSubscriptionHelper(userId, plan, transactionId, amountPaidOverride = null) {
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');

  // Check if payment was already processed
  const existingPayment = await Payment.findOne({ razorpayPaymentId: transactionId });
  if (existingPayment) {
    const existingSub = await Subscription.findOne({ userId: userId });
    return existingSub;
  }

  // Calculate expiry duration
  let durationDays = 30;
  if (plan === 'YEARLY') durationDays = 365;

  const startDate = new Date();
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + durationDays);

  // 1. Create or Update Subscription record
  let subscription = await Subscription.findOne({ userId: userId });
  if (!subscription) {
    subscription = new Subscription({
      userId: userId,
      plan: plan,
      startDate,
      expiryDate,
      status: 'ACTIVE',
      autoRenew: true
    });
  } else {
    subscription.plan = plan;
    subscription.startDate = startDate;
    subscription.expiryDate = expiryDate;
    subscription.status = 'ACTIVE';
  }
  await subscription.save();

  // 2. Link subscription to user
  user.subscription = subscription._id;
  user.isPremium = true;
  await user.save();

  // 3. Save payment details
  const amountPaid = amountPaidOverride !== null ? amountPaidOverride : planPrices[plan];
  const payment = new Payment({
    userId: userId,
    subscriptionId: subscription._id,
    plan: plan,
    amount: amountPaid,
    currency: 'INR',
    status: 'SUCCESS',
    method: 'Stripe',
    razorpayOrderId: `stripe_sid_${transactionId.substring(0, 16)}_${Date.now()}`,
    razorpayPaymentId: transactionId
  });
  await payment.save();

  logger.info('Subscription activated for user %s, plan %s (ID: %s)', user.email, plan, transactionId);

  // 4. Generate & Send Invoice
  try {
    const invoiceLink = `${process.env.CLIENT_URL || 'http://localhost:5000'}/api/payments/invoice/${payment._id}`;
    await sendEmail({
      to: user.email,
      subject: 'NetPrime Subscription Activated! 🍿',
      text: `Hi ${user.name},\nYour NetPrime Premium subscription (${payment.plan}) has been activated successfully! Billed Amount: ₹${payment.amount}. Expiry Date: ${subscription.expiryDate.toLocaleDateString()}.\nDownload your PDF receipt: ${invoiceLink}`,
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
              <td style="padding: 6px 0; font-family: monospace; text-align: right;">${transactionId || 'N/A'}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #777;">Validity Expiry:</td>
              <td style="padding: 6px 0; font-weight: bold; text-align: right; color: #ffaa00;">${subscription.expiryDate.toLocaleDateString()}</td>
            </tr>
          </table>
          <div style="text-align: center; margin: 30px 0 15px 0;">
            <a href="${invoiceLink}" style="display: inline-block; padding: 12px 24px; background-color: #ff007f; color: #fff; text-decoration: none; border-radius: 6px; font-weight: bold; box-shadow: 0 4px 10px rgba(255,0,127,0.2);">Download PDF Invoice</a>
          </div>
          <p style="font-size: 0.8rem; color: #888; text-align: center;">Need help? Contact support at +91 800-NET-PRIME</p>
        </div>
      `
    });
  } catch (pdfErr) {
    logger.error('Failed to generate or mail invoice PDF inside Stripe helper: %O', pdfErr);
  }

  return subscription;
}

// Create a Stripe Checkout Session
exports.createCheckoutSession = async (req, res, next) => {
  const { plan } = req.body;
  if (!planPrices[plan]) {
    return res.status(400).json({ error: 'Invalid plan selection' });
  }

  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const priceAmount = planPrices[plan];

    // Check if we are running in Developer Mock Mode
    if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.includes('placeholder')) {
      logger.info('Stripe key is missing or placeholder. Running in Developer Mock Mode.');
      const mockSessionId = `cs_mock_${Date.now()}`;
      return res.json({ 
        url: `${process.env.CLIENT_URL || 'http://localhost:5000'}/profile.html?payment=success&mock=true&session_id=${mockSessionId}&plan=${plan}`
      });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'inr',
            product_data: {
              name: `NetPrime ${plan} Subscription`,
              description: `Access to premium movie streaming catalog for ${plan} plan`,
            },
            unit_amount: priceAmount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.CLIENT_URL || 'http://localhost:5000'}/profile.html?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL || 'http://localhost:5000'}/checkout.html?payment=cancel`,
      customer_email: user.email,
      metadata: {
        userId: user._id.toString(),
        plan: plan
      }
    });

    res.json({ url: session.url });
  } catch (error) {
    logger.error('Error creating Stripe checkout session: %O', error);
    next(error);
  }
};

// Verify checkout session status on success redirect (Fallback if webhook delayed)
exports.verifySession = async (req, res, next) => {
  const { session_id } = req.body;
  if (!session_id) return res.status(400).json({ error: 'Session ID is required' });

  try {
    // If mock session, activate mock trial/monthly/yearly directly for development convenience
    if (session_id.startsWith('cs_mock_')) {
      const plan = req.body.plan || 'TRIAL';
      logger.info('Stripe: Verifying mock session %s. Activating plan %s.', session_id, plan);

      const result = await activateSubscriptionHelper(req.userId, plan, session_id);
      return res.json({ status: 'SUCCESS', subscription: result });
    }

    const session = await stripe.checkout.sessions.retrieve(session_id);
    if (!session || session.payment_status !== 'paid') {
      return res.status(400).json({ error: 'Payment not completed or session invalid' });
    }

    const userId = session.metadata.userId;
    const plan = session.metadata.plan;
    const stripePaymentId = session.payment_intent || session.id;

    // Verify requesting user matches metadata userId
    if (userId !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized session owner' });
    }

    const result = await activateSubscriptionHelper(userId, plan, stripePaymentId, session.amount_total / 100);
    res.json({ status: 'SUCCESS', subscription: result });

  } catch (error) {
    logger.error('Error verifying Stripe session: %O', error);
    next(error);
  }
};

// Stripe Webhook Event Listener
exports.handleStripeWebhook = async (req, res, next) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    if (!endpointSecret || endpointSecret.includes('placeholder') || !sig) {
      logger.info('Stripe Webhook Secret not found or signature missing. Bypassing signature verification (Mock Mode).');
      event = req.body;
    } else {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    }
  } catch (err) {
    logger.error('Stripe Webhook Signature verification failed: %s', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId = session.metadata.userId;
    const plan = session.metadata.plan;
    const stripePaymentId = session.payment_intent || session.id;

    logger.info('Stripe Webhook: checkout.session.completed received. Session: %s, User: %s, Plan: %s', session.id, userId, plan);

    try {
      await activateSubscriptionHelper(userId, plan, stripePaymentId, session.amount_total / 100);
    } catch (dbErr) {
      logger.error('Error updating DB inside Stripe Webhook: %O', dbErr);
      return res.status(500).send('Database error');
    }
  }

  res.json({ received: true });
};
