const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/netprime';
  
  try {
    await mongoose.connect(uri);
    logger.info('Database connection established successfully with MongoDB.');
  } catch (error) {
    logger.error('Failed to establish database connection with MongoDB: %O', error);
    console.warn('\n⚠️  MongoDB is not running or incorrect URI. Set MONGODB_URI in your .env file to connect to a cloud database (e.g. MongoDB Atlas) or start a local MongoDB community server.\n');
  }
};

module.exports = connectDB;
