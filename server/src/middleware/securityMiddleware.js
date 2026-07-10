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

const isProd = process.env.NODE_ENV === 'production';

// General system rate limiter (max 100 requests per 15 minutes per IP)
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 150 : 999999,
  message: { error: 'Too many requests from this IP, please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false
});

// Authentication rate limiter (max 15 attempts per 15 minutes)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 15 : 999999,
  message: { error: 'Too many authentication attempts, please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false
});

const corsOptions = {
  origin: function (origin, callback) {
    const allowed = [
      process.env.CLIENT_URL,
      'https://venkat-portfolio-streaming.netlify.app',
      'http://localhost:5000',
      'http://localhost:3000',
      'http://127.0.0.1:5000',
      'http://127.0.0.1:3000'
    ].filter(Boolean);
    if (!origin || allowed.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'",
        "'unsafe-eval'",
        "https://cdn.jsdelivr.net",
        "https://clerk.com",
        "https://cdn.clerk.io",
        "https://*.clerk.accounts.dev",
        "https://*.clerk.com",
        "https://js.stripe.com",
        "https://checkout.razorpay.com"
      ],
      connectSrc: [
        "'self'",
        "https://*.clerk.accounts.dev",
        "https://*.clerk.com",
        "https://api.clerk.com",
        "https://api.stripe.com",
        "https://*.stripe.com",
        "https://api.razorpay.com",
        "https://*.razorpay.com"
      ],
      imgSrc: [
        "'self'",
        "data:",
        "https://images.clerk-cdn.com",
        "https://img.clerk.com",
        "https://*.stripe.com",
        "https://*.razorpay.com"
      ],
      frameSrc: [
        "'self'",
        "https://*.clerk.accounts.dev",
        "https://*.clerk.com",
        "https://js.stripe.com",
        "https://checkout.razorpay.com"
      ],
      workerSrc: ["'self'", "blob:"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      mediaSrc: ["'self'", "blob:", "data:", "http://localhost:5000", "https://*.netlify.app", "https://*.render.com"]
    }
  }
});

module.exports = {
  helmetConfig,
  corsConfig: cors(corsOptions),
  mongoSanitize,
  xssSanitize,
  generalLimiter,
  authLimiter
};
