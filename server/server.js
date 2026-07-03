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
const adminRoutes = require('./src/routes/adminRoutes');

// Initialize DB & Scheduler
connectDB();
initSubscriptionScheduler();

const app = express();

// Security Middleware Headers & Limiter
app.use(helmetConfig);
app.use(corsConfig);
app.use(generalLimiter);

// Express Parser Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Sanitize inputs
app.use(mongoSanitize);
app.use(xssSanitize);

// Audit requests in logs through Morgan stream to Winston
app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));

// Public Firebase config payload endpoint (prevents client hardcoding)
app.get('/api/config/firebase', (req, res) => {
  res.json({
    apiKey: process.env.FIREBASE_API_KEY || 'placeholder',
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || 'placeholder',
    projectId: process.env.FIREBASE_PROJECT_ID || 'placeholder',
    appId: process.env.FIREBASE_APP_ID || 'placeholder'
  });
});

// Map backend API routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);

// Serve the static frontend assets from client/ folder
app.use(express.static(path.join(__dirname, '../client')));

// Catch-all route to serve index.html for undefined views
app.get(/.*/, (req, res, next) => {
  // If requesting an API, pass to error handler
  if (req.url.startsWith('/api/')) {
    return res.status(404).json({ error: 'Endpoint not found.' });
  }
  res.sendFile(path.join(__dirname, '../client', 'index.html'));
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
