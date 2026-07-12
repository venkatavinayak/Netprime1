const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder');
const User = require('../models/User');
const Subscription = require('../models/Subscription');
const Payment = require('../models/Payment');
const logger = require('../utils/logger');
const { generateInvoicePDFBuffer } = require('../utils/pdf');
const { sendEmail } = require('../utils/email');

const planPrices = {
  TRIAL: 1,      // ₹1 (matched locked backend price)
  MONTHLY: 199,  // ₹199
  YEARLY: 1499   // ₹1499
};

const ALLOWED_ORIGINS = [
  'http://localhost:5000',
  'http://127.0.0.1:5000',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'https://venkat-portfolio-streaming.netlify.app'
];

// Shared helper to handle subscription activation db updates and PDF invoicing
async function activateSubscriptionHelper(userId, plan, transactionId, amountPaidOverride = null) {
  if (!Object.prototype.hasOwnProperty.call(planPrices, plan)) {
    throw new Error('Invalid Stripe plan metadata');
  }

  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');

  // Reserve the provider transaction ID before changing subscription state.
  const existingPayment = await Payment.findOne({ razorpayPaymentId: transactionId });
  if (existingPayment && existingPayment.status === 'SUCCESS') {
    const existingSub = await Subscription.findOne({ userId: userId });
    return existingSub;
  }

  const amountPaid = amountPaidOverride !== null ? amountPaidOverride : planPrices[plan];
  let payment = existingPayment;
  if (!payment) {
    try {
      payment = await Payment.create({
        userId,
        plan,
        amount: amountPaid,
        currency: 'INR',
        status: 'PENDING',
        method: 'Stripe',
        razorpayOrderId: `stripe_${transactionId}`,
        razorpayPaymentId: transactionId
      });
    } catch (error) {
      if (error.code !== 11000) throw error;
      payment = await Payment.findOne({ razorpayPaymentId: transactionId });
      if (payment && payment.status === 'SUCCESS') {
        return Subscription.findOne({ userId });
      }
    }
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

  // 3. Mark the reserved payment successful only after activation completes.
  payment.subscriptionId = subscription._id;
  payment.status = 'SUCCESS';
  await payment.save();

  logger.info('Subscription activated for user %s, plan %s (ID: %s)', user.email, plan, transactionId);

  // 4. Generate & Send Invoice
  try {
    const invoiceLink = `${process.env.CLIENT_URL || 'http://localhost:5000'}/api/payments/invoice/${payment._id}`;
    const invoicePdf = await generateInvoicePDFBuffer(payment, user);
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
      `,
      attachments: [{
        filename: `NetPrime_Invoice_${payment._id}.pdf`,
        content: invoicePdf,
        contentType: 'application/pdf'
      }]
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
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const priceAmount = planPrices[plan];

    // Dynamically resolve client base URL from whitelist to prevent open redirect vulnerabilities
    let clientUrl = process.env.CLIENT_URL || 'http://localhost:5000';
    let reqOrigin = null;
    if (req.headers.referer) {
      try {
        const parsedUrl = new URL(req.headers.referer);
        reqOrigin = parsedUrl.origin;
      } catch (e) {
        logger.warn('Failed to parse referer: %O', e);
      }
    } else if (req.headers.origin) {
      reqOrigin = req.headers.origin;
    }

    if (reqOrigin && ALLOWED_ORIGINS.includes(reqOrigin)) {
      clientUrl = reqOrigin;
    }
    clientUrl = clientUrl.replace(/\/$/, '');

    // Check if we are running in Developer Mock Mode
    if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.includes('placeholder')) {
      if (process.env.NODE_ENV === 'production') {
        logger.error('Stripe key is missing or placeholder in production!');
        return res.status(500).json({ error: 'Stripe payment gateway configuration missing in production.' });
      }
      logger.info('Stripe key is missing or placeholder. Running in Developer Mock Mode.');
      const mockSessionId = `cs_mock_${Date.now()}`;
      // Simulate the asynchronous provider callback outside production. The
      // verification endpoint remains read-only, just as it is for real Stripe.
      setImmediate(() => {
        activateSubscriptionHelper(user._id, plan, mockSessionId, priceAmount)
          .catch(error => logger.error('Developer Stripe mock callback failed: %O', error));
      });
      return res.json({ 
        url: `${clientUrl}/profile.html?payment=success&mock=true&session_id=${mockSessionId}&plan=${plan}`
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
            unit_amount: priceAmount * 100, // Stripe requires unit amount in paise (cents) for INR
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${clientUrl}/profile.html?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${clientUrl}/checkout.html?payment=cancel`,
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

// Verify checkout session status on success redirect (Webhook is source of truth)
exports.verifySession = async (req, res, next) => {
  const { session_id } = req.body;
  if (!session_id) return res.status(400).json({ error: 'Session ID is required' });

  try {
    // Development mocks are allowed, but verification remains read-only.
    if (session_id.startsWith('cs_mock_')) {
      if (process.env.NODE_ENV === 'production') {
        logger.warn('Mock Stripe session verification rejected in production.');
        return res.status(403).json({ error: 'Mock payments are forbidden in production.' });
      }
      const mockPayment = await Payment.findOne({
        razorpayPaymentId: session_id,
        userId: req.user.id,
        status: 'SUCCESS'
      });
      if (!mockPayment) {
        return res.status(202).json({ status: 'PROCESSING', message: 'Mock payment callback is processing.' });
      }
      const mockSubscription = await Subscription.findOne({ userId: req.user.id });
      return res.json({ status: 'SUCCESS', subscription: mockSubscription });
    }

    const session = await stripe.checkout.sessions.retrieve(session_id);
    if (!session || session.payment_status !== 'paid') {
      return res.status(400).json({ error: 'Payment not completed or session invalid' });
    }

    const userId = session.metadata.userId;
    const plan = session.metadata.plan;
    const stripePaymentId = session.payment_intent || session.id;

    // Verify requesting user matches metadata userId
    if (userId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized session owner' });
    }

    // Look up the database Payment document to confirm the webhook processed it
    let payment = null;
    for (let i = 0; i < 4; i++) {
      payment = await Payment.findOne({
        razorpayPaymentId: stripePaymentId,
        userId: req.user.id,
        status: 'SUCCESS'
      });
      if (payment) break;
      if (i < 3) await new Promise(resolve => setTimeout(resolve, 1000));
    }

    if (!payment) {
      logger.info(`Stripe: verifySession webhook processing pending or payment not captured for session ${session_id}`);
      return res.status(202).json({ status: 'PROCESSING', message: 'Payment is being processed by Stripe. Please wait...' });
    }

    const subscription = await Subscription.findOne({ userId: req.user.id });
    res.json({ status: 'SUCCESS', subscription });

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
    const signatureUnavailable = !endpointSecret || endpointSecret.includes('placeholder') || !sig;
    if (signatureUnavailable && process.env.NODE_ENV === 'production') {
      logger.warn('Unsigned or unconfigured Stripe webhook rejected in production.');
      return res.status(403).json({ error: 'Valid Stripe webhook signature required.' });
    }

    if (signatureUnavailable) {
      logger.info('Stripe webhook signature verification bypassed outside production.');
      event = JSON.parse(req.body.toString('utf8'));
    } else {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    }
  } catch (err) {
    logger.error('Stripe Webhook Signature verification failed: %s', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId = session.metadata && session.metadata.userId;
    const plan = session.metadata && session.metadata.plan;
    const stripePaymentId = session.payment_intent || session.id;

    if (!userId || !Object.prototype.hasOwnProperty.call(planPrices, plan)) {
      logger.warn('Stripe webhook session has missing or invalid metadata: %s', session.id);
      return res.status(400).json({ error: 'Invalid checkout metadata.' });
    }

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
