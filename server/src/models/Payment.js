const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription' },
  plan: { type: String, required: true },
  amount: { type: Number, required: true }, // in standard format, e.g. 199.00
  currency: { type: String, default: 'INR' },
  razorpayOrderId: { type: String, required: true, unique: true },
  // Used for both Razorpay payment IDs and Stripe payment-intent/session IDs.
  // A sparse unique index makes webhook delivery idempotent.
  razorpayPaymentId: { type: String, unique: true, sparse: true },
  razorpaySignature: { type: String },
  status: { 
    type: String, 
    enum: ['PENDING', 'SUCCESS', 'FAILED'], 
    default: 'PENDING' 
  },
  method: { type: String, default: 'UNKNOWN' }, // CARD, UPI, NETBANKING, etc.
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Payment', PaymentSchema);
