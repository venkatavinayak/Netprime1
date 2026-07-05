/* server.js */

require('dotenv').config();
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');

const connectDB = require('./src/config/db');
const { initSubscriptionScheduler } = require('./src/utils/scheduler');
const logger = require('./src/utils/logger');
const { 
  helmetConfig, 
  corsConfig, 
  mongoSanitize, 
  xssSanitize, 
  generalLimiter 
} = require('./src/middleware/securityMiddleware');
const errorHandler = require('./src/middleware/errorMiddleware');

// Import routes
const authRoutes = require('./src/routes/authRoutes');
const userRoutes = require('./src/routes/userRoutes');
const paymentRoutes = require('./src/routes/paymentRoutes');
const paymentController = require('./src/controllers/paymentController');
const stripeController = require('./src/controllers/stripeController');
const adminRoutes = require('./src/routes/adminRoutes');

// Initialize DB & Scheduler
connectDB();
initSubscriptionScheduler();

const app = express();
app.set('trust proxy', 1); // Trust Render proxy load balancers for rate-limiting

// Security Middleware Headers & Limiter
app.use(helmetConfig);
app.use(corsConfig);
app.use(generalLimiter);

// Payment providers sign the exact request bytes. These endpoints must be
// registered before express.json(), otherwise signature verification is invalid.
app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), paymentController.handleWebhook);
app.post('/api/payments/stripe/webhook', express.raw({ type: 'application/json' }), stripeController.handleStripeWebhook);

// Express Parser Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Sanitize inputs
app.use(mongoSanitize);
app.use(xssSanitize);

// Audit requests in logs through Morgan stream to Winston
app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));

// Public Clerk config payload endpoint (prevents client hardcoding)
app.get('/api/config/clerk', (req, res) => {
  res.json({
    publishableKey: process.env.CLERK_PUBLISHABLE_KEY || ''
  });
});

// Map backend API routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);

// Serve the static frontend assets from client/ folder (if it exists)
const fs = require('fs');
const clientPath = path.join(__dirname, '../client');

if (fs.existsSync(clientPath)) {
  app.use(express.static(clientPath));
}

// Root API Health Check
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    message: 'NetPrime API Server is running.',
    timestamp: new Date()
  });
});

// Catch-all route to serve index.html for undefined views
app.get(/.*/, (req, res, next) => {
  // If requesting an API, pass to error handler
  if (req.url.startsWith('/api/')) {
    return res.status(404).json({ error: 'Endpoint not found.' });
  }
  
  const indexFile = path.join(clientPath, 'index.html');
  if (fs.existsSync(indexFile)) {
    res.sendFile(indexFile);
  } else {
    res.json({
      status: 'online',
      message: 'NetPrime API is running. Client static assets are hosted on Netlify.'
    });
  }
});

// Global Error Handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  logger.info(`NetPrime full-stack streaming server running on port ${PORT}`);
  console.log(`\n======================================================`);
  console.log(`🍿 NETPRIME streaming server running on http://localhost:${PORT}`);
  console.log(`======================================================\n`);
});
