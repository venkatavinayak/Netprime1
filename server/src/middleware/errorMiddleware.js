const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  // Log full stack error trace internally
  logger.error('Unhandled request failure: %s | Stack: %s', err.message, err.stack);

  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'An unexpected error occurred. Please contact support.' 
      : err.message
  });
};

module.exports = errorHandler;
