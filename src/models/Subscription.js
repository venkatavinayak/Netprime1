const mongoose = require('mongoose');

const SubscriptionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  plan: { 
    type: String, 
    enum: ['FREE', 'TRIAL', 'MONTHLY', 'YEARLY'], 
    default: 'FREE' 
  },
  startDate: { type: Date, default: Date.now },
  expiryDate: { type: Date },
  status: { 
    type: String, 
    enum: ['ACTIVE', 'EXPIRED', 'CANCELLED', 'NONE'], 
    default: 'NONE' 
  },
  autoRenew: { type: Boolean, default: false },
  razorpaySubscriptionId: { type: String }
});

module.exports = mongoose.model('Subscription', SubscriptionSchema);
