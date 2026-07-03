const mongoose = require('mongoose');

const WatchHistorySchema = new mongoose.Schema({
  movieId: { type: String, required: true },
  watchedAt: { type: Date, default: Date.now },
  duration: { type: Number, default: 0 }, // total duration in seconds
  resumePosition: { type: Number, default: 0 } // current position in seconds
});

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String }, // hashed, optional if isGoogleUser is true
  avatar: { type: String, default: 'avatar1.png' },
  isEmailVerified: { type: Boolean, default: false },
  emailVerificationToken: { type: String },
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },
  wishlist: [{ type: String }], // array of movie string IDs, e.g. ['salaar', 'hanuman']
  otpCodeHash: { type: String },
  otpExpires: { type: Date },
  otpSentAt: { type: Date },
  otpAttempts: { type: Number, default: 0 },
  otpRequestCount: { type: Number, default: 0 },
  otpRequestResetTime: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);
