const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder');
const User = require('../models/User');
const Subscription = require('../models/Subscription');
const Payment = require('../models/Payment');
const logger = require('../utils/logger');
const { generateInvoicePDF } = require('../utils/pdf');
const { sendInvoiceEmail } = require('../utils/email');

const planPrices = {
  TRIAL: 100,      // in paise (₹1)
  MONTHLY: 19900,  // in paise (₹199)
  YEARLY: 149900   // in paise (₹1499)
};

// Shared helper to handle subscription activation db updates and PDF invoicing
async function activateSubscriptionHelper(userId, plan, transactionId, amountPaidOverride = null) {
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');

  // Check if payment was already processed
  const existingPayment = await Payment.findOne({ transactionId });
  if (existingPayment) {
    const existingSub = await Subscription.findOne({ user: userId });
    return existingSub;
  }

  // Calculate expiry duration
  let durationDays = 30;
  if (plan === 'YEARLY') durationDays = 365;

  const startDate = new Date();
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + durationDays);

  // 1. Create or Update Subscription record
  let subscription = await Subscription.findOne({ user: userId });
  if (!subscription) {
    subscription = new Subscription({
      user: userId,
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
  const amountPaid = amountPaidOverride !== null ? amountPaidOverride : (planPrices[plan] / 100);
  const payment = new Payment({
    user: userId,
    subscription: subscription._id,
    amount: amountPaid,
    currency: 'INR',
    status: 'SUCCESS',
    method: 'Stripe',
    transactionId: transactionId
  });
  await payment.save();

  logger.info('Subscription activated for user %s, plan %s (ID: %s)', user.email, plan, transactionId);

  // 4. Generate & Send Invoice
  try {
    const invoicePath = await generateInvoicePDF(payment, user, subscription);
    await sendInvoiceEmail(user.email, invoicePath, payment);
  } catch (pdfErr) {
    logger.error('Failed to generate or mail invoice PDF inside helper: %O', pdfErr);
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
