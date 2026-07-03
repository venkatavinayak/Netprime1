const Razorpay = require('razorpay');
const logger = require('../utils/logger');

let razorpayInstance = null;

const keyId = process.env.RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;

if (keyId && keyId !== 'your_razorpay_key_id' && keySecret && keySecret !== 'your_razorpay_key_secret') {
  try {
    razorpayInstance = new Razorpay({
      key_id: keyId,
      key_secret: keySecret
    });
    logger.info('Razorpay instance initialized successfully.');
  } catch (error) {
    logger.error('Failed to initialize Razorpay SDK: %O', error);
  }
} else {
  logger.warn('Razorpay keys not configured or using placeholders. Payments will operate in mock-gateway verification mode.');
}

module.exports = razorpayInstance;
