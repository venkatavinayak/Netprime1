const mongoose = require('mongoose');

const SessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  refreshToken: { type: String, required: true, unique: true },
  deviceName: { type: String, default: 'Unknown Device' },
  browser: { type: String, default: 'Unknown Browser' },
  os: { type: String, default: 'Unknown OS' },
  ipAddress: { type: String },
  lastSeen: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Session', SessionSchema);
