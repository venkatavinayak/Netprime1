const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');

// MongoDB query injection sanitizer middleware
const mongoSanitize = (req, res, next) => {
  const sanitize = (obj) => {
    if (obj && typeof obj === 'object') {
      for (const key in obj) {
        if (key.startsWith('$')) {
          delete obj[key];
        } else if (typeof obj[key] === 'object') {
          sanitize(obj[key]);
        }
      }
    }
  };
  sanitize(req.body);
  sanitize(req.query);
  sanitize(req.params);
  next();
};

// Simple HTML/XSS tag sanitizer middleware
const xssSanitize = (req, res, next) => {
  const clean = (val) => {
    if (typeof val === 'string') {
      return val.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
    if (val && typeof val === 'object') {
      for (const key in val) {
        val[key] = clean(val[key]);
      }
    }
    return val;
  };
  req.body = clean(req.body);
  req.query = clean(req.query);
  next();
};

// General system rate limiter (max 100 requests per 15 minutes per IP)
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 150,
  message: { error: 'Too many requests from this IP, please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false
});

// Authentication rate limiter (max 15 attempts per 15 minutes)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: { error: 'Too many authentication attempts, please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false
});

const corsOptions = {
  origin: process.env.CLIENT_URL || 'http://localhost:5000',
  credentials: true,
  optionsSuccessStatus: 200
};

module.exports = {
  helmetConfig: helmet(),
  corsConfig: cors(corsOptions),
  mongoSanitize,
  xssSanitize,
  generalLimiter,
  authLimiter
};
